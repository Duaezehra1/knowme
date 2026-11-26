package app.knowme.passport

import android.content.Intent
import android.graphics.Bitmap
import android.speech.tts.TextToSpeech
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.statusBarsPadding
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyListScope
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.ArrowBack
import androidx.compose.material.icons.automirrored.outlined.ArrowForward
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.automirrored.outlined.VolumeUp
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.AutoAwesome
import androidx.compose.material.icons.outlined.Check
import androidx.compose.material.icons.outlined.Delete
import androidx.compose.material.icons.outlined.Download
import androidx.compose.material.icons.outlined.Edit
import androidx.compose.material.icons.outlined.Handshake
import androidx.compose.material.icons.outlined.Lock
import androidx.compose.material.icons.outlined.PlayArrow
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material.icons.outlined.ReportProblem
import androidx.compose.material.icons.outlined.Share
import androidx.compose.material.icons.outlined.Upload
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.google.zxing.BarcodeFormat
import com.google.zxing.EncodeHintType
import com.google.zxing.qrcode.QRCodeWriter
import com.google.zxing.qrcode.decoder.ErrorCorrectionLevel
import com.google.firebase.appcheck.appCheck
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

// ---------------------------------------------------------------- shared layout

@Composable
private fun Page(title: String?, onBack: (() -> Unit)?, actions: (@Composable () -> Unit)? = null, content: LazyListScope.() -> Unit) {
    LazyColumn(
        modifier = Modifier.background(KColors.bg),
        contentPadding = PaddingValues(start = 16.dp, end = 16.dp, top = 8.dp, bottom = 32.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
    ) {
        if (title != null || onBack != null) {
            item {
                Row(Modifier.fillMaxWidth().statusBarsPadding().heightIn(min = 56.dp), verticalAlignment = Alignment.CenterVertically) {
                    if (onBack != null) {
                        IconButton(onClick = onBack) { Icon(Icons.AutoMirrored.Outlined.ArrowBack, "Back") }
                        Spacer(Modifier.width(4.dp))
                    }
                    if (title != null) Text(title, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold, color = KColors.text, modifier = Modifier.weight(1f))
                    actions?.invoke()
                }
            }
        }
        content()
    }
}

@Composable
private fun BigButton(text: String, onClick: () -> Unit, enabled: Boolean = true, color: Color = KColors.brand, icon: androidx.compose.ui.graphics.vector.ImageVector? = null) {
    Button(
        onClick = onClick,
        enabled = enabled,
        modifier = Modifier.fillMaxWidth().heightIn(min = 58.dp),
        shape = RoundedCornerShape(18.dp),
        colors = ButtonDefaults.buttonColors(containerColor = color, contentColor = Color.White),
    ) {
        if (icon != null) {
            Icon(icon, null)
            Spacer(Modifier.width(8.dp))
        }
        Text(text, fontSize = 17.sp, fontWeight = FontWeight.Bold)
    }
}

@Composable
private fun Field(label: String, value: String, onChange: (String) -> Unit, keyboard: KeyboardType = KeyboardType.Text, minLines: Int = 1) {
    OutlinedTextField(
        value = value,
        onValueChange = onChange,
        label = { Text(label) },
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(14.dp),
        minLines = minLines,
        keyboardOptions = KeyboardOptions(keyboardType = keyboard),
    )
}

@Composable
private fun SituationGrid(state: AppState, onPick: (Situation) -> Unit) {
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        for (row in state.rules.situations.chunked(2)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                for (s in row) {
                    val t = tone(s.tone)
                    Surface(
                        onClick = { onPick(s) },
                        modifier = Modifier.weight(1f).heightIn(min = 96.dp),
                        shape = RoundedCornerShape(20.dp),
                        color = if (s.emergency) KColors.danger else t.bg,
                    ) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            if (s.emergency) {
                                Box(Modifier.size(42.dp).clip(RoundedCornerShape(14.dp)).background(Color.White.copy(alpha = 0.22f)), contentAlignment = Alignment.Center) {
                                    Icon(iconFor(s.icon), null, tint = Color.White)
                                }
                            } else {
                                IconBadge(s.icon, s.tone, 42)
                            }
                            Text(s.label, fontWeight = FontWeight.ExtraBold, color = if (s.emergency) Color.White else KColors.text)
                        }
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

@Composable
private fun SectionTiles(state: AppState, passport: Passport, onlyFilled: Boolean = false) {
    val sections = state.rules.sections.filter { !onlyFilled || passport.entries.any { e -> e.section == it.id } }
    Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
        for (row in sections.chunked(2)) {
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                for (s in row) {
                    val items = passport.entries.filter { it.section == s.id }
                    val t = tone(s.id)
                    Surface(
                        onClick = { state.go(Screen.Section(s.id)) },
                        modifier = Modifier.weight(1f).heightIn(min = 120.dp),
                        shape = RoundedCornerShape(20.dp),
                        color = if (items.isEmpty()) KColors.surface else t.bg,
                        border = if (items.isEmpty()) BorderStroke(1.5.dp, KColors.border) else null,
                    ) {
                        Column(Modifier.padding(14.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                            IconBadge(s.icon, s.id, 38)
                            Text(s.title, fontWeight = FontWeight.ExtraBold, color = KColors.text, lineHeight = 19.sp)
                            if (items.isNotEmpty()) Text(items.joinToString(" · ") { it.signal }, color = KColors.muted, fontSize = 13.sp, maxLines = 2)
                            Text(
                                if (items.isEmpty()) "+ Add" else "${items.size} ${if (items.size == 1) "thing" else "things"}",
                                fontWeight = FontWeight.ExtraBold,
                                fontSize = 13.sp,
                                color = if (items.isEmpty()) KColors.accent else t.fg,
                            )
                        }
                    }
                }
                if (row.size == 1) Spacer(Modifier.weight(1f))
            }
        }
    }
}

// ---------------------------------------------------------------- welcome

@Composable
fun WelcomeScreen(state: AppState) {
    var name by remember { mutableStateOf("") }
    var age by remember { mutableStateOf("") }
    var avatarIcon by remember { mutableStateOf("smile") }
    var avatarColour by remember { mutableStateOf("teal") }
    var contact by remember { mutableStateOf("") }
    var phone by remember { mutableStateOf("") }
    var emergency by remember { mutableStateOf("1122") }
    val shown = name.trim().ifBlank { "your child" }

    Column(
        Modifier.background(KColors.bg).verticalScroll(rememberScrollState()).statusBarsPadding().padding(20.dp),
        verticalArrangement = Arrangement.spacedBy(16.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Image(painterResource(R.mipmap.ic_launcher), null, Modifier.size(88.dp).clip(RoundedCornerShape(22.dp)))
        Text("KnowMe", fontSize = 34.sp, fontWeight = FontWeight.ExtraBold, color = KColors.text)
        Text("Help everyone understand your child, even when they can't explain themselves.", fontSize = 17.sp, color = KColors.text, lineHeight = 24.sp)
        state.rules.demo?.let { demo ->
            OutlinedButton(
                onClick = {
                    state.passport = state.store.save(demoPassport(demo))
                    state.tab(Screen.Home)
                },
                modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp),
                shape = RoundedCornerShape(18.dp),
            ) {
                Icon(Icons.Outlined.PlayArrow, null)
                Spacer(Modifier.width(8.dp))
                Text("Just looking? Try a demo child", fontSize = 16.sp, fontWeight = FontWeight.Bold)
            }
            Text("Or make a passport for your own child below.", color = KColors.muted, fontSize = 14.sp)
        }
        val promises = listOf(
            Triple("clock", "routine", "Build a passport in minutes, one simple question at a time."),
            Triple("message-circle", "communication", "Any carer can tap \"Crying\" or type what they see, and get your advice."),
            Triple("shield-check", "safety", "Private: everything stays on this phone."),
        )
        for ((icon, t, text) in promises) {
            Surface(shape = RoundedCornerShape(16.dp), color = KColors.surface, border = BorderStroke(1.dp, KColors.border), modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(12.dp), verticalAlignment = Alignment.CenterVertically) {
                    IconBadge(icon, t, 40)
                    Spacer(Modifier.width(12.dp))
                    Text(text, color = KColors.text)
                }
            }
        }
        KCard {
            Text("Who is this passport for?", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
            Field("Their first name", name, { name = it })
            Field("Age (optional)", age, { age = it.filter(Char::isDigit).take(2) }, KeyboardType.Number)
            Text("A picture so carers recognise $shown", fontWeight = FontWeight.Bold)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.fillMaxWidth()) {
                for (icon in AVATAR_ICONS.take(5)) {
                    val selected = icon == avatarIcon
                    Box(
                        Modifier.weight(1f).height(48.dp).clip(RoundedCornerShape(14.dp))
                            .background(androidx.compose.ui.graphics.Brush.linearGradient(AVATAR_COLOURS.getValue(avatarColour)))
                            .border(if (selected) 3.dp else 0.dp, KColors.text, RoundedCornerShape(14.dp))
                            .clickable { avatarIcon = icon },
                        contentAlignment = Alignment.Center,
                    ) { Icon(iconFor(icon), icon, tint = Color.White) }
                }
            }
            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                for ((key, colours) in AVATAR_COLOURS) {
                    Box(
                        Modifier.size(36.dp).clip(CircleShape).background(androidx.compose.ui.graphics.Brush.linearGradient(colours))
                            .border(if (key == avatarColour) 3.dp else 0.dp, KColors.text, CircleShape)
                            .clickable { avatarColour = key },
                    )
                }
            }
        }
        KCard {
            Text("Who should carers call?", fontSize = 20.sp, fontWeight = FontWeight.ExtraBold)
            Field("Your name, as $shown knows you", contact, { contact = it })
            Field("Your phone number", phone, { phone = it }, KeyboardType.Phone)
            Field("Emergency number", emergency, { emergency = it }, KeyboardType.Phone)
        }
        BigButton(
            "Start (about 5 minutes)",
            enabled = name.isNotBlank() && contact.isNotBlank(),
            onClick = {
                state.passport = state.store.save(createPassport(name, age.toIntOrNull(), "$avatarIcon:$avatarColour", contact, phone, emergency))
                state.tab(Screen.Guide())
            },
            icon = Icons.AutoMirrored.Outlined.ArrowForward,
        )
        Text("Everything you write stays on this phone.", color = KColors.muted, fontSize = 13.sp)
    }
}

