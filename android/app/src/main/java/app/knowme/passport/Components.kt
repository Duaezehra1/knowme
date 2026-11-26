package app.knowme.passport

import android.content.Intent
import android.graphics.BitmapFactory
import android.net.Uri
import android.util.Base64
import androidx.compose.animation.core.animateFloatAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.gestures.detectHorizontalDragGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowLeft
import androidx.compose.material.icons.automirrored.outlined.KeyboardArrowRight
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.outlined.Autorenew
import androidx.compose.material.icons.outlined.Cloud
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.Phone
import androidx.compose.material.icons.outlined.ReportProblem
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableFloatStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.graphicsLayer
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

@Composable
fun Avatar(passport: Passport, size: Int = 72) {
    val child = passport.child
    val photo = remember(child.photo) {
        child.photo?.substringAfter("base64,", "")?.takeIf { it.isNotBlank() }?.let { b64 ->
            runCatching { Base64.decode(b64, Base64.DEFAULT).let { BitmapFactory.decodeByteArray(it, 0, it.size)?.asImageBitmap() } }.getOrNull()
        }
    }
    val parts = (child.avatar ?: "").split(":")
    val icon = parts.getOrNull(0)?.takeIf { it.isNotBlank() }
    val colours = AVATAR_COLOURS[parts.getOrNull(1)] ?: AVATAR_COLOURS.values.toList()[(child.firstName.firstOrNull()?.code ?: 0) % AVATAR_COLOURS.size]
    Box(
        Modifier.size(size.dp).clip(CircleShape).background(Brush.linearGradient(colours)),
        contentAlignment = Alignment.Center,
    ) {
        when {
            photo != null -> Image(photo, contentDescription = null, contentScale = ContentScale.Crop, modifier = Modifier.size(size.dp))
            icon != null -> Icon(iconFor(icon), contentDescription = null, tint = Color.White, modifier = Modifier.size((size * 0.5).dp))
            else -> Text(child.firstName.take(1).uppercase(), color = Color.White, fontWeight = FontWeight.Bold, fontSize = (size * 0.4).sp)
        }
    }
}

@Composable
fun IconBadge(icon: String, toneId: String, size: Int = 44) {
    val t = tone(toneId)
    Box(Modifier.size(size.dp).clip(RoundedCornerShape(14.dp)).background(t.bg), contentAlignment = Alignment.Center) {
        Icon(iconFor(icon), contentDescription = null, tint = t.fg, modifier = Modifier.size((size * 0.5).dp))
    }
}

@Composable
fun KCard(modifier: Modifier = Modifier, color: Color = KColors.surface, content: @Composable () -> Unit) {
    Surface(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(24.dp),
        color = color,
        border = if (color == KColors.surface) BorderStroke(1.dp, KColors.border) else null,
    ) {
        Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { content() }
    }
}

@Composable
fun EntryCard(rules: Rules, entry: Entry, showSection: Boolean = true, actions: (@Composable () -> Unit)? = null) {
    val t = tone(entry.section)
    val info = rules.section(entry.section)
    Surface(Modifier.fillMaxWidth(), shape = RoundedCornerShape(20.dp), color = t.bg) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            if (showSection) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(iconFor(info.icon), null, tint = t.fg, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text(info.title, color = t.fg, fontWeight = FontWeight.Bold, fontSize = 13.sp)
                }
            }
            Text(entry.signal, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp, color = KColors.text)
            if (entry.meaning.isNotBlank()) Labeled("MEANS", entry.meaning, t.fg)
            if (entry.whatToDo.isNotBlank()) Labeled("WHAT HELPS", entry.whatToDo, t.fg)
            actions?.invoke()
        }
    }
}

@Composable
private fun Labeled(label: String, text: String, colour: Color) {
    Row {
        Text(label, color = colour, fontWeight = FontWeight.ExtraBold, fontSize = 11.sp, modifier = Modifier.width(92.dp).padding(top = 3.dp))
        Text(text, color = KColors.text, fontSize = 15.sp)
    }
}

fun dial(context: android.content.Context, number: String) {
    val clean = number.filter { it.isDigit() || it == '+' }
    context.startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:$clean")))
}

@Composable
fun CallButtons(passport: Passport, onAlert: Boolean = false) {
    val context = LocalContext.current
    val contact = passport.primaryContact
    Row(horizontalArrangement = Arrangement.spacedBy(10.dp), modifier = Modifier.fillMaxWidth()) {
        if (contact != null && contact.phone.isNotBlank()) {
            Button(
                onClick = { dial(context, contact.phone) },
                modifier = Modifier.weight(1f).heightIn(min = 56.dp),
                shape = RoundedCornerShape(16.dp),
                colors = ButtonDefaults.buttonColors(containerColor = if (onAlert) Color.White else KColors.brand, contentColor = if (onAlert) KColors.danger else Color.White),
            ) {
                Icon(Icons.Outlined.Phone, null)
                Spacer(Modifier.width(8.dp))
                Text("Call ${contact.name}", fontWeight = FontWeight.Bold)
            }
        }
        Button(
            onClick = { dial(context, passport.settings.emergencyNumber) },
            modifier = Modifier.weight(1f).heightIn(min = 56.dp),
            shape = RoundedCornerShape(16.dp),
            colors = ButtonDefaults.buttonColors(containerColor = if (onAlert) Color(0xFFA81F2B) else KColors.danger, contentColor = Color.White),
        ) {
            Icon(Icons.Outlined.ReportProblem, null)
            Spacer(Modifier.width(8.dp))
            Text("Call ${passport.settings.emergencyNumber}", fontWeight = FontWeight.Bold)
        }
    }
}

