package app.knowme.passport

import com.google.firebase.Firebase
import com.google.firebase.ai.InferenceMode
import com.google.firebase.ai.OnDeviceConfig
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.PublicPreviewAPI
import com.google.firebase.ai.type.ThinkingLevel
import com.google.firebase.ai.type.generationConfig
import com.google.firebase.ai.type.thinkingConfig
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.async
import kotlinx.coroutines.awaitAll
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.sync.Semaphore
import kotlinx.coroutines.sync.withPermit
import kotlinx.coroutines.withTimeout
import kotlinx.coroutines.withTimeoutOrNull
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json

/**
 * Hybrid inference through Firebase AI Logic (SRS section 6), same routing as the web app:
 *   1. Gemini Nano on this phone (ONLY_ON_DEVICE) when the phone supports it.
 *   2. Otherwise, only if the owner turned on cloud help and the phone is online:
 *      cloud Gemini (ONLY_IN_CLOUD) with names and numbers removed and no Medical entries.
 *   3. Otherwise the caller shows offline search results, no AI.
 */
@OptIn(PublicPreviewAPI::class)
object KnowMeAi {
    private const val CLOUD_MODEL = "gemini-3.5-flash-lite"

    // Short, fact-bound jobs: minimal thinking keeps cloud answers to a couple of seconds.
    private val cloudConfig = generationConfig {
        temperature = 0.2f
        responseMimeType = "application/json"
        thinkingConfig = thinkingConfig { thinkingLevel = ThinkingLevel.MINIMAL }
    }

    private fun model(mode: InferenceMode) =
        Firebase.ai(backend = GenerativeBackend.googleAI()).generativeModel(
            modelName = CLOUD_MODEL,
            generationConfig = if (mode == InferenceMode.ONLY_IN_CLOUD) cloudConfig else null,
            onDeviceConfig = OnDeviceConfig(mode = mode),
        )

    /** Null until tried. After one failure, this session goes straight to the cloud (or to the passport). */
    @Volatile private var deviceWorks: Boolean? = null

    private val lenient = Json { ignoreUnknownKeys = true; isLenient = true }

    @Serializable
    private data class RawAnswer(val found: String = "none", val answer: String = "", val usedIds: List<String> = emptyList())

    @Serializable
    private data class RawEntry(val section: String = "", val signal: String = "", val meaning: String = "", val whatToDo: String = "", val quote: String = "")

    @Serializable
    private data class RawEntries(val entries: List<RawEntry> = emptyList())

    data class Answer(val text: String, val used: List<Entry>, val source: String)

    /** What happened when a carer asked, so the screen can say it plainly. */
    sealed interface Outcome {
        data class Answered(val answer: Answer) : Outcome
        /** The AI ran but none of the entries fit. */
        data object NothingFound : Outcome
        /** No on-device AI and cloud help is off or offline: passport entries only. */
        data object NoAi : Outcome
        /** The AI was tried and failed (timeout, no connection, or this copy isn't allowed to use the cloud). */
        data object Failed : Outcome
    }

    /** "on_device" or "in_cloud", from the SDK's inferenceSource. */
    private fun sourceOf(value: Any?, fallback: String): String {
        val s = value?.toString()?.lowercase() ?: return fallback
        return if ("device" in s) "on_device" else if ("cloud" in s) "in_cloud" else fallback
    }

    private fun jsonPart(text: String): String {
        val start = text.indexOf('{')
        val end = text.lastIndexOf('}')
        return if (start >= 0 && end > start) text.substring(start, end + 1) else text
    }

    private suspend fun run(prompt: String, cloud: Boolean): Pair<String, String> {
        // Never leave a carer waiting: past the limit the screen keeps the passport entries (NF-13).
        val response = withTimeout(if (cloud) 30_000L else 120_000L) {
            model(if (cloud) InferenceMode.ONLY_IN_CLOUD else InferenceMode.ONLY_ON_DEVICE).generateContent(prompt)
        }
        return (response.text ?: "") to sourceOf(response.inferenceSource, if (cloud) "in_cloud" else "on_device")
    }

