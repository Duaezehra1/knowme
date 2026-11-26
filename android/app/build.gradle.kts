import java.util.Properties

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.compose.compiler)
    alias(libs.plugins.kotlin.serialization)
    alias(libs.plugins.google.services)
}

// The judges' test APK carries one App Check debug token registered in the Firebase console,
// so cloud help works on any phone. It lives in local.properties, which is never committed.
val localProperties = Properties().apply {
    val file = rootProject.file("local.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val judgeAppCheckToken: String = localProperties.getProperty("knowme.judgeAppCheckToken", "").trim()

android {
    namespace = "app.knowme.passport"
    compileSdk = 37

    defaultConfig {
        applicationId = "app.knowme.passport"
        minSdk = 26
        targetSdk = 37
        versionCode = 1
        versionName = "0.1.0"
    }

    buildTypes {
        debug {
            buildConfigField("String", "JUDGE_APPCHECK_TOKEN", "\"$judgeAppCheckToken\"")
        }
        release {
            isMinifyEnabled = false
            buildConfigField("String", "JUDGE_APPCHECK_TOKEN", "\"\"")
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

// The web app and the Android app share one rules file: sections, situations,
// emergency phrases, synonyms and AI prompts.
val copySharedRules by tasks.registering(Copy::class) {
    from(rootProject.file("../shared/knowme.json"))
    into(layout.projectDirectory.dir("src/main/assets"))
}
tasks.named("preBuild") { dependsOn(copySharedRules) }

dependencies {
    implementation(platform(libs.compose.bom))
    implementation(libs.compose.ui)
    implementation(libs.compose.ui.graphics)
    implementation(libs.compose.ui.tooling.preview)
    implementation(libs.compose.foundation)
    implementation(libs.compose.material3)
    implementation(libs.compose.material.icons.extended)
    implementation(libs.activity.compose)
    debugImplementation(libs.compose.ui.tooling)

    implementation(platform(libs.firebase.bom))
    implementation(libs.firebase.ai)
    implementation(libs.firebase.ai.ondevice)
    implementation(libs.firebase.appcheck.debug)

    implementation(libs.kotlinx.serialization.json)
    implementation(libs.zxing.core)
}