/** Shows where every answer came from (FR-13). */
@Composable
fun SourceChip(source: String, modifier: Modifier = Modifier) {
    val (icon, label, bg) = when (source) {
        "on_device" -> Triple(Icons.Outlined.Lock, "Answered on this phone", KColors.brandSoft)
        "in_cloud" -> Triple(Icons.Outlined.Cloud, "Answered in the cloud, names removed", Color(0xFFE6EFFF))
        else -> Triple(Icons.AutoMirrored.Outlined.MenuBook, "Straight from the passport", KColors.surface2)
    }
    Surface(shape = RoundedCornerShape(18.dp), color = bg, modifier = modifier) {
        Row(Modifier.padding(horizontal = 12.dp, vertical = 5.dp), verticalAlignment = Alignment.CenterVertically) {
            Icon(icon, null, modifier = Modifier.size(14.dp), tint = KColors.text)
            Spacer(Modifier.width(6.dp))
            Text(label, fontSize = 12.sp, fontWeight = FontWeight.Bold, color = KColors.text)
        }
    }
}

/** Tap to flip, swipe or use the arrows to move: front = what you see, back = meaning and help. */
@Composable
fun Flashcards(rules: Rules, entries: List<Entry>) {
    if (entries.isEmpty()) return
    var index by remember { mutableIntStateOf(0) }
    var flipped by remember { mutableStateOf(false) }
    val entry = entries[index.coerceIn(0, entries.lastIndex)]
    val hasBack = entry.meaning.isNotBlank() || entry.whatToDo.isNotBlank()
    val rotation by animateFloatAsState(if (flipped) 180f else 0f, tween(450), label = "flip")
    val t = tone(entry.section)
    val info = rules.section(entry.section)
    fun go(delta: Int) {
        flipped = false
        index = (index + delta + entries.size) % entries.size
    }
    var drag by remember { mutableFloatStateOf(0f) }

    Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
        Text("CARD ${index + 1} OF ${entries.size}", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = KColors.muted)
        Box(
            Modifier
                .fillMaxWidth()
                .heightIn(min = 230.dp)
                .graphicsLayer { rotationY = rotation; cameraDistance = 14f * density }
                .clip(RoundedCornerShape(26.dp))
                .background(if (rotation <= 90f) KColors.surface else t.bg)
                .clickable(enabled = hasBack) { flipped = !flipped }
                .pointerInput(entries.size) {
                    detectHorizontalDragGestures(
                        onDragEnd = {
                            if (drag < -80) go(1) else if (drag > 80) go(-1)
                            drag = 0f
                        },
                        onHorizontalDrag = { _, amount -> drag += amount },
                    )
                }
                .padding(22.dp),
        ) {
            if (rotation <= 90f) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(info.icon, entry.section, 40)
                        Spacer(Modifier.width(10.dp))
                        Text(info.title, color = t.fg, fontWeight = FontWeight.ExtraBold)
                    }
                    Text(entry.signal, fontSize = 24.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 31.sp, color = KColors.text)
                    if (hasBack) Text("Tap to see what it means", color = KColors.muted, fontWeight = FontWeight.Bold, fontSize = 14.sp)
                }
            } else {
                Column(Modifier.graphicsLayer { rotationY = 180f }, verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(info.icon, entry.section, 40)
                        Spacer(Modifier.width(10.dp))
                        Text(entry.signal, color = t.fg, fontWeight = FontWeight.ExtraBold)
                    }
                    if (entry.meaning.isNotBlank()) {
                        Text("IT MEANS", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = t.fg)
                        Text(entry.meaning, fontSize = 19.sp, fontWeight = FontWeight.Bold, color = KColors.text)
                    }
                    if (entry.whatToDo.isNotBlank()) {
                        Text("WHAT HELPS", fontSize = 11.sp, fontWeight = FontWeight.ExtraBold, color = t.fg)
                        Text(entry.whatToDo, fontSize = 19.sp, fontWeight = FontWeight.Bold, color = KColors.text)
                    }
                }
            }
        }
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.Center, verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { go(-1) }) { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowLeft, "Previous card") }
            OutlinedButton(onClick = { flipped = !flipped }, enabled = hasBack, shape = RoundedCornerShape(14.dp)) {
                Icon(Icons.Outlined.Autorenew, null, modifier = Modifier.size(18.dp))
                Spacer(Modifier.width(6.dp))
                Text("Flip")
            }
            IconButton(onClick = { go(1) }) { Icon(Icons.AutoMirrored.Outlined.KeyboardArrowRight, "Next card") }
        }
    }
}
