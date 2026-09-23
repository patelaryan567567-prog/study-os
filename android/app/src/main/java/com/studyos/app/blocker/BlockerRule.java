package com.studyos.app.blocker;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;

import java.util.ArrayList;
import java.util.List;

/** A single blocking rule (an app package or a website domain). */
public class BlockerRule {
    public String id;
    public String name;
    public String kind;        // "app" | "site"
    public String target;      // package name or domain
    public int dailyLimitMin;  // 0 = block completely
    public boolean enabled;
    public boolean strict;

    public static List<BlockerRule> fromArray(JSArray array) {
        List<BlockerRule> rules = new ArrayList<>();
        if (array == null) return rules;
        try {
            for (int i = 0; i < array.length(); i++) {
                org.json.JSONObject jsonObj = array.getJSONObject(i);
                if (jsonObj == null) continue;
                BlockerRule r = new BlockerRule();
                r.id = jsonObj.optString("id");
                r.name = jsonObj.optString("name", "");
                r.kind = jsonObj.optString("kind", "app");
                r.target = jsonObj.optString("target", "");
                r.dailyLimitMin = jsonObj.optInt("dailyLimitMin", 30);
                r.enabled = jsonObj.optBoolean("enabled", true);
                r.strict = jsonObj.optBoolean("strict", false);
                rules.add(r);
            }
        } catch (Exception ignored) {
        }
        return rules;
    }
}
