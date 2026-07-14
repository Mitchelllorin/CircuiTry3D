# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ── Capacitor core ──────────────────────────────────────────────────────────
# Keep all public Capacitor Plugin API so the JS bridge can call into native.
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keep @com.getcapacitor.annotation.PluginMethod class * { *; }
-keepclassmembers class * extends com.getcapacitor.Plugin {
    @com.getcapacitor.annotation.PluginMethod public *;
}

# ── WebView JavaScript interface ────────────────────────────────────────────
# If you ever add a @JavascriptInterface class, keep it here:
# -keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
# }

# ── AndroidX / support ──────────────────────────────────────────────────────
# AndroidX libraries ship their own consumer ProGuard rules, so no broad keep
# is needed here.  Suppress warnings for any unused AndroidX references.
-dontwarn androidx.**

# ── Preserve source-file names for crash reports ────────────────────────────
# Remove these two lines to further obfuscate the stack traces in production.
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