// ---------------------------------------------------------------- home (parent)

@Composable
fun HomeScreen(state: AppState, passport: Passport) {
    val name = passport.child.firstName
    val c = completeness(passport, state.rules)
    val glance = atAGlance(passport)
    val empty = passport.entries.isEmpty()
    Page(title = null, onBack = null) {
        if (passport.demo) {
            item {
                Surface(shape = RoundedCornerShape(20.dp), color = KColors.accentSoft, modifier = Modifier.fillMaxWidth().statusBarsPadding()) {
                    Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
                        Text("You're trying KnowMe with $name, a made-up child", fontWeight = FontWeight.ExtraBold, color = KColors.text)
                        Text("Tap \"Ask about $name\" or \"Hand to a carer\" to see what a babysitter sees.", color = KColors.muted, fontSize = 14.sp)
                        TextButton(onClick = { state.store.delete(); state.passport = null; state.tab(Screen.Home) }, contentPadding = PaddingValues(0.dp)) {
                            Text("Make a passport for my own child instead", fontWeight = FontWeight.Bold)
                        }
                    }
                }
            }
        }
        item {
            Box(Modifier.fillMaxWidth().then(if (passport.demo) Modifier else Modifier.statusBarsPadding()).clip(RoundedCornerShape(30.dp)).background(KColors.heroGradient).padding(22.dp)) {
                Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Avatar(passport, 80)
                        Spacer(Modifier.width(16.dp))
                        Column {
                            Text("KNOWME PASSPORT", color = Color.White.copy(alpha = 0.85f), fontSize = 12.sp, fontWeight = FontWeight.ExtraBold)
                            Text(name, color = Color.White, fontSize = 28.sp, fontWeight = FontWeight.ExtraBold)
                            val sub = listOfNotNull(passport.child.age?.let { "$it years old" }, passport.child.aboutMe).joinToString(" · ")
                            if (sub.isNotBlank()) {
                                Text(sub, color = Color.White.copy(alpha = 0.92f))
                            } else {
                                Text(
                                    "+ Add a line about $name",
                                    color = Color.White,
                                    fontWeight = FontWeight.Bold,
                                    textDecoration = androidx.compose.ui.text.style.TextDecoration.Underline,
                                    modifier = Modifier.clickable { state.tab(Screen.Settings) },
                                )
                            }
                        }
                    }
                    Row(Modifier.fillMaxWidth()) {
                        Text(if (c.filled == c.total) "Passport complete" else "${c.filled} of ${c.total} sections done", color = Color.White, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f))
                        Text("${passport.entries.size} ${if (passport.entries.size == 1) "note" else "notes"}", color = Color.White, fontWeight = FontWeight.Bold)
                    }
                    LinearProgressIndicator(
                        progress = { (c.filled.toFloat() / c.total).coerceAtLeast(0.04f) },
                        modifier = Modifier.fillMaxWidth().height(10.dp).clip(RoundedCornerShape(50)),
                        color = Color.White,
                        trackColor = Color.White.copy(alpha = 0.25f),
                    )
                }
            }
        }
        item {
            Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ActionTile(Icons.AutoMirrored.Outlined.Chat, "Ask about $name", "Tap a situation or type", KColors.brand, Color.White, Modifier.weight(1f), enabled = !empty) { state.go(Screen.Ask()) }
                    ActionTile(Icons.Outlined.ReportProblem, "Emergency", "Calls and safety notes", KColors.danger, Color.White, Modifier.weight(1f)) { state.go(Screen.Emergency()) }
                }
                Row(horizontalArrangement = Arrangement.spacedBy(12.dp)) {
                    ActionTile(Icons.Outlined.Handshake, "Hand to a carer", "Simple view for a babysitter", KColors.accentSoft, KColors.text, Modifier.weight(1f), enabled = !empty) {
                        state.carerMode = true
                        state.tab(Screen.Home)
                    }
                    ActionTile(Icons.Outlined.Edit, "Add more", "Quick questions", KColors.surface, KColors.text, Modifier.weight(1f)) { state.go(Screen.Guide()) }
                }
            }
        }
        c.next?.let { next ->
            item {
                val info = state.rules.section(next)
                Surface(shape = RoundedCornerShape(24.dp), color = KColors.accentSoft, modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            IconBadge(info.icon, next, 32)
                            Spacer(Modifier.width(8.dp))
                            Text("NEXT: ${info.title.uppercase()}", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = KColors.muted)
                        }
                        Text(info.question.withName(name), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                        Button(onClick = { state.go(Screen.Guide(next)) }, shape = RoundedCornerShape(14.dp)) { Text("Answer now") }
                    }
                }
            }
        }
        if (glance.isNotEmpty()) {
            item {
                KCard {
                    Text("What carers will see first", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
                    Text("Flashcards of the most important things. Tap a card to flip it.", color = KColors.muted, fontSize = 14.sp)
                    Flashcards(state.rules, glance)
                }
            }
        }
        item {
            KCard {
                Text("$name's passport", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
                SectionTiles(state, passport)
                TextButton(onClick = { state.go(Screen.Paste()) }) {
                    Icon(Icons.Outlined.AutoAwesome, null, Modifier.size(18.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Paste a description")
                }
            }
        }
    }
}

@Composable
private fun ActionTile(icon: androidx.compose.ui.graphics.vector.ImageVector, title: String, sub: String, bg: Color, fg: Color, modifier: Modifier, enabled: Boolean = true, onClick: () -> Unit) {
    Surface(
        onClick = onClick,
        enabled = enabled,
        modifier = modifier.heightIn(min = 116.dp),
        shape = RoundedCornerShape(22.dp),
        color = if (enabled) bg else bg.copy(alpha = 0.45f),
        border = if (bg == KColors.surface) BorderStroke(1.dp, KColors.border) else null,
    ) {
        Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(6.dp)) {
            Icon(icon, null, tint = fg, modifier = Modifier.size(30.dp))
            Text(title, color = fg, fontWeight = FontWeight.ExtraBold, fontSize = 17.sp)
            Text(sub, color = fg.copy(alpha = 0.85f), fontSize = 13.sp)
        }
    }
}

// ---------------------------------------------------------------- guided interview

@Composable
fun InterviewScreen(state: AppState, passport: Passport, start: String?) {
    val rules = state.rules
    val name = passport.child.firstName
    var index by remember {
        mutableIntStateOf(
            start?.let { s -> rules.sections.indexOfFirst { it.id == s } }?.takeIf { it >= 0 }
                ?: rules.sections.indexOfFirst { s -> passport.entries.none { it.section == s.id } }.takeIf { it >= 0 } ?: 0,
        )
    }
    var signal by remember { mutableStateOf("") }
    var meaning by remember { mutableStateOf("") }
    var help by remember { mutableStateOf("") }
    var done by remember { mutableStateOf(false) }
    val info = rules.sections[index]
    val saved = passport.entries.filter { it.section == info.id }

    fun save() {
        if (signal.isBlank()) return
        state.update { p -> p.copy(entries = p.entries + Entry(id = newId("e"), section = info.id, signal = signal.trim(), meaning = meaning.trim(), whatToDo = help.trim())) }
        signal = ""; meaning = ""; help = ""
        state.toast("Saved")
    }

    if (done) {
        Page("All done", onBack = { state.tab(Screen.Home) }) {
            item {
                KCard {
                    Avatar(passport, 96)
                    Text("$name's passport has ${passport.entries.size} things to know", fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                    Text("Carers can now ask about $name. Next, make the QR card for $name's bag.", color = KColors.muted)
                    BigButton("Make the QR card", onClick = { state.tab(Screen.Card) }, icon = Icons.Outlined.QrCode2)
                    OutlinedButton(onClick = { state.tab(Screen.Ask()) }, modifier = Modifier.fillMaxWidth(), shape = RoundedCornerShape(16.dp)) { Text("Try asking a question") }
                }
            }
        }
        return
    }

    Page("About $name", onBack = { state.back() }) {
        item {
            LinearProgressIndicator(progress = { (index + 1f) / rules.sections.size }, modifier = Modifier.fillMaxWidth().clip(RoundedCornerShape(50)), color = KColors.brand, trackColor = KColors.border)
        }
        item {
            Surface(shape = RoundedCornerShape(24.dp), color = tone(info.id).bg, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        IconBadge(info.icon, info.id, 36)
                        Spacer(Modifier.width(8.dp))
                        Text("${info.title.uppercase()} · ${index + 1} OF ${rules.sections.size}", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = KColors.muted)
                    }
                    Text(info.question.withName(name), fontSize = 21.sp, fontWeight = FontWeight.ExtraBold, lineHeight = 28.sp)
                    Text("Tap an example to start from it:", color = KColors.muted, fontSize = 13.sp)
                    for (ex in info.examples) {
                        Surface(
                            onClick = { signal = ex.signal; meaning = ex.meaning; help = ex.whatToDo },
                            shape = RoundedCornerShape(14.dp),
                            color = KColors.surface,
                            modifier = Modifier.fillMaxWidth(),
                        ) {
                            Text(
                                ex.signal + if (ex.meaning.isNotBlank()) " · means ${ex.meaning.lowercase()}" else "",
                                Modifier.padding(12.dp),
                                fontWeight = FontWeight.SemiBold,
                            )
                        }
                    }
                }
            }
        }
        item {
            KCard {
                Field(info.signalLabel.withName(name), signal, { signal = it })
                if (info.meaningLabel.isNotBlank()) Field(info.meaningLabel, meaning, { meaning = it })
                Field(info.whatToDoLabel, help, { help = it })
                Button(
                    onClick = ::save,
                    enabled = signal.isNotBlank(),
                    modifier = Modifier.fillMaxWidth().heightIn(min = 54.dp),
                    shape = RoundedCornerShape(16.dp),
                    colors = ButtonDefaults.buttonColors(containerColor = KColors.brandSoft, contentColor = KColors.brandStrong),
                ) {
                    Icon(Icons.Outlined.Add, null)
                    Spacer(Modifier.width(6.dp))
                    Text("Save and add another", fontWeight = FontWeight.Bold)
                }
                if (saved.isNotEmpty()) {
                    Text("Saved in ${info.title.lowercase()}:", color = KColors.muted, fontSize = 13.sp)
                    for (e in saved) {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            Text(e.signal + if (e.meaning.isNotBlank()) " · ${e.meaning}" else "", modifier = Modifier.weight(1f), fontWeight = FontWeight.SemiBold)
                            Icon(Icons.Outlined.Check, null, tint = KColors.brand)
                        }
                    }
                }
            }
        }
        item {
            Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
                TextButton(onClick = { if (index > 0) index-- else state.back() }) { Text("Back") }
                Spacer(Modifier.weight(1f))
                Button(onClick = {
                    save()
                    if (index < rules.sections.lastIndex) index++ else done = true
                }, shape = RoundedCornerShape(14.dp)) {
                    Text(if (index < rules.sections.lastIndex) (if (saved.isNotEmpty() || signal.isNotBlank()) "Next question" else "Skip for now") else "Finish")
                    Spacer(Modifier.width(6.dp))
                    Icon(Icons.AutoMirrored.Outlined.ArrowForward, null, Modifier.size(18.dp))
                }
            }
        }
    }
}

