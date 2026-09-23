package com.studyos.app.blocker;

import android.Manifest;
import android.app.AppOpsManager;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Process;
import android.provider.Settings;

import androidx.core.content.ContextCompat;

import java.util.Map;

/** App-wide coordinator: binds the Capacitor plugin and starts native services. */
public final class BlockerEngine {
    private static volatile BlockerEngine instance;
    private final Context app;
    private AppBlockerPlugin plugin;

    private BlockerEngine(Context ctx) {
        app = ctx.getApplicationContext();
    }

    public static BlockerEngine getInstance(Context ctx) {
        if (instance == null) {
            synchronized (BlockerEngine.class) {
                if (instance == null) instance = new BlockerEngine(ctx);
            }
        }
        return instance;
    }

    public void bindPlugin(AppBlockerPlugin p) {
        this.plugin = p;
    }

    public void unbindPlugin() {
        this.plugin = null;
    }

    public boolean hasUsageAccess() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            try {
                AppOpsManager appOps = (AppOpsManager) app.getSystemService(Context.APP_OPS_SERVICE);
                int mode = appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), app.getPackageName());
                return mode == AppOpsManager.MODE_ALLOWED;
            } catch (Exception ignored) {
            }
        }
        return true;
    }

    public boolean hasOverlayPermission() {
        return Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(app);
    }

    public boolean hasPostNotifications() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            return ContextCompat.checkSelfPermission(app, Manifest.permission.POST_NOTIFICATIONS)
                    == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    public boolean isServiceRunning() {
        return BlockerForegroundService.isRunning(app);
    }

    /** Starts (or restarts) the usage-tracking foreground service. */
    public void ensureService() {
        Intent i = new Intent(app, BlockerForegroundService.class);
        i.setAction(BlockerForegroundService.ACTION_START);
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                app.startForegroundService(i);
            } else {
                app.startService(i);
            }
        } catch (Exception ignored) {
        }
    }

    public void stopService() {
        try {
            app.startService(new Intent(app, BlockerForegroundService.class)
                    .setAction(BlockerForegroundService.ACTION_STOP));
        } catch (Exception ignored) {
        }
    }

    public void notifyUsage(Map<String, Integer> usage) {
        if (plugin != null) plugin.emitUsage(usage);
    }

    public void notifyBlocked(String ruleId, String name, String reason) {
        if (plugin != null) plugin.emitBlocked(ruleId, name, reason);
    }
}
