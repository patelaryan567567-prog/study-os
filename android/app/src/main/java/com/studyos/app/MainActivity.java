package com.studyos.app;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.studyos.app.blocker.AppBlockerPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppBlockerPlugin.class);
        super.onCreate(savedInstanceState);
    }

    /**
     * Android's system Back button is sent into the web app rather than
     * finishing the activity. The route handler closes a modal first, then
     * moves one page back; the first page requires a second press to exit.
     */
    @Override
    @SuppressWarnings("deprecation")
    public void onBackPressed() {
        if (getBridge() == null || getBridge().getWebView() == null) return;
        getBridge().getWebView().evaluateJavascript(
                "document.dispatchEvent(new Event('backbutton', { cancelable: true }));",
                null);
    }
}
