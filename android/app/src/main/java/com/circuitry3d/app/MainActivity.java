package com.circuitry3d.app;

import androidx.core.view.WindowCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(android.os.Bundle savedInstanceState) {
        registerPlugin(BillingPlugin.class);
        super.onCreate(savedInstanceState);
        // Enable edge-to-edge so content draws behind system bars.
        // CSS env(safe-area-inset-*) variables will reflect the real inset sizes.
        WindowCompat.setDecorFitsSystemWindows(getWindow(), false);
    }
}
