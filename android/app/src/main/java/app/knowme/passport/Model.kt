package app.knowme.passport

import android.content.Context
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.Json
import java.io.File
import java.time.Instant
import java.util.UUID

/** The passport, same JSON shape as the web app (SRS section 10), so backups move between them. */
@Serializable
data class Child(
    val firstName: String,
    val age: Int? = null,
    val aboutMe: String? = null,
    /** "icon:colour", e.g. "bus:coral". */
    val avatar: String? = null,
    /** Small JPEG data URL from the web app; kept on the device only. */
    val photo: String? = null,
)

@Serializable
data class Entry(
    val id: String,
    val section: String,
    val signal: String,
    val meaning: String = "",
    val whatToDo: String = "",
    val source: String = "owner",
    val quote: String? = null,
    val updatedAt: String = now(),
)

@Serializable
data class Contact(
    val id: String,
    val name: String,
    val relation: String = "parent",
    val phone: String = "",
    val primary: Boolean = false,
)

@Serializable
data class Settings(
    /** Off by default (FR-26): de-identified entries may go to cloud Gemini only when on. */
    val cloudHelp: Boolean = false,
    val emergencyNumber: String = "112",
    val country: String = "PK",
)

@Serializable
data class EmergencyCard(val text: String = "")

@Serializable
data class Passport(
    val id: String,
    val schemaVersion: Int = 1,
    val version: Int = 0,
    val updatedAt: String = now(),
    val child: Child,
    val entries: List<Entry> = emptyList(),
    val contacts: List<Contact> = emptyList(),
    val emergencyCard: EmergencyCard = EmergencyCard(),
    val settings: Settings = Settings(),
) {
    val primaryContact: Contact? get() = contacts.firstOrNull { it.primary } ?: contacts.firstOrNull()
}

fun now(): String = Instant.now().toString()
fun newId(prefix: String): String = prefix + UUID.randomUUID().toString().replace("-", "").take(12)

val appJson = Json {
    ignoreUnknownKeys = true
    encodeDefaults = true
    prettyPrint = true
}

/** The device copy is the source of truth (OF-02). Nothing here touches the network. */
class Store(private val context: Context) {
    private val file get() = File(context.filesDir, "passport.json")

    fun load(): Passport? = runCatching { appJson.decodeFromString<Passport>(file.readText()) }.getOrNull()

    /** Saves a new version before the screen shows it (NF-12). */
    fun save(passport: Passport): Passport {
        val next = passport.copy(version = passport.version + 1, updatedAt = now())
        val tmp = File(context.filesDir, "passport.tmp")
        tmp.writeText(appJson.encodeToString(Passport.serializer(), next))
        if (!tmp.renameTo(file)) {
            file.writeText(tmp.readText())
            tmp.delete()
        }
        return next
    }

    fun delete() {
        file.delete()
    }

    fun export(passport: Passport): String = appJson.encodeToString(Passport.serializer(), passport)

    fun import(text: String): Passport {
        val p = appJson.decodeFromString<Passport>(text)
        require(p.schemaVersion == 1 && p.child.firstName.isNotBlank()) { "That file isn't a KnowMe passport backup." }
        return p
    }
}

// ---------- Shared rules (shared/knowme.json, copied into assets at build time) ----------

@Serializable
data class Example(val signal: String, val meaning: String = "", val whatToDo: String = "")

@Serializable
data class SectionInfo(
    val id: String,
    val title: String,
    val short: String = "",
    val icon: String,
    val question: String,
    val signalLabel: String,
    val meaningLabel: String = "",
    val whatToDoLabel: String,
    val examples: List<Example> = emptyList(),
)

@Serializable
data class Situation(
    val id: String,
    val icon: String,
    val label: String,
    val query: String = "",
    val sections: List<String>,
    val tone: String,
    val emergency: Boolean = false,
)

@Serializable
data class Rules(
    val sections: List<SectionInfo>,
    val situations: List<Situation>,
    val emergencyPhrases: List<String>,
    val synonyms: List<List<String>>,
    val prompts: Map<String, String>,
) {
    fun section(id: String): SectionInfo = sections.firstOrNull { it.id == id } ?: sections.first()

    companion object {
        fun load(context: Context): Rules =
            appJson.decodeFromString(context.assets.open("knowme.json").bufferedReader().use { it.readText() })
    }
}

fun String.withName(name: String): String = replace("{name}", name)

fun String.fill(values: Map<String, String>): String =
    Regex("\\{(\\w+)\\}").replace(this) { m -> values[m.groupValues[1]] ?: m.value }

fun createPassport(firstName: String, age: Int?, avatar: String, contactName: String, phone: String, emergencyNumber: String) =
    Passport(
        id = newId("p"),
        child = Child(firstName = firstName.trim(), age = age, avatar = avatar),
        contacts = listOf(Contact(id = newId("c"), name = contactName.trim().ifBlank { "Parent" }, phone = phone.trim(), primary = true)),
        settings = Settings(emergencyNumber = emergencyNumber.trim().ifBlank { "112" }),
    )
