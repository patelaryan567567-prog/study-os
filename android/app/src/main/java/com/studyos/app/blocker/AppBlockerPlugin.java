package com.studyos.app.blocker;

import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.pm.ResolveInfo;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@CapacitorPlugin(name = "AppBlocker")
public class AppBlockerPlugin extends Plugin {

    private static final int REQ_VPN = 9001;

    private PluginCall pendingPermCall;
    private PluginCall pendingVpnCall;

    @Override
    public void load() {
        super.load();
        BlockerEngine.getInstance(getContext()).bindPlugin(this);
    }

    @Override
    protected void handleOnResume() {
        if (pendingPermCall != null) {
            PluginCall call = pendingPermCall;
            pendingPermCall = null;
            call.resolve(statusResult());
        }
        // Restart tracking if permission is granted, so fresh settings apply now.
        BlockerEngine engine = BlockerEngine.getInstance(getContext());
        if (engine.hasUsageAccess()) engine.ensureService();
    }

    private boolean allGranted() {
        BlockerEngine e = BlockerEngine.getInstance(getContext());
        return e.hasUsageAccess() && e.hasOverlayPermission() && e.hasPostNotifications();
    }

    private JSObject statusResult() {
        BlockerEngine e = BlockerEngine.getInstance(getContext());
        JSObject o = new JSObject();
        o.put("platform", "android");
        o.put("nativeBlocking", true);
        o.put("permissionsGranted", allGranted());
        o.put("managementPermission", e.hasUsageAccess());
        o.put("overlayPermission", e.hasOverlayPermission());
        o.put("tracking", e.isServiceRunning());
        o.put("vpnRunning", BlockVpnService.isRunning(getContext()));

        JSObject usage = new JSObject();
        for (Map.Entry<String, Integer> en : BlockerPrefs.get(getContext()).getUsage().entrySet()) {
            usage.put(en.getKey(), en.getValue());
        }
        o.put("usage", usage);
        return o;
    }

    @PluginMethod
    public void getStatus(PluginCall call) {
        call.resolve(statusResult());
    }

    @PluginMethod
    public void listApps(PluginCall call) {
        JSArray out = new JSArray();
        try {
            Intent main = new Intent(Intent.ACTION_MAIN);
            main.addCategory(Intent.CATEGORY_LAUNCHER);
            PackageManager pm = getContext().getPackageManager();
            List<ResolveInfo> apps = pm.queryIntentActivities(main, 0);
            Set<String> seen = new HashSet<>();
            for (ResolveInfo ri : apps) {
                String pkg = ri.activityInfo != null ? ri.activityInfo.packageName : null;
                if (pkg == null || !seen.add(pkg)) continue;
                String label = ri.loadLabel(pm) != null ? ri.loadLabel(pm).toString() : pkg;
                JSObject o = new JSObject();
                o.put("process", pkg);
                o.put("name", label);
                out.put(o);
            }
        } catch (Exception ignored) {
        }
        JSObject ret = new JSObject();
        ret.put("apps", out);
        call.resolve(ret);
    }

    @PluginMethod
    public void setRules(PluginCall call) {
        JSArray arr = call.getArray("rules", new JSArray());
        List<BlockerRule> rules = BlockerRule.fromArray(arr);
        BlockerPrefs.get(getContext()).setRules(rules);
        BlockerEngine.getInstance(getContext()).ensureService();

        boolean needsVpn = false;
        for (BlockerRule r : rules) {
            if (r.enabled && "site".equals(r.kind) && r.target != null && !r.target.trim().isEmpty()) {
                needsVpn = true;
                break;
            }
        }
        if (needsVpn) {
            startVpn(call);
        } else {
            BlockVpnService.stop(getContext());
            call.resolve(new JSObject());
        }
    }

    @PluginMethod
    public void setFocusMode(PluginCall call) {
        boolean on = Boolean.TRUE.equals(call.getBoolean("on", false));
        BlockerPrefs.get(getContext()).setFocusMode(on);
        BlockerEngine.getInstance(getContext()).ensureService();
        call.resolve(new JSObject());
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        BlockerEngine e = BlockerEngine.getInstance(getContext());
        pendingPermCall = call;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && !e.hasPostNotifications()) {
            try {
                Intent intent = new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS)
                        .putExtra(Settings.EXTRA_APP_PACKAGE, getContext().getPackageName());
                getActivity().startActivity(intent);
            } catch (Exception ignored) {
            }
        }
        try {
            getActivity().startActivity(new Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS));
        } catch (Exception ignored) {
        }
        if (!e.hasOverlayPermission() && Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            try {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getContext().getPackageName()));
                getActivity().startActivity(intent);
            } catch (Exception ignored) {
            }
        }
        // Resolved in handleOnResume after the user returns from Settings.
    }

    private void startVpn(PluginCall call) {
        Intent prepare = BlockVpnService.prepare(getContext());
        if (prepare != null) {
            pendingVpnCall = call;
            startActivityForResult(call, prepare, REQ_VPN);
        } else {
            BlockVpnService.start(getContext());
            call.resolve(new JSObject());
        }
    }

    @Override
    protected void handleOnActivityResult(int requestCode, int resultCode, Intent data) {
        super.handleOnActivityResult(requestCode, resultCode, data);
        if (requestCode == REQ_VPN) {
            PluginCall call = pendingVpnCall;
            pendingVpnCall = null;
            if (call == null) return;
            if (resultCode == Activity.RESULT_OK) {
                BlockVpnService.start(getContext());
                call.resolve(new JSObject());
            } else {
                call.reject("VPN setup was cancelled.");
            }
        }
    }

    void emitUsage(Map<String, Integer> usage) {
        JSObject data = new JSObject();
        JSObject usageObj = new JSObject();
        for (Map.Entry<String, Integer> en : usage.entrySet()) usageObj.put(en.getKey(), en.getValue());
        data.put("usage", usageObj);
        notifyListeners("blocker:usage", data);
    }

    void emitBlocked(String ruleId, String name, String reason) {
        JSObject data = new JSObject();
        data.put("ruleId", ruleId == null ? "" : ruleId);
        data.put("name", name == null ? "" : name);
        data.put("reason", reason == null ? "limit" : reason);
        notifyListeners("blocker:blocked", data);
    }
}

