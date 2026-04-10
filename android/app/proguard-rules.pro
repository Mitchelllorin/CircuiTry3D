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

# ── App-specific Capacitor plugins ────────────────────────────────────────────
# BillingPlugin (and any future plugins in this package) are resolved by the
# Capacitor bridge via reflection using @CapacitorPlugin(name) and @PluginMethod
# annotations.  Without this rule, R8/ProGuard renames or removes the annotated
# methods, causing a NoSuchMethodException at runtime and crashing the bridge on
# cold start before the WebView has a chance to render.
-keep class com.circuitry3d.app.** { *; }

# Keep all annotations on Capacitor plugin classes so the bridge can read
# @CapacitorPlugin(name) to map JavaScript plugin names to Java classes and
# @PluginMethod to find callable methods.
-keepattributes *Annotation*

# ── WebView JavaScript interface ──────────────────────────────────────────────
# Methods annotated with @JavascriptInterface must not be renamed or removed.
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# ── Preserve source-file/line-number attributes for crash deobfuscation ───────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
