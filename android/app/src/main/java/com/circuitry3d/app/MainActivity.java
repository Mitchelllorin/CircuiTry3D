package com.circuitry3d.app;

import androidx.activity.EdgeToEdge;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BillingPlugin.class);
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge after super.onCreate() so the Activity is fully
        // initialised. This is the recommended API for Android 15 (SDK 35) and
        // replaces the deprecated setStatusBarColor approach.
        // CSS env(safe-area-inset-*) variables will reflect the real inset sizes.
        EdgeToEdge.enable(this);
    }
}
