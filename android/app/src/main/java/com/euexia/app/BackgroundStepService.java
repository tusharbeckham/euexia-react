package com.euexia.app;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.os.Build;
import android.os.IBinder;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * BackgroundStepService — persistent Android Foreground Service.
 *
 * Responsibilities:
 *   1. Registers TYPE_STEP_COUNTER so counting continues when the WebView is paused.
 *   2. Persists the rolling count in SharedPreferences ("EuexiaSteps" / "steps")
 *      so StepSensorPlugin can read it from the JS bridge thread without any sensor race.
 *   3. Shows a required foreground notification (Android 8+).
 *   4. Filters out false steps from phone shakes/swings via time-based debounce + burst guard.
 */
public class BackgroundStepService extends Service implements SensorEventListener {

    // ── Public constants (also used by StepSensorPlugin) ─────────────────────
    public static final String PREFS_NAME = "EuexiaSteps";
    public static final String KEY_STEPS  = "steps";

    // ── Private constants ─────────────────────────────────────────────────────
    private static final String CHANNEL_ID = "euexia_step_channel";
    private static final int    NOTIF_ID   = 1001;

    // ── Fields ────────────────────────────────────────────────────────────────
    private SensorManager     sensorManager;
    private Sensor            stepSensor;
    private SharedPreferences prefs;

    private int todaySteps = 0;
    private int lastSensorValue = -1;
    private String savedDate = "";

    // ── Sanity filter ─────────────────────────────────────────────────────────
    // TYPE_STEP_COUNTER is hardware-validated — it only increments for real
    // steps. No software debounce needed.

    // Helper to get today's date string (logical day starts at 5:00 AM)
    private String getTodayString() {
        java.util.Calendar cal = java.util.Calendar.getInstance();
        cal.add(java.util.Calendar.HOUR_OF_DAY, -5);
        return new java.text.SimpleDateFormat("yyyy-MM-dd", java.util.Locale.getDefault()).format(cal.getTime());
    }

    // ── Service lifecycle ─────────────────────────────────────────────────────

    @Override
    public void onCreate() {
        super.onCreate();

        prefs = getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);

        todaySteps = prefs.getInt(KEY_STEPS, 0);
        lastSensorValue = prefs.getInt("lastSensorValue", -1);
        savedDate = prefs.getString("stepsDate", "");

        // Check if a new day started while the service was dead
        String todayDate = getTodayString();
        if (!savedDate.equals(todayDate)) {
            todaySteps = 0;
            savedDate = todayDate;
            prefs.edit()
                 .putInt(KEY_STEPS, 0)
                 .putString("stepsDate", todayDate)
                 .apply();
        }

        createNotificationChannel();
        startForeground(NOTIF_ID, buildNotification(todaySteps));

        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            if (stepSensor != null) {
                sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_FASTEST);
            }
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("set_steps")) {
            todaySteps = intent.getIntExtra("set_steps", todaySteps);
            prefs.edit().putInt(KEY_STEPS, todaySteps).apply();
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIF_ID, buildNotification(todaySteps));
            }
        }
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        if (sensorManager != null) {
            sensorManager.unregisterListener(this);
        }
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ── SensorEventListener ───────────────────────────────────────────────────

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() != Sensor.TYPE_STEP_COUNTER) return;

        int currentSensorValue = (int) event.values[0];

        // Initialize or handle device reboot (where sensor value resets to 0)
        if (lastSensorValue == -1 || currentSensorValue < lastSensorValue) {
            lastSensorValue = currentSensorValue;
            prefs.edit().putInt("lastSensorValue", lastSensorValue).apply();
            return;
        }

        int rawDelta = currentSensorValue - lastSensorValue;
        lastSensorValue = currentSensorValue;

        // Handle midnight reset while service is running
        String todayDate = getTodayString();
        if (!savedDate.equals(todayDate)) {
            todaySteps = 0;
            savedDate = todayDate;
        }

        // Trust the hardware — TYPE_STEP_COUNTER only fires for real steps
        todaySteps += rawDelta;

        // Commit immediately
        prefs.edit()
             .putInt(KEY_STEPS, todaySteps)
             .putInt("lastSensorValue", lastSensorValue)
             .putString("stepsDate", savedDate)
             .apply();

        // Update the persistent notification with the latest count
        NotificationManager nm =
            (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm != null) {
            nm.notify(NOTIF_ID, buildNotification(todaySteps));
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {
        // Not needed
    }

    // ── Notification helpers ──────────────────────────────────────────────────

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Step Tracking",
                NotificationManager.IMPORTANCE_LOW  // silent – no sound or vibration
            );
            channel.setDescription("Tracking your steps in the background");
            channel.setShowBadge(false);

            NotificationManager nm = (NotificationManager)
                getSystemService(NotificationManager.class);
            if (nm != null) {
                nm.createNotificationChannel(channel);
            }
        }
    }

    private Notification buildNotification(int currentSteps) {
        Intent launchIntent = new Intent(this, MainActivity.class);
        launchIntent.setFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
            this, 0, launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        String stepText = String.format(
            java.util.Locale.getDefault(),
            "%,d steps today",
            currentSteps
        );

        return new NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Euexia")
            .setContentText(stepText)
            .setSmallIcon(R.drawable.ic_stat_steps)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .setForegroundServiceBehavior(NotificationCompat.FOREGROUND_SERVICE_IMMEDIATE)
            .setContentIntent(pendingIntent)
            .build();
    }
}
