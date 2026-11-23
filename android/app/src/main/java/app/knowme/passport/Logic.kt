package app.knowme.passport

/**
 * Search, emergency detection, at-a-glance picks, card drafting and redaction.
 * Plain code, no AI: instant, offline and the same as the web app (SRS section 6).
 */
object Text {
    private val stopwords = (
        "a an the and or but if then so to of in on at by for with from is are was were be been being it its this that " +
            "these those he she they him her them his hers their i me my we our you your what why how when where who which " +
            "do does did doing has have had not no yes very just can will would should could keeps keep get gets got going goes"
        ).split(" ").toSet()

    fun normalize(text: String): String =
        text.lowercase()
            .replace('‘', '\'').replace('’', '\'')
            .replace(Regex("[^a-z0-9' ]+"), " ")
            .replace(Regex("\\s+"), " ")
            .trim()

    private fun undouble(w: String): String =
        if (w.length >= 2 && w[w.length - 1] == w[w.length - 2] && w.last() !in "aeiouy") w.dropLast(1) else w

    fun stem(w: String): String = when {
        w.length > 5 && w.endsWith("ing") -> undouble(w.dropLast(3))
        w.length > 4 && w.endsWith("ed") -> undouble(w.dropLast(2))
        w.length > 3 && w.endsWith("s") && !w.endsWith("ss") -> w.dropLast(1)
        else -> w
    }

    fun tokens(text: String): List<String> =
        normalize(text).split(' ').filter { it.length > 1 && it !in stopwords }.map(::stem)
}

class Matcher(private val rules: Rules) {
    private val synonyms: Map<String, Set<String>> = buildMap<String, MutableSet<String>> {
        for (group in rules.synonyms) {
            val stems = group.flatMap { Text.tokens(it) }
            for (s in stems) getOrPut(s) { mutableSetOf() }.addAll(stems)
        }
    }

    /** True when the words describe an emergency (FR-12). Checked before any AI. */
    fun isEmergency(question: String): Boolean {
        val text = " ${Text.normalize(question)} "
        return rules.emergencyPhrases.any {
            val p = Text.normalize(it)
            text.contains(" $p ") || text.contains(" $p")
        }
    }

    fun findMatches(question: String, entries: List<Entry>, limit: Int = 5): List<Entry> {
        val asked = Text.tokens(question)
        if (asked.isEmpty()) return emptyList()
        val direct = asked.toSet()
        val wanted = asked.flatMap { (synonyms[it] ?: emptySet()) + it }.toSet()
        val q = Text.normalize(question)
        return entries.map { e ->
            var score = 0.0
            val fields = listOf(e.signal to 3.0, e.meaning to 2.0, e.whatToDo to 1.0, rules.section(e.section).title to 1.0)
            for ((text, weight) in fields) {
                for (w in Text.tokens(text).toSet()) {
                    if (w in direct) score += weight * 1.5 else if (w in wanted) score += weight
                }
            }
            if (e.signal.isNotBlank() && q.length > 3 && Text.normalize(e.signal).contains(q)) score += 6.0
            e to score
        }.filter { it.second > 0 }.sortedByDescending { it.second }.take(limit).map { it.first }
    }

    /** Entries for a tapped situation: keyword matches first, then the rest of its sections. */
    fun situationEntries(p: Passport, s: Situation, limit: Int = 6): List<Entry> {
        val inSections = p.entries.filter { it.section in s.sections }
        val ranked = if (s.query.isNotBlank()) findMatches(s.query, inSections, inSections.size) else emptyList()
        val rest = inSections.filter { it !in ranked }.sortedBy { s.sections.indexOf(it.section) }
        return (ranked + rest).take(limit)
    }
}

/** The handful of things every carer should know first. */
fun atAGlance(p: Passport): List<Entry> {
    fun pick(section: String, n: Int) = p.entries.filter { it.section == section }.take(n)
    return pick("medical", 2) + pick("safety", 1) + pick("communication", 2) + pick("calming", 1) + pick("upsets", 1)
}

data class Completeness(val filled: Int, val total: Int, val next: String?)

fun completeness(p: Passport, rules: Rules): Completeness {
    val filled = p.entries.map { it.section }.toSet()
    return Completeness(filled.size, rules.sections.size, rules.sections.firstOrNull { it.id !in filled }?.id)
}

const val CARD_MAX = 300

/** Drafts the emergency card from the passport (FR-20): no surname, address or diagnosis. */
fun draftCard(p: Passport): String {
    fun sentence(s: String) = s.trim().replace(Regex("\\s+"), " ").let { if (it.endsWith(".")) it else "$it." }
    val contact = p.primaryContact
    val calming = p.entries.firstOrNull { it.section == "calming" }
    val allergy = p.entries.firstOrNull { it.section == "medical" && Regex("allerg", RegexOption.IGNORE_CASE).containsMatchIn(it.signal + " " + it.whatToDo) }
    val safety = p.entries.firstOrNull { it.section == "safety" }
    val required = listOf(
        "KnowMe card: ${p.child.firstName}${p.child.age?.let { ", $it" } ?: ""}.",
        "I may not speak or answer you. Please stay with me, speak softly and do not grab me.",
    )
    val optional = listOfNotNull(
        calming?.let { "What calms me: ${sentence(it.signal)}" },
        allergy?.let { "Medical: ${sentence(it.signal)}" },
        safety?.let { "Safety: ${sentence(it.whatToDo.ifBlank { it.signal })}" },
    )
    val call = if (contact != null && contact.phone.isNotBlank()) "Please call ${contact.name}: ${contact.phone}" else ""
    val lines = (required + optional).toMutableList()
    while (lines.size > required.size && (lines + call).joinToString("\n").length > CARD_MAX) lines.removeAt(lines.lastIndex)
    return (lines + call).filter { it.isNotBlank() }.joinToString("\n").take(CARD_MAX)
}

/** Removes names and phone numbers before anything goes to the cloud (PR-03). */
class Redactor(p: Passport) {
    private val child = p.child.firstName.trim()
    private val carers = p.contacts.map { it.name.trim() }.filter { it.length > 1 }
    private val phone = Regex("\\+?\\d[\\d\\s().-]{6,}\\d")

    fun redact(text: String): String {
        var out = phone.replace(text, "[PHONE]")
        if (child.isNotBlank()) out = Regex("\\b${Regex.escape(child)}\\b", RegexOption.IGNORE_CASE).replace(out, "[CHILD]")
        carers.forEachIndexed { i, name -> out = Regex("\\b${Regex.escape(name)}\\b", RegexOption.IGNORE_CASE).replace(out, "[CARER${i + 1}]") }
        return out
    }

    fun restore(text: String): String {
        var out = text.replace("[CHILD]", child.ifBlank { "the child" })
        carers.forEachIndexed { i, name -> out = out.replace("[CARER${i + 1}]", name) }
        return out
    }
}

/** True when a quote the AI gave really comes from the owner's notes (organise guardrail). */
fun quoteIsInNotes(quote: String, notes: String): Boolean {
    val q = Text.normalize(quote)
    if (q.length < 6) return false
    val n = Text.normalize(notes)
    if (n.contains(q)) return true
    val qWords = q.split(' ')
    var i = 0
    for (w in n.split(' ')) {
        if (i < qWords.size && w == qWords[i]) i++
        if (i == qWords.size) break
    }
    return i.toDouble() / qWords.size >= 0.8
}
