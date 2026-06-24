package com.euexia.app;

import android.content.Intent;
import android.os.Build;
import android.os.Bundle;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StepSensorPlugin.class); // <-- Tera native bridge yahan link hoga
        super.onCreate(savedInstanceState);

        // Start the background step-counting foreground service.
        // Using startForegroundService on API 26+ as required by Android.
        Intent serviceIntent = new Intent(this, BackgroundStepService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(serviceIntent);
        } else {
            startService(serviceIntent);
        }
    }
}