// ---------------------------------------------------------------- one section

@Composable
fun SectionScreen(state: AppState, passport: Passport, id: String) {
    val info = state.rules.section(id)
    val name = passport.child.firstName
    val entries = passport.entries.filter { it.section == id }
    var editing by remember { mutableStateOf<String?>(null) }
    var signal by remember { mutableStateOf("") }
    var meaning by remember { mutableStateOf("") }
    var help by remember { mutableStateOf("") }
    val readOnly = state.carerMode

    fun startEdit(e: Entry?) {
        editing = e?.id ?: "new"
        signal = e?.signal.orEmpty(); meaning = e?.meaning.orEmpty(); help = e?.whatToDo.orEmpty()
    }

    fun save() {
        if (signal.isBlank()) return
        state.update { p ->
            p.copy(
                entries = if (editing == "new") p.entries + Entry(id = newId("e"), section = id, signal = signal.trim(), meaning = meaning.trim(), whatToDo = help.trim())
                else p.entries.map { if (it.id == editing) it.copy(signal = signal.trim(), meaning = meaning.trim(), whatToDo = help.trim(), updatedAt = now()) else it },
            )
        }
        editing = null
        state.toast("Saved")
    }

    Page(info.title, onBack = { state.back() }) {
        item {
            Surface(shape = RoundedCornerShape(24.dp), color = tone(id).bg, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                    IconBadge(info.icon, id, 52)
                    Text(info.question.withName(name), fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                }
            }
        }
        if (entries.isEmpty() && editing == null) {
            item { Text(if (readOnly) "Nothing here yet. If you're unsure, call the parent." else "Nothing here yet. Add the first one below.", color = KColors.muted) }
        }
        items(entries, key = { it.id }) { e ->
            if (editing == e.id) {
                KCard {
                    Field(info.signalLabel.withName(name), signal, { signal = it })
                    if (info.meaningLabel.isNotBlank()) Field(info.meaningLabel, meaning, { meaning = it })
                    Field(info.whatToDoLabel, help, { help = it })
                    Row { TextButton(onClick = { editing = null }) { Text("Cancel") }; Spacer(Modifier.weight(1f)); Button(onClick = ::save) { Text("Save") } }
                }
            } else {
                EntryCard(state.rules, e, showSection = false) {
                    if (!readOnly) {
                        Row {
                            TextButton(onClick = { startEdit(e) }) { Icon(Icons.Outlined.Edit, null, Modifier.size(16.dp)); Spacer(Modifier.width(4.dp)); Text("Edit") }
                            TextButton(onClick = {
                                state.update { p -> p.copy(entries = p.entries.filter { it.id != e.id }) }
                                state.toast("Deleted")
                            }) { Icon(Icons.Outlined.Delete, null, Modifier.size(16.dp), tint = KColors.danger); Spacer(Modifier.width(4.dp)); Text("Delete", color = KColors.danger) }
                        }
                    }
                }
            }
        }
        if (!readOnly) {
            item {
                if (editing == "new") {
                    KCard {
                        Field(info.signalLabel.withName(name), signal, { signal = it })
                        if (info.meaningLabel.isNotBlank()) Field(info.meaningLabel, meaning, { meaning = it })
                        Field(info.whatToDoLabel, help, { help = it })
                        Row { TextButton(onClick = { editing = null }) { Text("Cancel") }; Spacer(Modifier.weight(1f)); Button(onClick = ::save, enabled = signal.isNotBlank()) { Text("Save") } }
                    }
                } else {
                    BigButton("Add to ${info.title.lowercase()}", onClick = { startEdit(null) }, icon = Icons.Outlined.Add)
                }
            }
        }
    }
}

