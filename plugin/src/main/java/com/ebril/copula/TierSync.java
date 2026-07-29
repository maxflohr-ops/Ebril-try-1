package com.ebril.copula;

import com.google.gson.JsonArray;
import com.google.gson.JsonObject;
import org.bukkit.Bukkit;
import org.bukkit.entity.Player;

import java.util.List;

/**
 * Translates a /me response into in-game state: runs the configured
 * on-tier-change console commands, and fires on-collectible-earned
 * commands exactly once per player per collectible.
 * <p>
 * Must be called on the main thread.
 */
public final class TierSync {

  private TierSync() { }

  public static void apply(CopulaPlugin plugin, Player player, JsonObject me) {
    if (me == null) return;

    // tier
    int sortOrder = 0;
    if (me.has("tier") && !me.get("tier").isJsonNull()) {
      JsonObject tier = me.getAsJsonObject("tier");
      if (tier.has("sortOrder")) sortOrder = tier.get("sortOrder").getAsInt();
    }
    String tierKey = switch (sortOrder) {
      case 3 -> "vip";
      case 2 -> "superfan";
      case 1 -> "fan";
      default -> "unranked";
    };
    List<String> tierCmds = plugin.getConfig().getStringList("on-tier-change." + tierKey);
    for (String raw : tierCmds) {
      String cmd = raw
        .replace("{player}", player.getName())
        .replace("{group}", "copula-" + tierKey);
      Bukkit.dispatchCommand(Bukkit.getConsoleSender(), cmd);
    }

    // collectibles — fire each config block exactly once per player.
    // store key is the bare collectible key for backwards-compatibility.
    applyOnce(plugin, player, me, "collectibles", "on-collectible-earned", k -> k);

    // season-pass rewards — same one-shot mechanic, but namespaced in storage
    // so a season reward and a collectible can share a key without colliding.
    applyOnce(plugin, player, me, "seasonRewards", "on-season-reward",
      k -> "season:" + k);
  }

  private static void applyOnce(CopulaPlugin plugin, Player player, JsonObject me,
                                String jsonField, String configPath,
                                java.util.function.Function<String, String> storeKeyFn) {
    if (!me.has(jsonField) || !me.get(jsonField).isJsonArray()) return;
    JsonArray arr = me.getAsJsonArray(jsonField);
    var store = plugin.collectibleStore();
    var alreadyApplied = store.get(player.getUniqueId());
    for (int i = 0; i < arr.size(); i++) {
      JsonObject c = arr.get(i).getAsJsonObject();
      if (!c.has("key")) continue;
      String key = c.get("key").getAsString();
      String storeKey = storeKeyFn.apply(key);
      if (alreadyApplied.contains(storeKey)) continue;
      List<String> cmds = plugin.getConfig().getStringList(configPath + "." + key);
      for (String raw : cmds) {
        String cmd = raw.replace("{player}", player.getName());
        Bukkit.dispatchCommand(Bukkit.getConsoleSender(), cmd);
      }
      store.add(player.getUniqueId(), storeKey);
    }
  }
}
