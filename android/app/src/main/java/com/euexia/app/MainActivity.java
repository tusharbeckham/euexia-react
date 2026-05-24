package com.euexia.app;

import android.os.Bundle; // <-- Yeh naya import add karna zaroori hai
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(StepSensorPlugin.class); // <-- Tera native bridge yahan link hoga
        super.onCreate(savedInstanceState);
    }
}
