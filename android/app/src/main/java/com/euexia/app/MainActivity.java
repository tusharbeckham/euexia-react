package com.euexia.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    private static final int PERM_REQ = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StepSensorPlugin.class);
        registerPlugin(AuthBridgePlugin.class);
        super.onCreate(savedInstanceState);

        // Only start service if user is already logged in (returning user)
        boolean isLoggedIn = getSharedPreferences(AuthBridgePlugin.PREFS_NAME, MODE_PRIVATE)
            .getBoolean(AuthBridgePlugin.KEY_LOGGED_IN, false);

        if (isLoggedIn) {
            requestPermissionThenStart();
        }
        // Fresh install: service starts only after JS calls notifyLoggedIn()
    }

    void requestPermissionThenStart() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION)
                    != PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                    new String[]{Manifest.permission.ACTIVITY_RECOGNITION}, PERM_REQ);
            } else {
                startStepService();
            }
        } else {
            startStepService();
        }
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] results) {
        super.onRequestPermissionsResult(req, perms, results);
        if (req == PERM_REQ && results.length > 0
                && results[0] == PackageManager.PERMISSION_GRANTED) {
            startStepService();
        }
    }

    private void startStepService() {
        Intent i = new Intent(this, BackgroundStepService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(i);
        } else {
            startService(i);
        }
    }
}
