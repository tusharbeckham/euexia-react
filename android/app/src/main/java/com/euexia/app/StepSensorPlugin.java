package com.euexia.app;

import android.content.Context;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "StepSensor")
public class StepSensorPlugin extends Plugin implements SensorEventListener {

    private SensorManager sensorManager;
    private Sensor stepSensor;
    private int stepCount = 0;

    @Override
    public void load() {
        sensorManager = (SensorManager) getContext().getSystemService(
            Context.SENSOR_SERVICE
        );
        if (sensorManager != null) {
            stepSensor = sensorManager.getDefaultSensor(
                Sensor.TYPE_STEP_COUNTER
            );
            if (stepSensor != null) {
                sensorManager.registerListener(
                    this,
                    stepSensor,
                    SensorManager.SENSOR_DELAY_UI
                );
            }
        }
    }

    @PluginMethod
    public void getSteps(PluginCall call) {
        JSObject ret = new JSObject();
        ret.put("value", stepCount);
        call.resolve(ret);
    }

    @Override
    public void onSensorChanged(SensorEvent event) {
        if (event.sensor.getType() == Sensor.TYPE_STEP_COUNTER) {
            stepCount = (int) event.values[0];
        }
    }

    @Override
    public void onAccuracyChanged(Sensor sensor, int accuracy) {}
}