// ---------------------------------------------------------------- ask

@Composable
fun AskScreen(state: AppState, passport: Passport, situationId: String?, initialQuestion: String?) {
    val name = passport.child.firstName
    val context = LocalContext.current
    val scope = rememberCoroutineScope()
    var question by remember { mutableStateOf(initialQuestion.orEmpty()) }
    var asked by remember { mutableStateOf<String?>(null) }
    var askedIcon by remember { mutableStateOf<String?>(null) }
    val entries = remember { mutableStateListOf<Entry>() }
    var answer by remember { mutableStateOf<KnowMeAi.Answer?>(null) }
    var aiFailed by remember { mutableStateOf(false) }
    var thinking by remember { mutableStateOf(false) }
    var elapsed by remember { mutableIntStateOf(0) }
    var runId by remember { mutableIntStateOf(0) }

    val tts = remember { arrayOfNulls<TextToSpeech>(1) }
    DisposableEffect(Unit) {
        tts[0] = TextToSpeech(context) {}
        onDispose { tts[0]?.shutdown() }
    }

    /** `text` is what the carer sees; `aiQuestion` is what the AI is asked (a full sentence for buttons). */
    fun run(text: String, found: List<Entry>, icon: String?, aiQuestion: String = text) {
        val id = ++runId
        asked = text; askedIcon = icon
        entries.clear(); entries.addAll(found)
        answer = null
        aiFailed = false
        if (found.isEmpty()) return
        thinking = true
        elapsed = 0
        scope.launch {
            val outcome = runCatching { KnowMeAi.answer(state.rules, passport, aiQuestion, found, state.cloudAllowed()) }
                .getOrDefault(KnowMeAi.Outcome.Failed)
            if (id == runId) {
                answer = (outcome as? KnowMeAi.Outcome.Answered)?.answer
                aiFailed = outcome == KnowMeAi.Outcome.Failed
                thinking = false
            }
        }
        scope.launch {
            while (thinking && id == runId) {
                delay(1000)
                elapsed++
            }
        }
    }

    fun askText(text: String) {
        val q = text.trim().take(300)
        if (q.isBlank()) return
        // Emergency words skip AI entirely (FR-12).
        if (state.matcher.isEmergency(q)) {
            state.go(Screen.Emergency(q))
            return
        }
        run(q, state.matcher.findMatches(q, passport.entries), null)
    }

    fun askSituation(s: Situation) {
        if (s.emergency) {
            state.go(Screen.Emergency())
            return
        }
        run(s.label, state.matcher.situationEntries(passport, s), s.icon, s.question.withName(name).ifBlank { "$name: ${s.label}" })
    }

    LaunchedEffect(Unit) {
        state.rules.situations.firstOrNull { it.id == situationId }?.let { askSituation(it) } ?: initialQuestion?.let { askText(it) }
    }

    Page("Ask about $name", onBack = if (state.stack.size > 1) ({ state.back() }) else null) {
        item { Text("What's happening?", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold) }
        item { SituationGrid(state, ::askSituation) }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(
                    value = question,
                    onValueChange = { question = it.take(300) },
                    placeholder = { Text("Or type what $name is doing…") },
                    modifier = Modifier.weight(1f),
                    shape = RoundedCornerShape(16.dp),
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(imeAction = ImeAction.Send),
                    keyboardActions = KeyboardActions(onSend = { askText(question) }),
                )
                Spacer(Modifier.width(8.dp))
                Button(onClick = { askText(question) }, enabled = question.isNotBlank(), shape = RoundedCornerShape(14.dp), modifier = Modifier.heightIn(min = 54.dp)) { Text("Ask") }
            }
        }
        asked?.let { q ->
            item {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.End) {
                    Surface(shape = RoundedCornerShape(20.dp, 20.dp, 6.dp, 20.dp), color = KColors.brand) {
                        Row(Modifier.padding(horizontal = 16.dp, vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) {
                            askedIcon?.let { Icon(iconFor(it), null, tint = Color.White, modifier = Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)) }
                            Text(q, color = Color.White, fontWeight = FontWeight.SemiBold)
                        }
                    }
                }
            }
            if (entries.isEmpty()) {
                item {
                    KCard {
                        Text("That isn't in $name's passport yet.", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold)
                        Text("Stay calm, keep $name safe, and call for help if you're unsure.")
                        CallButtons(passport)
                    }
                }
            } else {
                if (thinking) {
                    item {
                        Row(verticalAlignment = Alignment.CenterVertically) {
                            CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 3.dp, color = KColors.brand)
                            Spacer(Modifier.width(10.dp))
                            Text("Writing a short answer · ${elapsed}s", color = KColors.muted, fontWeight = FontWeight.Bold)
                        }
                    }
                }
                answer?.let { a ->
                    item {
                        Surface(shape = RoundedCornerShape(20.dp, 20.dp, 20.dp, 6.dp), color = KColors.surface, border = BorderStroke(2.dp, KColors.brand), modifier = Modifier.fillMaxWidth()) {
                            Column(Modifier.padding(16.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
                                Text(a.text, fontSize = 18.sp, fontWeight = FontWeight.Bold, lineHeight = 26.sp)
                                // The label shrinks (and wraps) first, so "Read aloud" always stays on one line.
                                Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                                    SourceChip(a.source, Modifier.weight(1f, fill = false))
                                    Spacer(Modifier.width(8.dp))
                                    TextButton(onClick = { tts[0]?.speak(a.text, TextToSpeech.QUEUE_FLUSH, null, "answer") }) {
                                        Icon(Icons.AutoMirrored.Outlined.VolumeUp, null, Modifier.size(18.dp)); Spacer(Modifier.width(4.dp)); Text("Read aloud", maxLines = 1, softWrap = false)
                                    }
                                }
                            }
                        }
                    }
                }
                if (aiFailed) {
                    item { Text("The AI couldn't answer just now, so here is exactly what $name's family wrote.", color = KColors.muted, fontSize = 14.sp) }
                }
                item {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Text("From $name's passport", fontWeight = FontWeight.ExtraBold)
                        Spacer(Modifier.width(8.dp))
                        if (answer == null && !thinking) SourceChip("offline_search")
                    }
                }
                val used = answer?.used.orEmpty()
                items(used + entries.filter { it !in used }, key = { it.id }) { e -> EntryCard(state.rules, e) }
                item { CallButtons(passport) }
            }
        }
        item { Text("KnowMe shares what $name's family wrote. In an emergency, call ${passport.settings.emergencyNumber}.", color = KColors.muted, fontSize = 13.sp) }
    }
}

