plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.ollfx.aimtrainer"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ollfx.aimtrainer"
        minSdk = 23
        targetSdk = 35
        versionCode = 1
        versionName = "1.0"
    }
}
