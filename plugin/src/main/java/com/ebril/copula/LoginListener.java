package com.ebril.copula;

import net.md_5.bungee.api.ChatColor;
import org.bukkit.Bukkit;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.player.PlayerJoinEvent;

public final class LoginListener implements Listener {

  private final CopulaPlugin plugin;
  private final ApiClient api;
  private final CollectibleStore store;

  public LoginListener(CopulaPlugin plugin, ApiClient api, CollectibleStore store) {
    this.plugin = plugin;
    this.api = api;
    this.store = store;
  }

  @EventHandler
  public void onJoin(PlayerJoinEvent e) {
    var player = e.getPlayer();
    api.fetchMe(player.getUniqueId()).thenAccept(res -> {
      Bukkit.getScheduler().runTask(plugin, () -> {
        if (!player.isOnline()) return;
        if (res.status == 404) {
          player.sendMessage(ChatColor.GOLD + "copula: "
            + ChatColor.GRAY + "your account isn't linked. open ebril's app, tap "
            + ChatColor.WHITE + "link my minecraft account"
            + ChatColor.GRAY + ", then run "
            + ChatColor.WHITE + "/copula link <code>"
            + ChatColor.GRAY + " here.");
          return;
        }
        if (!res.ok()) {
          // silent on transient errors — don't spam the player
          return;
        }
        TierSync.apply(plugin, player, res.body);
      });
    });
  }
}
