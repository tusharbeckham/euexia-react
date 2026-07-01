package com.euexia.app;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.content.SharedPreferences;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "AuthBridge")
public class AuthBridgePlugin extends Plugin {

    public static final String PREFS_NAME   = "EuexiaAuth";
    public static final String KEY_LOGGED_IN = "isLoggedIn";

    /** Call from JS after successful login */
    @PluginMethod
    public void notifyLoggedIn(PluginCall call) {
        Context ctx = getContext();
        ctx.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
           .edit().putBoolean(KEY_LOGGED_IN, true).apply();

        // getActivity() can be null (plugin invoked while the Activity is
        // detached / being recreated). instanceof is also false for null, so
        // this single check guards against both NPE and ClassCastException.
        android.app.Activity activity = getActivity();
        if (activity instanceof MainActivity) {
            ((MainActivity) activity).requestPermissionThenStart();
        }
        call.resolve();
    }

    /** Call from JS on logout */
    @PluginMethod
    public void notifyLoggedOut(PluginCall call) {
        getContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
           .edit().putBoolean(KEY_LOGGED_IN, false).apply();
        getContext().stopService(new Intent(getContext(), BackgroundStepService.class));
        call.resolve();
    }

    /** Call from JS to check if already logged in (skip auth screen) */
    @PluginMethod
    public void isLoggedIn(PluginCall call) {
        boolean val = getContext()
            .getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .getBoolean(KEY_LOGGED_IN, false);
        JSObject ret = new JSObject();
        ret.put("value", val);
        call.resolve(ret);
    }
}
