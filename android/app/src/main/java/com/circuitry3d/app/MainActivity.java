package com.circuitry3d.app;

import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BillingPlugin.class);
        super.onCreate(savedInstanceState);
        
        // Optimize WebView for 3D graphics and touch interactions
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();
            
            // Enable hardware acceleration and GPU rendering
            webView.setLayerType(WebView.LAYER_TYPE_HARDWARE, null);
            
            // Optimize for 3D/WebGL content
            settings.setJavaScriptEnabled(true);
            settings.setDomStorageEnabled(true);
            settings.setDatabaseEnabled(true);
            settings.setMediaPlaybackRequiresUserGesture(false);
            
            // Improve touch responsiveness
            settings.setBuiltInZoomControls(false);
            settings.setDisplayZoomControls(false);
            settings.setSupportZoom(false);
            
            // Cache settings for better performance
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            // AppCache APIs were removed from modern WebView; rely on HTTP caching.
            
            // Enable viewport scaling for proper mobile layout
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);
        }
    }
}
