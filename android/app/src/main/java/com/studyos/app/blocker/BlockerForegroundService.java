package com.studyos.app.blocker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.app.usage.UsageEvents;
import android.app.usage.UsageStats;
import android.app.usage.UsageStatsManager;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;

import androidx.core.app.NotificationCompat;

import java.util.Calendar;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.concurrent.atomic.AtomicBoolean;

/** Foreground service that polls usage stats and enforces blocking rules. */
public class BlockerForegroundService extends Service {
    public static final String ACTION_START = "studyos.blocker.START";
    public static final String ACTION_STOP = "studyos.blocker.STOP";
    private static final String CHANNEL_ID = "studyos_blocker";
    private static final int NOTIF_ID = 1001;
    private static final long POLL_MS = 3000;
    private static final AtomicBoolean runningFlag = new AtomicBoolean(false);

    private final Handler handler = new Handler(Looper.getMainLooper());
    private final Runnable loop = new Runnable() {
        @Override
        public void run() {
            try {
                tick();
            } catch (Exception ignored) {
            }
            handler.postDelayed(this, POLL_MS);
        }
    };

    public static boolean isRunning(Context ctx) {
        return runningFlag.get();
    }

    @Override
    public void onCreate() {
        super.onCreate();
        createChannel();
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String action = intent != null ? intent.getAction() : null;
        if (ACTION_STOP.equals(action)) {
            handler.removeCallbacks(loop);
            runningFlag.set(false);
            stopForeground(true);
            stopSelf();
            return START_NOT_STICKY;
        }
        runningFlag.set(true);
        startForeground(NOTIF_ID, buildNotification());
        handler.removeCallbacks(loop);
        handler.post(loop);
        return START_STICKY;
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(loop);
        runningFlag.set(false);
        BlockOverlayManager.dismissAll();
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    private void createChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel ch = new NotificationChannel(CHANNEL_ID, "StudyOS Blocker",
                    NotificationManager.IMPORTANCE_LOW);
            ch.setDescription("Shows that StudyOS is tracking app usage for blocking");
            ch.setShowBadge(false);
            NotificationManager nm = getSystemService(NotificationManager.class);
            if (nm != null) nm.createNotificationChannel(ch);
        }
    }

    private void tick() {
        if (!BlockerEngine.getInstance(this).hasUsageAccess()) {
            // No permission yet: pause until granted (plugin restarts us on resume).
            stopForeground(true);
            stopSelf();
            runningFlag.set(false);
            return;
        }
        Map<String, Integer> fresh = readUsage();
        BlockerPrefs prefs = BlockerPrefs.get(this);
        Map<String, Integer> merged = new HashMap<>(prefs.getUsage());
        for (Map.Entry<String, Integer> e : fresh.entrySet()) merged.put(e.getKey(), e.getValue());
        prefs.setUsage(merged);
        BlockerEngine.getInstance(this).notifyUsage(merged);

        String fg = currentForegroundPackage();
        boolean focus = prefs.getFocusMode();
        String self = getPackageName();
        if (fg == null || fg.equals(self)) {
            BlockOverlayManager.dismiss();
            return;
        }

        boolean blocked = false;
        for (BlockerRule r : prefs.getRules()) {
            if (!r.enabled || !"app".equals(r.kind) || r.target == null) continue;
            if (!r.target.equalsIgnoreCase(fg)) continue;
            int used = merged.getOrDefault(fg, 0);
            boolean limitHit = r.dailyLimitMin == 0 || used >= r.dailyLimitMin * 60;
            boolean block = focus || limitHit;
            if (block) {
                blocked = true;
                String name = (r.name != null && !r.name.isEmpty()) ? r.name : fg;
                BlockerEngine.getInstance(this).notifyBlocked(
                        r.id == null ? "" : r.id,
                        name,
                        focus ? "focus" : "limit");
                BlockOverlayManager.show(getApplicationContext(), name);
            }
        }
        if (!blocked) BlockOverlayManager.dismiss();
    }

    private Map<String, Integer> readUsage() {
        Map<String, Integer> usage = new HashMap<>();
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return usage;
        UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return usage;

        Calendar c = Calendar.getInstance(TimeZone.getDefault());
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        long start = c.getTimeInMillis();
        long end = System.currentTimeMillis();

        List<UsageStats> stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, start, end);
        for (UsageStats s : stats) {
            long t = s.getTotalTimeInForeground();
            if (t > 0) usage.put(s.getPackageName(), (int) (t / 1000));
        }
        return usage;
    }

    private String currentForegroundPackage() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.LOLLIPOP) return null;
        UsageStatsManager usm = (UsageStatsManager) getSystemService(Context.USAGE_STATS_SERVICE);
        if (usm == null) return null;
        long end = System.currentTimeMillis();
        UsageEvents events = usm.queryEvents(end - 60000, end);
        UsageEvents.Event ev = new UsageEvents.Event();
        String lastFg = null;
        while (events.hasNextEvent()) {
            events.getNextEvent(ev);
            int type = ev.getEventType();
            boolean movedToForeground = type == UsageEvents.Event.MOVE_TO_FOREGROUND
                    || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                    && type == UsageEvents.Event.ACTIVITY_RESUMED);
            boolean movedToBackground = type == UsageEvents.Event.MOVE_TO_BACKGROUND
                    || type == UsageEvents.Event.ACTIVITY_STOPPED
                    || (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                    && type == UsageEvents.Event.ACTIVITY_PAUSED);
            if (movedToForeground) {
                lastFg = ev.getPackageName();
            } else if (movedToBackground) {
                if (ev.getPackageName().equals(lastFg)) lastFg = null;
            }
        }
        return lastFg;
    }

    private Notification buildNotification() {
        Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
        PendingIntent pi = PendingIntent.getActivity(this, 0, launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
        return new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("StudyOS Blocker")
                .setContentText("Tracking usage and enforcing focus rules")
                .setSmallIcon(android.R.drawable.ic_lock_lock)
                .setOngoing(true)
                .setContentIntent(pi)
                .build();
    }
}
