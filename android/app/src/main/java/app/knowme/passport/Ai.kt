package app.knowme.passport

import com.google.firebase.Firebase
import com.google.firebase.ai.InferenceMode
import com.google.firebase.ai.OnDeviceConfig
import com.google.firebase.ai.ai
import com.google.firebase.ai.type.GenerativeBackend
import com.google.firebase.ai.type.PublicPreviewAPI
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

    private fun model(mode: InferenceMode) =
        Firebase.ai(backend = GenerativeBackend.googleAI())
            .generativeModel(modelName = CLOUD_MODEL, onDeviceConfig = OnDeviceConfig(mode = mode))

    private val lenient = Json { ignoreUnknownKeys = true; isLenient = true }

    @Serializable
    private data class RawAnswer(val found: String = "none", val answer: String = "", val usedIds: List<String> = emptyList())

    @Serializable
    private data class RawEntry(val section: String = "", val signal: String = "", val meaning: String = "", val whatToDo: String = "", val quote: String = "")

    @Serializable
    private data class RawEntries(val entries: List<RawEntry> = emptyList())

    data class Answer(val text: String, val used: List<Entry>, val source: String)

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
        val response = model(if (cloud) InferenceMode.ONLY_IN_CLOUD else InferenceMode.ONLY_ON_DEVICE).generateContent(prompt)
        return (response.text ?: "") to sourceOf(response.inferenceSource, if (cloud) "in_cloud" else "on_device")
    }

    /**
     * Answers using ONLY the matched entries. Returns null when no AI route is available
     * or the AI found nothing; the caller then shows the entries on their own.
     */
    suspend fun answer(rules: Rules, passport: Passport, question: String, matches: List<Entry>, cloudAllowed: Boolean): Answer? {
        if (matches.isEmpty()) return null
        val onDevice = runCatching { ask(rules, passport, question, matches, cloud = false) }
        onDevice.getOrNull()?.let { return it }
        if (!cloudAllowed) return null
        return runCatching { ask(rules, passport, question, matches, cloud = true) }.getOrNull()
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
     */
    suspend fun organize(rules: Rules, passport: Passport, notes: String, cloudAllowed: Boolean): Pair<List<Entry>, String>? {
        val chunks = notes.split(Regex("\\n\\s*\\n")).map { it.trim() }.filter { it.isNotBlank() }
            .fold(mutableListOf<String>()) { acc, p -> if (acc.isNotEmpty() && acc.last().length + p.length < 500) acc[acc.lastIndex] = acc.last() + "\n\n" + p else acc.add(p); acc }
        val seen = passport.entries.map { Text.normalize(it.signal) }.toMutableSet()
        val out = mutableListOf<Entry>()
        var source: String? = null
        for (chunk in chunks) {
            val attempt = runCatching { organizeChunk(rules, passport, chunk, cloud = false) }.getOrNull()
                ?: if (cloudAllowed) runCatching { organizeChunk(rules, passport, chunk, cloud = true) }.getOrNull() else null
            if (attempt == null) {
                if (source == null) return null
                continue
            }
            source = attempt.second
            for (e in attempt.first) {
                val key = Text.normalize(e.signal)
                if (key in seen) continue
                seen += key
                out += e
            }
        }
        return out to (source ?: "on_device")
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
