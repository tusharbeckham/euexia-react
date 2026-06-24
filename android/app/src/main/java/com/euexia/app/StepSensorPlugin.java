package com.euexia.app;

import android.content.Context;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

/**
 * StepSensorPlugin — Capacitor bridge method that returns the current step count.
 *
 * The sensor listener now lives inside BackgroundStepService, which writes
 * the step count to SharedPreferences on every sensor event. This plugin
 * simply reads that value and resolves the JS call, so the bridge is
 * completely decoupled from sensor lifecycle and works correctly whether the
 * WebView is in the foreground or just resumed from background.
 */
@CapacitorPlugin(name = "StepSensor")
public class StepSensorPlugin extends Plugin {

    @PluginMethod
    public void getSteps(PluginCall call) {
        SharedPreferences prefs = getContext().getSharedPreferences(
            BackgroundStepService.PREFS_NAME,
            Context.MODE_PRIVATE
        );
        int steps = prefs.getInt(BackgroundStepService.KEY_STEPS, 0);

        JSObject ret = new JSObject();
        ret.put("value", steps);
        call.resolve(ret);
    }
}

