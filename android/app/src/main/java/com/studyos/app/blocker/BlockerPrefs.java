package com.studyos.app.blocker;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.text.SimpleDateFormat;
import java.util.ArrayList;
import java.util.Date;
import java.util.Iterator;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** SharedPreferences store for blocker rules, per-day usage and focus mode. */
public class BlockerPrefs {
    private static final String PREFS = "studyos_blocker";
    private static final String KEY_RULES = "rules";
    private static final String KEY_USAGE = "usage";
    private static final String KEY_USAGE_DATE = "usageDate";
    private static final String KEY_FOCUS = "focusMode";

    private final SharedPreferences prefs;
    private static BlockerPrefs instance;

    private BlockerPrefs(Context ctx) {
        prefs = ctx.getApplicationContext().getSharedPreferences(PREFS, Context.MODE_PRIVATE);
    }

    public static BlockerPrefs get(Context ctx) {
        if (instance == null) instance = new BlockerPrefs(ctx);
        return instance;
    }

    public List<BlockerRule> getRules() {
        List<BlockerRule> out = new ArrayList<>();
        try {
            JSONArray arr = new JSONArray(prefs.getString(KEY_RULES, "[]"));
            for (int i = 0; i < arr.length(); i++) {
                JSONObject o = arr.getJSONObject(i);
                BlockerRule r = new BlockerRule();
                r.id = o.optString("id");
                r.name = o.optString("name");
                r.kind = o.optString("kind", "app");
                r.target = o.optString("target");
                r.dailyLimitMin = o.optInt("dailyLimitMin", 30);
                r.enabled = o.optBoolean("enabled", true);
                r.strict = o.optBoolean("strict", false);
                out.add(r);
            }
        } catch (Exception ignored) {
        }
        return out;
    }

    public void setRules(List<BlockerRule> rules) {
        JSONArray arr = new JSONArray();
        try {
            for (BlockerRule r : rules) {
                JSONObject o = new JSONObject();
                o.put("id", r.id);
                o.put("name", r.name);
                o.put("kind", r.kind);
                o.put("target", r.target);
                o.put("dailyLimitMin", r.dailyLimitMin);
                o.put("enabled", r.enabled);
                o.put("strict", r.strict);
                arr.put(o);
            }
        } catch (Exception ignored) {
        }
        prefs.edit().putString(KEY_RULES, arr.toString()).apply();
    }

    /** Returns today's usage map (seconds per package). Resets at midnight. */
    public Map<String, Integer> getUsage() {
        Map<String, Integer> usage = new ConcurrentHashMap<>();
        if (!today().equals(prefs.getString(KEY_USAGE_DATE, ""))) return usage;
        try {
            JSONObject o = new JSONObject(prefs.getString(KEY_USAGE, "{}"));
            Iterator<String> it = o.keys();
            while (it.hasNext()) {
                String k = it.next();
                usage.put(k, o.optInt(k, 0));
            }
        } catch (Exception ignored) {
        }
        return usage;
    }

    public void setUsage(Map<String, Integer> usage) {
        JSONObject o = new JSONObject();
        try {
            for (Map.Entry<String, Integer> e : usage.entrySet()) o.put(e.getKey(), e.getValue());
        } catch (Exception ignored) {
        }
        prefs.edit()
                .putString(KEY_USAGE, o.toString())
                .putString(KEY_USAGE_DATE, today())
                .apply();
    }

    public boolean getFocusMode() {
        return prefs.getBoolean(KEY_FOCUS, false);
    }

    public void setFocusMode(boolean on) {
        prefs.edit().putBoolean(KEY_FOCUS, on).apply();
    }

    /** Domains of all enabled "site" rules, lowercased, for the DNS filter. */
    public static List<String> dnsDomains(Context ctx) {
        List<String> out = new ArrayList<>();
        for (BlockerRule r : get(ctx).getRules()) {
            if (r.enabled && "site".equals(r.kind) && r.target != null && !r.target.trim().isEmpty()) {
                out.add(r.target.trim().toLowerCase(Locale.US));
            }
        }
        return out;
    }

    private static String today() {
        return new SimpleDateFormat("yyyy-MM-dd", Locale.US).format(new Date());
    }
}
