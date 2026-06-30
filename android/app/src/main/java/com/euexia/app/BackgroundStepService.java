package com.euexia.app;

import android.app.AlarmManager;
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
import android.os.SystemClock;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

/**
 * BackgroundStepService — persistent Android Foreground Service.
 */
public class BackgroundStepService extends Service implements SensorEventListener {

    public static void logDebug(Context ctx, String msg) {
        SharedPreferences p = ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
        String old = p.getString("debug_logs", "");
        String date = new java.text.SimpleDateFormat("HH:mm:ss").format(new java.util.Date());
        String entry = date + " " + msg + "\n";
        String combined = entry + old;
        if (combined.length() > 2000) combined = combined.substring(0, 2000);
        p.edit().putString("debug_logs", combined).apply();
    }

    // ── Public constants (also used by StepSensorPlugin) ─────────────────────
    public static final String PREFS_NAME = "EuexiaSteps";
    public static final String KEY_STEPS  = "steps";

    // ── Private constants ─────────────────────────────────────────────────────
    private static final String TAG       = "EuexiaStepDebug";
    private static final String CHANNEL_ID = "euexia_step_channel";
    private static final int    NOTIF_ID   = 1001;

    // Minimum gap between notification redraws (ms). Storage is still updated
    // every single sensor event — this only throttles the UI/Binder call.
    private static final long NOTIFICATION_THROTTLE_MS = 1000L;

    // ── Fields ────────────────────────────────────────────────────────────────
    private SensorManager     sensorManager;
    private Sensor            stepSensor;
    private SharedPreferences prefs;

    private int todaySteps = 0;
    private int lastSensorValue = -1;
    private String savedDate = "";
    private long lastNotificationUpdateMs = 0L;

    // ── Sanity filter ─────────────────────────────────────────────────────────
    // TYPE_STEP_COUNTER is hardware-validated for normal walking deltas — no
    // software debounce needed there.

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
        
        logDebug(this, "onCreate: starting. todaySteps=" + todaySteps + ", lastSensor=" + lastSensorValue);

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

        // Guard against starting a HEALTH-typed foreground service without the
        // runtime permission it needs. This matters because onTaskRemoved()'s
        // AlarmManager restart calls this service directly, bypassing
        // MainActivity's permission check entirely — if ACTIVITY_RECOGNITION
        // was ever revoked (user setting, or Android's auto-revoke for unused
        // permissions), startForeground() below would throw a SecurityException
        // and silently kill the service, freezing the step count.
        boolean hasActivityRecognition =
            Build.VERSION.SDK_INT < Build.VERSION_CODES.Q
                || androidx.core.content.ContextCompat.checkSelfPermission(
                       this, android.Manifest.permission.ACTIVITY_RECOGNITION)
                   == android.content.pm.PackageManager.PERMISSION_GRANTED;