    /** Tries Gemini Nano on this phone, remembering a failure for the rest of the session. */
    private suspend fun <T> onDevice(block: suspend () -> T): Result<T> {
        if (deviceWorks == false) return Result.failure(IllegalStateException("No on-device AI"))
        val result = runCatching { block() }
        deviceWorks = result.isSuccess
        return result
    }

    /** How long Gemini Nano gets before the cloud takes over (only when cloud help is allowed). Same as the web app. */
    private const val CLOUD_BACKUP_AFTER_MS = 8_000L

    /** Cloud parts of a long note are read side by side; each takes about 4 seconds. */
    private const val CLOUD_PARALLEL = 4

    /** Gemini Nano calls that were too slow are left to finish here instead of holding up the screen. */
    private val deviceScope = CoroutineScope(SupervisorJob() + Dispatchers.Default)

    /**
     * Smart hybrid: runs [block] on Gemini Nano. Without cloud help it simply waits. With cloud help
     * it waits at most [budgetMs]; null means "still running", so the caller asks the cloud instead.
     */
    private suspend fun <T> deviceFirst(cloudAllowed: Boolean, budgetMs: Long = CLOUD_BACKUP_AFTER_MS, block: suspend () -> T): Result<T>? {
        if (deviceWorks == false) return Result.failure(IllegalStateException("No on-device AI"))
        if (!cloudAllowed) return onDevice(block)
        if (budgetMs <= 0) return null
        val job = deviceScope.async { onDevice(block) }
        return withTimeoutOrNull(budgetMs) { job.await() }
    }

    /** Answers using ONLY the matched entries. The caller always shows the entries too. */
    suspend fun answer(rules: Rules, passport: Passport, question: String, matches: List<Entry>, cloudAllowed: Boolean): Outcome {
        if (matches.isEmpty()) return Outcome.NothingFound
        val device = deviceFirst(cloudAllowed) { ask(rules, passport, question, matches, cloud = false) }
        if (device != null && device.isSuccess) return device.getOrNull()?.let { Outcome.Answered(it) } ?: Outcome.NothingFound
        if (!cloudAllowed) return Outcome.NoAi
        val cloud = runCatching { ask(rules, passport, question, matches, cloud = true) }
        if (cloud.isFailure) return Outcome.Failed
        return cloud.getOrNull()?.let { Outcome.Answered(it) } ?: Outcome.NothingFound
    }

    private suspend fun ask(rules: Rules, passport: Passport, question: String, matches: List<Entry>, cloud: Boolean): Answer? {
        // The Medical section never goes to the cloud on the free tier (PR-03).
        val usable = matches.filter { !cloud || it.section != "medical" }
        if (usable.isEmpty()) return null
        val redactor = if (cloud) Redactor(passport) else null
        fun clean(s: String) = redactor?.redact(s) ?: s
        val ids = usable.indices.map { "e${it + 1}" }
        val facts = usable.mapIndexed { i, e ->
            buildString {
                append("[${ids[i]}] (${rules.section(e.section).title}) ${e.signal}")
                if (e.meaning.isNotBlank()) append(" | means: ${e.meaning}")
                if (e.whatToDo.isNotBlank()) append(" | what helps: ${e.whatToDo}")
            }.let(::clean)
        }.joinToString("\n")
        val parent = passport.primaryContact?.name ?: "the parent"
        val prompt = (rules.prompts["answer"] ?: "").fill(
            mapOf(
                "name" to if (cloud) "[CHILD]" else passport.child.firstName,
                "parent" to clean(parent),
                "question" to clean(question.take(300)),
                "facts" to facts,
            ),
        ) + "\n\nReply with JSON only: {\"found\": \"found\"|\"partial\"|\"none\", \"answer\": string, \"usedIds\": [string]}"
        val (text, source) = run(prompt, cloud)
        val raw = lenient.decodeFromString<RawAnswer>(jsonPart(text))
        val used = raw.usedIds.mapNotNull { id -> ids.indexOf(id.trim('[', ']', ' ')).takeIf { it >= 0 }?.let { usable[it] } }
        var answer = raw.answer.replace(Regex("\\s*\\[e\\d+]", RegexOption.IGNORE_CASE), "").trim()
        if (redactor != null) answer = redactor.restore(answer)
        if (raw.found == "none" || used.isEmpty() || answer.isBlank()) return null
        return Answer(answer, used, source)
    }

