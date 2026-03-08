# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ── Capacitor core ────────────────────────────────────────────────────────────
# Keep the plugin registry and all Capacitor plugin classes so the bridge
# can resolve them at runtime via reflection.
-keep class com.getcapacitor.** { *; }

# ── WebView JavaScript interface ──────────────────────────────────────────────
# Methods annotated with @JavascriptInterface must not be renamed or removed.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Preserve source-file/line-number attributes for crash deobfuscation ───────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
