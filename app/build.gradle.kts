plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

android {
    namespace = "com.ollfx.aimlab"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.ollfx.aimlab"
        minSdk = 23
        targetSdk = 28
        versionCode = 2
        versionName = "2.0"
    }

    sourceSets.getByName("main") {
        assets.srcDir("../web")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions { jvmTarget = "17" }
}