        if (Build.VERSION.SDK_INT >= 34 && !hasActivityRecognition) {
            logDebug(this, "onCreate: FATAL - ACTIVITY_RECOGNITION denied. Stopping.");
            stopSelf();
            return;
        }

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIF_ID, buildNotification(todaySteps), android.content.pm.ServiceInfo.FOREGROUND_SERVICE_TYPE_HEALTH);
        } else {
            startForeground(NOTIF_ID, buildNotification(todaySteps));
        }
        logDebug(this, "onCreate: startForeground called.");

        sensorManager = (SensorManager) getSystemService(Context.SENSOR_SERVICE);
        if (sensorManager != null) {
            stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_COUNTER);
            boolean registeredCounter = false;
            
            if (stepSensor != null) {
                registeredCounter = sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);
                logDebug(this, "onCreate: COUNTER registered=" + registeredCounter);
            } else {
                logDebug(this, "onCreate: COUNTER sensor is NULL on device.");
            }
            
            // If the counter sensor failed to register (common bug on some Xiaomi/MIUI devices
            // despite having permissions), fallback to the TYPE_STEP_DETECTOR sensor.
            if (!registeredCounter) {
                stepSensor = sensorManager.getDefaultSensor(Sensor.TYPE_STEP_DETECTOR);
                if (stepSensor != null) {
                    boolean registeredDetector = sensorManager.registerListener(this, stepSensor, SensorManager.SENSOR_DELAY_NORMAL);
                    logDebug(this, "onCreate: DETECTOR fallback registered=" + registeredDetector);
                } else {
                    logDebug(this, "onCreate: FATAL - both COUNTER and DETECTOR failed.");
                }
            }
        } else {
            logDebug(this, "onCreate: FATAL - sensorManager is NULL");
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && intent.hasExtra("set_steps")) {
            int newSteps = intent.getIntExtra("set_steps", todaySteps);
            logDebug(this, "onStartCommand: set_steps=" + newSteps);
            todaySteps = newSteps;
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

    /**
     * Defensive fallback for aggressive OEM battery-management layers (MIUI,
     * ColorOS, OneUI's "sleeping apps", etc.) that can still kill a foreground
     * service on task swipe even with android:stopWithTask="false" in the
     * manifest. Schedules an immediate restart via AlarmManager so the service
     * comes back up within seconds instead of staying dead until next app launch.
     *
     * This is a fallback only — on stock Android, stopWithTask="false" alone is
     * sufficient and this alarm will simply restart a service that never died.
     */
    @Override
    public void onTaskRemoved(Intent rootIntent) {
        super.onTaskRemoved(rootIntent);

        Intent restartIntent = new Intent(getApplicationContext(), BackgroundStepService.class);
        restartIntent.setPackage(getPackageName());

        PendingIntent restartPendingIntent = PendingIntent.getService(
            getApplicationContext(),
            1,
            restartIntent,
            PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = (AlarmManager) getSystemService(Context.ALARM_SERVICE);
        if (alarmManager != null) {
            alarmManager.set(
                AlarmManager.ELAPSED_REALTIME,
                SystemClock.elapsedRealtime() + 1000L,
                restartPendingIntent
            );
        }
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    // ── SensorEventListener ───────────────────────────────────────────────────

    @Override
    public void onSensorChanged(SensorEvent event) {
        int sensorType = event.sensor.getType();
        
        if (sensorType == Sensor.TYPE_STEP_COUNTER) {
            int currentSensorValue = (int) event.values[0];
            logDebug(this, "onSensorChanged(COUNTER): val=" + currentSensorValue + ", last=" + lastSensorValue + ", steps=" + todaySteps);

            // Initialize or handle device reboot
            if (lastSensorValue == -1 || currentSensorValue < lastSensorValue) {
                logDebug(this, "onSensorChanged(COUNTER): baseline reset. Saving last=" + currentSensorValue);
                lastSensorValue = currentSensorValue;
                prefs.edit().putInt("lastSensorValue", lastSensorValue).apply();
                return;
            }

            int rawDelta = currentSensorValue - lastSensorValue;
            lastSensorValue = currentSensorValue;

            String todayDate = getTodayString();
            if (!savedDate.equals(todayDate)) {
                todaySteps = 0;
                savedDate = todayDate;
            }

            todaySteps += rawDelta;

            prefs.edit()
                 .putInt(KEY_STEPS, todaySteps)
                 .putInt("lastSensorValue", lastSensorValue)
                 .putString("stepsDate", savedDate)
                 .apply();
                 
        } else if (sensorType == Sensor.TYPE_STEP_DETECTOR) {
            // DETECTOR fires once per step.
            logDebug(this, "onSensorChanged(DETECTOR): fired");
            
            String todayDate = getTodayString();
            if (!savedDate.equals(todayDate)) {
                todaySteps = 0;
                savedDate = todayDate;
            }

            todaySteps += 1;

            prefs.edit()
                 .putInt(KEY_STEPS, todaySteps)
                 .putString("stepsDate", savedDate)
                 .apply();
        } else {
            return; // Ignore other sensors
        }

        // Throttle notification updates
        long now = SystemClock.elapsedRealtime();
        if (now - lastNotificationUpdateMs >= NOTIFICATION_THROTTLE_MS) {
            lastNotificationUpdateMs = now;
            NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm != null) {
                nm.notify(NOTIF_ID, buildNotification(todaySteps));
            }
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