// ---------------------------------------------------------------- emergency

@Composable
fun EmergencyScreen(state: AppState, passport: Passport, said: String) {
    val name = passport.child.firstName
    // Kept short on purpose: safety, medical, calming, then only the first two ways of communicating.
    val order = listOf("safety", "medical", "calming")
    val entries = order.flatMap { s -> passport.entries.filter { it.section == s } } +
        passport.entries.filter { it.section == "communication" }.take(2)
    Page("Emergency", onBack = { state.back() }) {
        item {
            Surface(shape = RoundedCornerShape(26.dp), color = KColors.danger, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.padding(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        Avatar(passport, 56)
                        Spacer(Modifier.width(12.dp))
                        Text("If $name is in danger, call ${passport.settings.emergencyNumber} now.", color = Color.White, fontSize = 21.sp, fontWeight = FontWeight.ExtraBold)
                    }
                    if (said.isNotBlank()) Text("You said: “$said”", color = Color.White)
                    CallButtons(passport, onAlert = true)
                }
            }
        }
        item { Text("What $name's family wants you to know", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold) }
        if (entries.isEmpty()) item { Text("There are no safety or medical notes yet. Call the parent.", color = KColors.muted) }
        items(entries, key = { it.id }) { EntryCard(state.rules, it) }
        item { Text("KnowMe doesn't give medical advice. Follow the emergency operator's instructions.", color = KColors.muted, fontSize = 13.sp) }
    }
}

