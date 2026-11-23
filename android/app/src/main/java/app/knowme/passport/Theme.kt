package app.knowme.passport

import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.HelpOutline
import androidx.compose.material.icons.outlined.Bolt
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.DirectionsBus
import androidx.compose.material.icons.outlined.Face
import androidx.compose.material.icons.outlined.FavoriteBorder
import androidx.compose.material.icons.outlined.Healing
import androidx.compose.material.icons.outlined.Hearing
import androidx.compose.material.icons.outlined.LocalFlorist
import androidx.compose.material.icons.outlined.MedicalServices
import androidx.compose.material.icons.outlined.MusicNote
import androidx.compose.material.icons.outlined.Pets
import androidx.compose.material.icons.outlined.ReportProblem
import androidx.compose.material.icons.outlined.Restaurant
import androidx.compose.material.icons.outlined.RocketLaunch
import androidx.compose.material.icons.outlined.Schedule
import androidx.compose.material.icons.outlined.SentimentSatisfied
import androidx.compose.material.icons.outlined.Spa
import androidx.compose.material.icons.outlined.Star
import androidx.compose.material.icons.outlined.Thermostat
import androidx.compose.material.icons.outlined.Train
import androidx.compose.material.icons.outlined.VerifiedUser
import androidx.compose.material.icons.outlined.WaterDrop
import androidx.compose.material.icons.outlined.Wc
import androidx.compose.material.icons.outlined.WbSunny
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector

/** Same palette as the web app: warm cream, calm teal, coral accent, one tint per section. */
object KColors {
    val bg = Color(0xFFFBF7F2)
    val surface = Color.White
    val surface2 = Color(0xFFF5EFE7)
    val text = Color(0xFF1D2A2C)
    val muted = Color(0xFF5B686B)
    val border = Color(0xFFE8E0D5)
    val brand = Color(0xFF0B7A6E)
    val brandStrong = Color(0xFF075D54)
    val brandSoft = Color(0xFFDFF3EE)
    val accent = Color(0xFFF26B4E)
    val accentSoft = Color(0xFFFFECE6)
    val danger = Color(0xFFD32F3C)
    val dangerSoft = Color(0xFFFDEAEC)

    val heroGradient = Brush.linearGradient(listOf(Color(0xFF0B7A6E), Color(0xFF0F9A8A), Color(0xFF2BB3A0)))
}

data class Tone(val bg: Color, val fg: Color)

val TONES = mapOf(
    "communication" to Tone(Color(0xFFE5EFFF), Color(0xFF2F6FD6)),
    "calming" to Tone(Color(0xFFE2F5E8), Color(0xFF2B8F52)),
    "upsets" to Tone(Color(0xFFFFF0DC), Color(0xFFC76D0A)),
    "likes" to Tone(Color(0xFFFFF6CF), Color(0xFFB58900)),
    "pain" to Tone(Color(0xFFFFE6EC), Color(0xFFCF3C66)),
    "medical" to Tone(Color(0xFFFDE7E7), Color(0xFFCC3434)),
    "routine" to Tone(Color(0xFFEEE8FF), Color(0xFF6A50D4)),
    "safety" to Tone(Color(0xFFDCF3F1), Color(0xFF0B8A80)),
)

fun tone(id: String): Tone = TONES[id] ?: Tone(KColors.brandSoft, KColors.brand)

/** Icon names from shared/knowme.json, mapped to Material icons (the web uses Lucide). */
fun iconFor(name: String): ImageVector = when (name) {
    "message-circle" -> Icons.AutoMirrored.Outlined.Chat
    "leaf" -> Icons.Outlined.Spa
    "zap" -> Icons.Outlined.Bolt
    "heart" -> Icons.Outlined.FavoriteBorder
    "bandage" -> Icons.Outlined.Healing
    "stethoscope" -> Icons.Outlined.MedicalServices
    "clock" -> Icons.Outlined.Schedule
    "shield-check" -> Icons.Outlined.VerifiedUser
    "cloud-rain" -> Icons.Outlined.WaterDrop
    "thermometer" -> Icons.Outlined.Thermostat
    "message-circle-question" -> Icons.AutoMirrored.Outlined.HelpOutline
    "ear" -> Icons.Outlined.Hearing
    "utensils" -> Icons.Outlined.Restaurant
    "toilet" -> Icons.Outlined.Wc
    "smile" -> Icons.Outlined.SentimentSatisfied
    "siren" -> Icons.Outlined.ReportProblem
    "cloud" -> Icons.Outlined.Cloud
    // Avatars
    "rabbit", "cat", "dog", "bird", "fish", "turtle", "squirrel" -> Icons.Outlined.Pets
    "bus" -> Icons.Outlined.DirectionsBus
    "train" -> Icons.Outlined.Train
    "rocket" -> Icons.Outlined.RocketLaunch
    "sun", "rainbow" -> Icons.Outlined.WbSunny
    "star" -> Icons.Outlined.Star
    "flower" -> Icons.Outlined.LocalFlorist
    "music" -> Icons.Outlined.MusicNote
    else -> Icons.Outlined.Face
}

val AVATAR_ICONS = listOf("smile", "rabbit", "bus", "train", "rocket", "sun", "star", "flower", "music")
val AVATAR_COLOURS = mapOf(
    "teal" to listOf(Color(0xFF0B7A6E), Color(0xFF35C9B5)),
    "coral" to listOf(Color(0xFFE2553A), Color(0xFFFF9F80)),
    "sky" to listOf(Color(0xFF2F6FD6), Color(0xFF79B0FF)),
    "violet" to listOf(Color(0xFF6A50D4), Color(0xFFB29DFF)),
    "gold" to listOf(Color(0xFFD69200), Color(0xFFFFD166)),
    "rose" to listOf(Color(0xFFCF3C66), Color(0xFFFF9AB6)),
)

@Composable
fun KnowMeTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = lightColorScheme(
            primary = KColors.brand,
            onPrimary = Color.White,
            secondary = KColors.accent,
            background = KColors.bg,
            surface = KColors.surface,
            onSurface = KColors.text,
            onBackground = KColors.text,
            error = KColors.danger,
        ),
        content = content,
    )
}
