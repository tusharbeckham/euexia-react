package com.euexia.app;

import android.Manifest;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import ee.forgr.capacitor.social.login.SocialLoginPlugin;

public class MainActivity extends BridgeActivity {

    private static final int PERM_REQ = 1001;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StepSensorPlugin.class);
        registerPlugin(AuthBridgePlugin.class);
        registerPlugin(SocialLoginPlugin.class);
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
            java.util.List<String> perms = new java.util.ArrayList<>();
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION) != PackageManager.PERMISSION_GRANTED) {
                perms.add(Manifest.permission.ACTIVITY_RECOGNITION);
            }
            if (Build.VERSION.SDK_INT >= 33) { // Build.VERSION_CODES.TIRAMISU
                if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
                    perms.add(Manifest.permission.POST_NOTIFICATIONS);
                }
            }
            if (!perms.isEmpty()) {
                ActivityCompat.requestPermissions(this, perms.toArray(new String[0]), PERM_REQ);
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
        if (req == PERM_REQ) {
            // Only start the foreground service if ACTIVITY_RECOGNITION was actually
            // granted. On targetSdk 34+, startForeground(..., FOREGROUND_SERVICE_TYPE_HEALTH)
            // throws a SecurityException and silently kills the service if this permission
            // isn't held — which looks like "steps frozen" with no visible crash to the user.
            // POST_NOTIFICATIONS can be missing without crashing the service (you just won't
            // see the persistent notification), so we don't gate on that one.
            boolean activityRecognitionGranted =
                ContextCompat.checkSelfPermission(this, Manifest.permission.ACTIVITY_RECOGNITION)
                    == PackageManager.PERMISSION_GRANTED;

            if (activityRecognitionGranted) {
                startStepService();
            }
            // If denied, we deliberately do NOT start the service — it would crash
            // immediately on startForeground(). The user needs to grant the permission
            // (re-launch the app, or enable it manually in Settings) before tracking works.
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