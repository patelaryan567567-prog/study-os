package com.studyos.app.blocker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;

/** Restarts the usage tracker after the device reboots (if rules are set). */
public class BootReceiver extends BroadcastReceiver {
    @Override
    public void onReceive(Context context, Intent intent) {
        if (intent == null) return;
        String action = intent.getAction();
        if (Intent.ACTION_BOOT_COMPLETED.equals(action)
                || Intent.ACTION_LOCKED_BOOT_COMPLETED.equals(action)) {
            try {
                BlockerEngine.getInstance(context).ensureService();
            } catch (Exception ignored) {
            }
        }
    }
}