// ---------------------------------------------------------------- QR card

private fun qrBitmap(text: String, size: Int = 640): Bitmap? = runCatching {
    val matrix = QRCodeWriter().encode(text, BarcodeFormat.QR_CODE, size, size, mapOf(EncodeHintType.ERROR_CORRECTION to ErrorCorrectionLevel.M, EncodeHintType.MARGIN to 2, EncodeHintType.CHARACTER_SET to "UTF-8"))
    val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.RGB_565)
    for (x in 0 until size) for (y in 0 until size) bmp.setPixel(x, y, if (matrix[x, y]) android.graphics.Color.BLACK else android.graphics.Color.WHITE)
    bmp
}.getOrNull()

@Composable
fun CardScreen(state: AppState, passport: Passport) {
    val context = LocalContext.current
    val name = passport.child.firstName
    var text by remember { mutableStateOf(passport.emergencyCard.text.ifBlank { draftCard(passport) }) }
    val qr = remember(text) { qrBitmap(text)?.asImageBitmap() }
    Page("QR card", onBack = null) {
        item {
            Surface(shape = RoundedCornerShape(20.dp), color = KColors.accentSoft, modifier = Modifier.fillMaxWidth()) {
                Text("If $name is ever lost, anyone can point a normal phone camera at this card and read what to do. No app, no internet.", Modifier.padding(16.dp))
            }
        }
        qr?.let { bmp ->
            item {
                Surface(shape = RoundedCornerShape(20.dp), color = Color.White, border = BorderStroke(3.dp, KColors.brand), modifier = Modifier.fillMaxWidth()) {
                    Column(Modifier.padding(16.dp), horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        Image(BitmapPainter(bmp), "QR code that reads: $text", Modifier.size(220.dp))
                        Text("Scan me with your phone camera", color = KColors.brand, fontWeight = FontWeight.ExtraBold)
                        Text(text, color = Color.Black, fontWeight = FontWeight.SemiBold)
                    }
                }
            }
        }
        item {
            KCard {
                OutlinedTextField(
                    value = text,
                    onValueChange = { text = it.take(CARD_MAX) },
                    label = { Text("What the card says") },
                    modifier = Modifier.fillMaxWidth(),
                    minLines = 5,
                    supportingText = { Text("${text.length} / $CARD_MAX · no surname, address or diagnosis") },
                )
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    Button(onClick = {
                        state.update { it.copy(emergencyCard = EmergencyCard(text.trim())) }
                        state.toast("Card saved")
                    }, shape = RoundedCornerShape(14.dp)) { Text("Save card") }
                    OutlinedButton(onClick = {
                        context.startActivity(Intent.createChooser(Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), "Share card"))
                    }, shape = RoundedCornerShape(14.dp)) { Icon(Icons.Outlined.Share, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Share") }
                    TextButton(onClick = { text = draftCard(passport) }) { Text("Redraft") }
                }
            }
        }
    }
}

// ---------------------------------------------------------------- settings

