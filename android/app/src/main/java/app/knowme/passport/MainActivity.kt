package app.knowme.passport

import android.app.Application
import android.content.Context
import android.content.Intent
import android.content.pm.ApplicationInfo
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.BackHandler
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.Chat
import androidx.compose.material.icons.outlined.Home
import androidx.compose.material.icons.outlined.QrCode2
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.NavigationBarItemDefaults
import androidx.compose.material3.Scaffold
import androidx.compose.material3.SnackbarHost
import androidx.compose.material3.SnackbarHostState
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateListOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import com.google.firebase.Firebase
import com.google.firebase.FirebaseApp
import com.google.firebase.appcheck.appCheck
import com.google.firebase.appcheck.debug.DebugAppCheckProviderFactory

class KnowMeApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        FirebaseApp.initializeApp(this)
        // App Check (SE-01): debug builds use the debug provider; its token is printed to logcat
        // and registered in the Firebase console. Release builds would use Play Integrity.
        if (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE != 0) {
            Firebase.appCheck.installAppCheckProviderFactory(DebugAppCheckProviderFactory.getInstance())
        }
    }
}

sealed interface Screen {
    data object Home : Screen
    data class Guide(val section: String? = null) : Screen
    data class Section(val id: String) : Screen
    data class Ask(val situation: String? = null, val question: String? = null) : Screen
    data class Emergency(val said: String = "") : Screen
    data object Card : Screen
    data object Settings : Screen
    data class Paste(val text: String = "", val source: String = "") : Screen
}

/** All app state in one place. Every change is saved on the phone before the screen shows it. */
class AppState(private val context: Context) {
    val rules = Rules.load(context)
    val matcher = Matcher(rules)
    val store = Store(context)
    var passport by mutableStateOf(store.load())
    val stack = mutableStateListOf<Screen>(Screen.Home)
    var carerMode by mutableStateOf(false)
    var message by mutableStateOf<String?>(null)

    val current: Screen get() = stack.last()

    fun update(change: (Passport) -> Passport) {
        val p = passport ?: return
        passport = store.save(change(p))
    }

    fun go(screen: Screen) {
        stack.add(screen)
    }

    fun back(): Boolean {
        if (stack.size <= 1) return false
        stack.removeAt(stack.lastIndex)
        return true
    }

    fun tab(screen: Screen) {
        stack.clear()
        stack.add(Screen.Home)
        if (screen != Screen.Home) stack.add(screen)
    }

    fun toast(text: String) {
        message = text
    }

    fun online(): Boolean {
        val cm = context.getSystemService(ConnectivityManager::class.java) ?: return false
        val caps = cm.getNetworkCapabilities(cm.activeNetwork) ?: return false
        return caps.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    /** Cloud help only when the owner allowed it and the phone is online (FR-26). */
    fun cloudAllowed(): Boolean = passport?.settings?.cloudHelp == true && online()
}

class MainActivity : ComponentActivity() {
    private lateinit var state: AppState

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        state = AppState(applicationContext)
        handleShare(intent)
        setContent { KnowMeTheme { KnowMeApp(state) } }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        handleShare(intent)
    }

    /** Text shared from any app (a report, a WhatsApp message) opens the Paste screen. */
    private fun handleShare(intent: Intent?) {
        if (intent?.action != Intent.ACTION_SEND) return
        val text = intent.getStringExtra(Intent.EXTRA_TEXT)?.trim().orEmpty()
        if (text.isNotBlank()) state.go(Screen.Paste(text.take(20000), intent.getStringExtra(Intent.EXTRA_SUBJECT).orEmpty()))
    }
}

@Composable
fun KnowMeApp(state: AppState) {
    val passport = state.passport
    if (passport == null) {
        WelcomeScreen(state)
        return
    }
    val snackbar = remember { SnackbarHostState() }
    val message = state.message
    LaunchedEffect(message) {
        if (message != null) {
            snackbar.showSnackbar(message)
            state.message = null
        }
    }
    BackHandler(enabled = state.stack.size > 1) { state.back() }

    val screen = state.current
    val showNav = !state.carerMode
    Scaffold(
        containerColor = KColors.bg,
        snackbarHost = { SnackbarHost(snackbar) },
        bottomBar = {
            if (showNav) {
                NavigationBar(containerColor = KColors.surface) {
                    val items = listOf(
                        Triple(Screen.Home, Icons.Outlined.Home, "Passport"),
                        Triple(Screen.Ask(), Icons.AutoMirrored.Outlined.Chat, "Ask"),
                        Triple(Screen.Card, Icons.Outlined.QrCode2, "QR card"),
                        Triple(Screen.Settings, Icons.Outlined.Settings, "Settings"),
                    )
                    for ((target, icon, label) in items) {
                        val selected = when (target) {
                            is Screen.Ask -> screen is Screen.Ask
                            else -> screen == target
                        }
                        NavigationBarItem(
                            selected = selected,
                            onClick = { state.tab(target) },
                            icon = { Icon(icon, null) },
                            label = { Text(label) },
                            colors = NavigationBarItemDefaults.colors(selectedIconColor = KColors.brand, selectedTextColor = KColors.brand, indicatorColor = KColors.brandSoft),
                        )
                    }
                }
            }
        },
    ) { padding ->
        Box(Modifier.fillMaxSize().padding(padding)) {
            when (screen) {
                Screen.Home -> if (state.carerMode) CarerHomeScreen(state, passport) else HomeScreen(state, passport)
                is Screen.Guide -> if (state.carerMode) CarerHomeScreen(state, passport) else InterviewScreen(state, passport, screen.section)
                is Screen.Section -> SectionScreen(state, passport, screen.id)
                is Screen.Ask -> AskScreen(state, passport, screen.situation, screen.question)
                is Screen.Emergency -> EmergencyScreen(state, passport, screen.said)
                Screen.Card -> if (state.carerMode) CarerHomeScreen(state, passport) else CardScreen(state, passport)
                Screen.Settings -> if (state.carerMode) CarerHomeScreen(state, passport) else SettingsScreen(state, passport)
                is Screen.Paste -> if (state.carerMode) CarerHomeScreen(state, passport) else PasteScreen(state, passport, screen.text, screen.source)
            }
        }
    }
}
