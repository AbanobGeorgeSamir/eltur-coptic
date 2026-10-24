pluginManagement {
    val flutterSdkPath =
        run {
            val properties = java.util.Properties()
            file("local.properties").inputStream().use { properties.load(it) }
            val flutterSdkPath = properties.getProperty("flutter.sdk")
            require(flutterSdkPath != null) { "flutter.sdk not set in local.properties" }
            flutterSdkPath
        }

    includeBuild("$flutterSdkPath/packages/flutter_tools/gradle")

    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

plugins {
    id("dev.flutter.flutter-plugin-loader") version "1.0.0"
    id("com.android.application") version "9.4.0" apply false
    // Flutter 3.47 stable rejects AGP 9's bundled Kotlin 2.2.10 as too old.
    // Declare a supported KGP version without applying it; the app uses AGP's built-in Kotlin.
    // Remove this workaround when Flutter's version checker recognizes built-in Kotlin.
    id("org.jetbrains.kotlin.android") version "2.4.21" apply false
}

include(":app")