@Composable
fun SettingsScreen(state: AppState, passport: Passport) {
    val context = LocalContext.current
    val name = passport.child.firstName
    var confirmDelete by remember { mutableStateOf(false) }
    val contact = passport.primaryContact
    var contactName by remember(contact?.id) { mutableStateOf(contact?.name.orEmpty()) }
    var contactPhone by remember(contact?.id) { mutableStateOf(contact?.phone.orEmpty()) }
    var emergency by remember { mutableStateOf(passport.settings.emergencyNumber) }
    var about by remember { mutableStateOf(passport.child.aboutMe.orEmpty()) }

    val exporter = rememberLauncherForActivityResult(ActivityResultContracts.CreateDocument("application/json")) { uri ->
        if (uri != null) {
            context.contentResolver.openOutputStream(uri)?.use { it.write(state.store.export(passport).toByteArray()) }
            state.toast("Backup saved")
        }
    }
    val importer = rememberLauncherForActivityResult(ActivityResultContracts.OpenDocument()) { uri ->
        if (uri != null) {
            runCatching {
                val text = context.contentResolver.openInputStream(uri)!!.bufferedReader().use { it.readText() }
                state.passport = state.store.save(state.store.import(text))
            }.onSuccess { state.toast("Backup restored") }.onFailure { state.toast(it.message ?: "Couldn't read that file") }
        }
    }

    Page("Settings", onBack = null) {
        item {
            KCard {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Avatar(passport, 64)
                    Spacer(Modifier.width(12.dp))
                    Text(name, fontSize = 22.sp, fontWeight = FontWeight.ExtraBold)
                }
                Field("One line about $name", about, { about = it.take(120) })
                Field("Who carers call (name)", contactName, { contactName = it })
                Field("Their phone number", contactPhone, { contactPhone = it }, KeyboardType.Phone)
                Field("Emergency number", emergency, { emergency = it }, KeyboardType.Phone)
                Button(onClick = {
                    state.update { p ->
                        p.copy(
                            child = p.child.copy(aboutMe = about.trim().ifBlank { null }),
                            contacts = p.contacts.map { if (it.id == contact?.id) it.copy(name = contactName.trim(), phone = contactPhone.trim()) else it },
                            settings = p.settings.copy(emergencyNumber = emergency.trim().ifBlank { p.settings.emergencyNumber }),
                        )
                    }
                    state.toast("Saved")
                }, shape = RoundedCornerShape(14.dp)) { Text("Save changes") }
            }
        }
        item {
            KCard {
                Text("AI and privacy", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Lock, null, tint = KColors.brand)
                    Spacer(Modifier.width(8.dp))
                    Text("On phones with Gemini Nano, answers are made on this phone and nothing is uploaded.", color = KColors.muted, modifier = Modifier.weight(1f))
                }
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Column(Modifier.weight(1f)) {
                        Text("Cloud help", fontWeight = FontWeight.Bold)
                        Text("Off by default. When on, phones without on-device AI can ask Google's cloud AI while online. Names and numbers are removed first, and the Medical section is never sent.", color = KColors.muted, fontSize = 13.sp)
                    }
                    Switch(checked = passport.settings.cloudHelp, onCheckedChange = { on -> state.update { it.copy(settings = it.settings.copy(cloudHelp = on)) } })
                }
            }
        }
        item {
            KCard {
                Text("Hand the phone to a carer", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
                Text("Carer view shows the passport, situation buttons and Call buttons, with nothing to edit.", color = KColors.muted)
                Button(onClick = { state.carerMode = true; state.tab(Screen.Home) }, shape = RoundedCornerShape(14.dp), colors = ButtonDefaults.buttonColors(containerColor = KColors.brandSoft, contentColor = KColors.brandStrong)) {
                    Icon(Icons.Outlined.Handshake, null); Spacer(Modifier.width(8.dp)); Text("Switch to carer view")
                }
            }
        }
        item {
            KCard {
                Text("Backup", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
                Text("Move $name's passport between this phone and the KnowMe website with a backup file.", color = KColors.muted)
                Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                    OutlinedButton(onClick = { exporter.launch("$name-knowme-backup.json") }, shape = RoundedCornerShape(14.dp)) { Icon(Icons.Outlined.Download, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Save") }
                    OutlinedButton(onClick = { importer.launch(arrayOf("application/json", "text/plain", "*/*")) }, shape = RoundedCornerShape(14.dp)) { Icon(Icons.Outlined.Upload, null, Modifier.size(18.dp)); Spacer(Modifier.width(6.dp)); Text("Restore") }
                }
            }
        }
        // The judges' APK already carries a registered token, so it has nothing to set up here.
        if (isDebuggable(context) && BuildConfig.JUDGE_APPCHECK_TOKEN.isBlank()) {
            item { DeveloperCard() }
        }
        item {
            KCard {
                Text("Delete everything", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold, color = KColors.danger)
                Text("Removes $name's passport from this phone. It can't be undone unless you saved a backup.", color = KColors.muted)
                if (confirmDelete) {
                    Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                        Button(onClick = { state.store.delete(); state.passport = null; state.tab(Screen.Home) }, colors = ButtonDefaults.buttonColors(containerColor = KColors.danger)) { Text("Yes, delete everything") }
                        OutlinedButton(onClick = { confirmDelete = false }) { Text("Cancel") }
                    }
                } else {
                    OutlinedButton(onClick = { confirmDelete = true }) { Text("Delete everything", color = KColors.danger) }
                }
            }
        }
    }
}

// ---------------------------------------------------------------- developer (debug builds only)

fun isDebuggable(context: android.content.Context): Boolean =
    context.applicationInfo.flags and android.content.pm.ApplicationInfo.FLAG_DEBUGGABLE != 0

/** The App Check debug provider keeps its token here; showing it saves needing a USB cable and logcat. */
private fun readDebugToken(context: android.content.Context): String? =
    context.getSharedPreferences(debugTokenStore(com.google.firebase.FirebaseApp.getInstance()), android.content.Context.MODE_PRIVATE)
        .getString(DEBUG_SECRET_KEY, null)

@Composable
private fun DeveloperCard() {
    val context = LocalContext.current
    val clipboard = androidx.compose.ui.platform.LocalClipboardManager.current
    var token by remember { mutableStateOf(readDebugToken(context)) }
    KCard(color = KColors.surface2) {
        Text("Developer: App Check debug token", fontSize = 17.sp, fontWeight = FontWeight.ExtraBold)
        Text("Register this in Firebase console → App Check → Apps → KnowMe Android → Manage debug tokens, so cloud help works in this test build.", color = KColors.muted, fontSize = 13.sp)
        if (token == null) {
            OutlinedButton(onClick = {
                com.google.firebase.Firebase.appCheck.getAppCheckToken(false).addOnCompleteListener { token = readDebugToken(context) }
            }) { Text("Create token") }
        } else {
            Text(token!!, fontWeight = FontWeight.Bold, fontSize = 14.sp)
            OutlinedButton(onClick = { clipboard.setText(androidx.compose.ui.text.AnnotatedString(token!!)) }) { Text("Copy") }
        }
    }
}

