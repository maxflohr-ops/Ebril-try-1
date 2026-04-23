package com.ebril.copula;

import net.md_5.bungee.api.ChatColor;
import org.bukkit.Bukkit;
import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.entity.Player;
import org.bukkit.scheduler.BukkitRunnable;

import java.time.ZoneOffset;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

/**
 * Scheduled grant of playtime points. Runs every
 * playtime.minutes-between-grants minutes and credits every online player
 * with a linked copula account. refId uses the current UTC hour, so
 * re-running at the same hour is a no-op on the backend.
 */
public final class PlaytimeTask extends BukkitRunnable {

  private static final DateTimeFormatter HOUR_KEY =
    DateTimeFormatter.ofPattern("yyyyMMddHH");

  private final CopulaPlugin plugin;
  private final ApiClient api;
  private final int points;
  private final boolean notify;

  public PlaytimeTask(CopulaPlugin plugin, ApiClient api, FileConfiguration cfg) {
    this.plugin = plugin;
    this.api = api;
    this.points = Math.max(1, cfg.getInt("playtime.points-per-grant", 5));
    this.notify = cfg.getBoolean("playtime.notify-player", false);
  }

  @Override
  public void run() {
    String hour = ZonedDateTime.now(ZoneOffset.UTC).format(HOUR_KEY);
    for (Player p : Bukkit.getOnlinePlayers()) {
      String key = "playtime:" + p.getUniqueId() + ":" + hour;
      api.grant(p.getUniqueId(), points, "active playtime on the dusk server", key, notify)
        .thenAccept(res -> {
          if (!res.ok()) return;
          if (!notify) return;
          // Only surface the in-chat nudge on first credit for this hour.
          if (res.body != null && res.body.has("idempotent")
              && !res.body.get("idempotent").getAsBoolean()) {
            Bukkit.getScheduler().runTask(plugin, () ->
              p.sendMessage(ChatColor.GOLD + "+" + points
                + ChatColor.GRAY + " copula points for playtime."));
          }
        });
    }
  }
}