    /**
     * Turns shared or pasted text into proposed entries (FR-05). A proposal whose quote is
     * not in the owner's words is dropped. Every proposal still needs the owner's approval.
     * Smart hybrid, as on the web: Gemini Nano reads first. If it fails, or is still reading
     * 8 seconds after the start, and cloud help is allowed, the parts it has not finished go to
     * the cloud (names removed) and are read side by side.
     */
    suspend fun organize(rules: Rules, passport: Passport, notes: String, cloudAllowed: Boolean): Pair<List<Entry>, String>? {
        val chunks = notes.split(Regex("\\n\\s*\\n")).map { it.trim() }.filter { it.isNotBlank() }
            .fold(mutableListOf<String>()) { acc, p -> if (acc.isNotEmpty() && acc.last().length + p.length < 500) acc[acc.lastIndex] = acc.last() + "\n\n" + p else acc.add(p); acc }
        val seen = passport.entries.map { Text.normalize(it.signal) }.toMutableSet()
        val out = mutableListOf<Entry>()
        var source: String? = null
        fun keep(part: Pair<List<Entry>, String>) {
            source = part.second
            for (e in part.first) {
                val key = Text.normalize(e.signal)
                if (key in seen) continue
                seen += key
                out += e
            }
        }

        // One budget for the whole job, so several parts that are each a little slow still hand over.
        val deadline = System.currentTimeMillis() + CLOUD_BACKUP_AFTER_MS
        var next = 0
        while (next < chunks.size) {
            val chunk = chunks[next]
            val attempt = deviceFirst(cloudAllowed, deadline - System.currentTimeMillis()) { organizeChunk(rules, passport, chunk, cloud = false) }
            if (attempt == null || (attempt.isFailure && cloudAllowed)) break // slow or failed: the cloud reads the rest
            attempt.getOrNull()?.let(::keep) // without cloud help a failed part is skipped
            next++
        }

        if (next < chunks.size && cloudAllowed) {
            val gate = Semaphore(CLOUD_PARALLEL)
            val parts = coroutineScope {
                chunks.drop(next).map { chunk ->
                    async { gate.withPermit { runCatching { organizeChunk(rules, passport, chunk, cloud = true) }.getOrNull() } }
                }.awaitAll()
            }
            parts.filterNotNull().forEach(::keep)
        }
        return source?.let { out to it }
    }

    private suspend fun organizeChunk(rules: Rules, passport: Passport, chunk: String, cloud: Boolean): Pair<List<Entry>, String> {
        val redactor = if (cloud) Redactor(passport) else null
        val text = redactor?.redact(chunk) ?: chunk
        val prompt = (rules.prompts["organize"] ?: "").fill(
            mapOf("name" to if (cloud) "[CHILD]" else passport.child.firstName, "notes" to text),
        ) + "\n\nReply with JSON only: {\"entries\": [{\"section\": string, \"signal\": string, \"meaning\": string, \"whatToDo\": string, \"quote\": string}]}"
        val (reply, source) = run(prompt, cloud)
        val raw = lenient.decodeFromString<RawEntries>(jsonPart(reply))
        fun restore(s: String) = (redactor?.restore(s) ?: s).trim()
        val valid = raw.entries.filter { r ->
            rules.sections.any { it.id == r.section } && r.signal.isNotBlank() && quoteIsInNotes(r.quote, text)
        }.map { r ->
            Entry(id = newId("e"), section = r.section, signal = restore(r.signal), meaning = restore(r.meaning), whatToDo = restore(r.whatToDo), source = "ai-approved", quote = restore(r.quote))
        }
        return valid to source
    }
}
