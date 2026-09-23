package com.studyos.app.blocker;

import android.content.Context;
import android.content.Intent;
import android.graphics.Color;
import android.graphics.PixelFormat;
import android.graphics.Typeface;
import android.os.Build;
import android.provider.Settings;
import android.view.Gravity;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

/** Full-screen overlay shown over an offending app while it is blocked. */
public class BlockOverlayManager {
    private static View activeView;
    private static WindowManager wm;

    public static void show(Context ctx, String name) {
        if (!Settings.canDrawOverlays(ctx)) return;
        if (activeView != null) return; // already showing a block screen

        wm = (WindowManager) ctx.getSystemService(Context.WINDOW_SERVICE);
        if (wm == null) return;

        LinearLayout root = new LinearLayout(ctx);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setGravity(Gravity.CENTER);
        root.setBackgroundColor(0xF011111F);
        root.setPadding(40, 40, 40, 40);
        // This is a focusable system overlay, so Back cannot dismiss it and
        // touches never reach the app behind it.
        root.setFocusable(true);
        root.setFocusableInTouchMode(true);
        root.setOnKeyListener(new View.OnKeyListener() {
            @Override
            public boolean onKey(View v, int keyCode, KeyEvent event) {
                return keyCode == KeyEvent.KEYCODE_BACK;
            }
        });

        TextView title = new TextView(ctx);
        title.setText("Blocked");
        title.setTextColor(Color.WHITE);
        title.setTextSize(28);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setGravity(Gravity.CENTER);

        TextView msg = new TextView(ctx);
        msg.setText("\"" + (name == null ? "this app" : name) + "\" is blocked by StudyOS.\n"
                + "It unlocks when the daily limit resets or focus mode turns off.");
        msg.setTextColor(0xFFCCCCCC);
        msg.setTextSize(16);
        msg.setGravity(Gravity.CENTER);
        msg.setPadding(8, 24, 8, 32);

        Button open = new Button(ctx);
        open.setText("OPEN STUDYOS");
        open.setAllCaps(true);
        open.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                dismiss();
                try {
                    Intent i = ctx.getPackageManager().getLaunchIntentForPackage(ctx.getPackageName());
                    if (i != null) {
                        i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                        ctx.startActivity(i);
                    }
                } catch (Exception ignored) {
                }
            }
        });

        root.addView(title);
        root.addView(msg);
        root.addView(open);

        int type = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        WindowManager.LayoutParams params = new WindowManager.LayoutParams(
                WindowManager.LayoutParams.MATCH_PARENT,
                WindowManager.LayoutParams.MATCH_PARENT,
                type,
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
                        | WindowManager.LayoutParams.FLAG_LAYOUT_NO_LIMITS
                        | WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON,
                PixelFormat.TRANSLUCENT);
        params.gravity = Gravity.CENTER;

        try {
            wm.addView(root, params);
            activeView = root;
            root.requestFocus();
        } catch (Exception ignored) {
        }
    }

    public static void dismiss() {
        if (activeView != null && wm != null) {
            try {
                wm.removeView(activeView);
            } catch (Exception ignored) {
            }
            activeView = null;
        }
    }

    public static void dismissAll() {
        dismiss();
    }
}