// ---------------------------------------------------------------- carer view

@Composable
fun CarerHomeScreen(state: AppState, passport: Passport) {
    val name = passport.child.firstName
    var question by remember { mutableStateOf("") }
    var confirmExit by remember { mutableStateOf(false) }
    val glance = atAGlance(passport)
    Page("Carer view", onBack = null, actions = {
        if (confirmExit) {
            TextButton(onClick = { confirmExit = false }) { Text("Stay") }
            Button(onClick = { state.carerMode = false; state.tab(Screen.Home) }) { Text("Exit") }
        } else {
            TextButton(onClick = { confirmExit = true }) { Text("I'm the parent") }
        }
    }) {
        item {
            Surface(shape = RoundedCornerShape(30.dp), color = KColors.accentSoft, modifier = Modifier.fillMaxWidth()) {
                Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Avatar(passport, 88)
                    Spacer(Modifier.width(16.dp))
                    Column {
                        Text("YOU'RE LOOKING AFTER", fontSize = 12.sp, fontWeight = FontWeight.ExtraBold, color = KColors.muted)
                        Text(name, fontSize = 26.sp, fontWeight = FontWeight.ExtraBold)
                        val sub = listOfNotNull(passport.child.age?.let { "$it years old" }, passport.child.aboutMe).joinToString(" · ")
                        if (sub.isNotBlank()) Text(sub, color = KColors.muted)
                    }
                }
            }
        }
        item { CallButtons(passport) }
        if (glance.isNotEmpty()) {
            item {
                KCard {
                    Text("Get to know $name in a minute", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
                    Text("Tap a card to flip it. Swipe for the next one.", color = KColors.muted, fontSize = 14.sp)
                    Flashcards(state.rules, glance)
                }
            }
        }
        item { Text("What's happening?", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold) }
        item { SituationGrid(state) { s -> if (s.emergency) state.go(Screen.Emergency()) else state.go(Screen.Ask(situation = s.id)) } }
        item {
            Row(verticalAlignment = Alignment.CenterVertically) {
                OutlinedTextField(value = question, onValueChange = { question = it.take(300) }, placeholder = { Text("Type what $name is doing…") }, modifier = Modifier.weight(1f), shape = RoundedCornerShape(16.dp), singleLine = true)
                Spacer(Modifier.width(8.dp))
                Button(onClick = { state.go(Screen.Ask(question = question.trim())) }, enabled = question.isNotBlank(), shape = RoundedCornerShape(14.dp), modifier = Modifier.heightIn(min = 54.dp)) { Text("Ask") }
            }
        }
        item {
            KCard {
                Text("Everything about $name", fontSize = 19.sp, fontWeight = FontWeight.ExtraBold)
                SectionTiles(state, passport, onlyFilled = true)
            }
        }
        item { BigButton("Emergency", onClick = { state.go(Screen.Emergency()) }, color = KColors.danger, icon = Icons.Outlined.ReportProblem) }
    }
}

// ---------------------------------------------------------------- paste / shared text

@Composable
fun PasteScreen(state: AppState, passport: Passport, initial: String, source: String) {
    val scope = rememberCoroutineScope()
    var notes by remember { mutableStateOf(initial) }
    var busy by remember { mutableStateOf(false) }
    var info by remember { mutableStateOf("") }
    val proposals = remember { mutableStateListOf<Entry>() }
    val name = passport.child.firstName

    Page("Paste a description", onBack = { state.back() }) {
        if (initial.isNotBlank()) {
            item { Surface(shape = RoundedCornerShape(16.dp), color = KColors.brandSoft) { Text("Text shared from ${source.ifBlank { "another app" }}. Tap Find the facts.", Modifier.padding(14.dp)) } }
        }
        item {
            KCard {
                Text("Paste a therapist's report, school notes or a message about $name. AI pulls out each fact in your own words, and you check every one.")
                OutlinedTextField(value = notes, onValueChange = { notes = it.take(20000) }, modifier = Modifier.fillMaxWidth(), minLines = 6, label = { Text("Notes about $name") })
                if (busy) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 3.dp)
                        Spacer(Modifier.width(10.dp))
                        Text("Finding the facts…", fontWeight = FontWeight.Bold)
                    }
                } else {
                    BigButton("Find the facts", enabled = notes.trim().length >= 40, icon = Icons.Outlined.AutoAwesome, onClick = {
                        busy = true; info = ""
                        scope.launch {
                            val result = runCatching { KnowMeAi.organize(state.rules, passport, notes, state.cloudAllowed()) }.getOrNull()
                            busy = false
                            if (result == null) {
                                info = "AI isn't available on this phone right now. Use the guided questions instead, or turn on cloud help in Settings."
                            } else {
                                proposals.addAll(result.first)
                                info = if (result.first.isEmpty()) "No clear facts found." else "Found ${result.first.size} things to check (${if (result.second == "on_device") "on this phone" else "in the cloud, names removed"})."
                            }
                        }
                    })
                }
                if (info.isNotBlank()) Text(info, color = KColors.muted)
            }
        }
        if (proposals.isNotEmpty()) {
            item {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Text("Check these (${proposals.size})", fontSize = 18.sp, fontWeight = FontWeight.ExtraBold, modifier = Modifier.weight(1f))
                    Button(onClick = {
                        val all = proposals.toList()
                        state.update { p -> p.copy(entries = p.entries + all) }
                        proposals.clear()
                        state.toast("Added ${all.size}")
                    }) { Text("Accept all") }
                }
            }
            items(proposals.toList(), key = { it.id }) { e ->
                EntryCard(state.rules, e) {
                    e.quote?.let { Text("From your words: “$it”", color = KColors.muted, fontSize = 13.sp) }
                    Row {
                        TextButton(onClick = { proposals.remove(e) }) { Text("Reject") }
                        Spacer(Modifier.weight(1f))
                        Button(onClick = { state.update { p -> p.copy(entries = p.entries + e) }; proposals.remove(e); state.toast("Added") }) { Text("Add") }
                    }
                }
            }
        }
    }
}
