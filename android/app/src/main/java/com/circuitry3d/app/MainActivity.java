package com.circuitry3d.app;

import android.os.Bundle;
import android.view.View;
import android.webkit.WebSettings;
import android.webkit.WebView;
import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(BillingPlugin.class);
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge so content draws behind system bars.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);

        // Force hardware acceleration on the entire window
        getWindow().setFlags(
            android.view.WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED,
            android.view.WindowManager.LayoutParams.FLAG_HARDWARE_ACCELERATED
        );

        // Find the WebView and ensure hardware acceleration + WebGL
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            // Force hardware layer type (required for WebGL in some Android versions)
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            // Enable WebGL and DOM storage
            WebSettings settings = webView.getSettings();
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            // Allow mixed content (http inside https) for local iframe loading
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            // Enable WebView debugging (removable in production)
            WebView.setWebContentsDebuggingEnabled(true);
        }
    }
}
