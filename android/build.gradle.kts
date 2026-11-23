// AGP 9 compiles Kotlin itself (built-in Kotlin). This pins the Kotlin Gradle plugin to the
// same version as the Compose compiler and serialization plugins.
buildscript {
    dependencies {
        classpath(libs.kotlin.gradle.plugin)
    }
}

plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.compose.compiler) apply false
    alias(libs.plugins.kotlin.serialization) apply false
    alias(libs.plugins.google.services) apply false
}
