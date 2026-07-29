package com.ebril.copula;

import net.md_5.bungee.api.ChatColor;
import org.bukkit.Bukkit;
import org.bukkit.command.Command;
import org.bukkit.command.CommandExecutor;
import org.bukkit.command.CommandSender;
import org.bukkit.entity.Player;

public final class CommandCopula implements CommandExecutor {

  private final CopulaPlugin plugin;
  private final ApiClient api;

  public CommandCopula(CopulaPlugin plugin, ApiClient api) {
    this.plugin = plugin;
    this.api = api;
  }

  @Override
  public boolean onCommand(CommandSender sender, Command cmd, String label, String[] args) {
    if (!(sender instanceof Player player)) {
      sender.sendMessage("copula commands are player-only.");
      return true;
    }
    if (args.length == 0) {
      usage(player);
      return true;
    }
    switch (args[0].toLowerCase()) {
      case "link" -> handleLink(player, args);
      case "sync" -> handleSync(player);
      case "balance" -> handleBalance(player);
      case "unlink" -> handleUnlink(player);
      default -> usage(player);
    }
    return true;
  }

  private void usage(Player p) {
    p.sendMessage(ChatColor.GOLD + "copula:");
    p.sendMessage(ChatColor.GRAY + " /copula link <code>  " + ChatColor.WHITE + "pair your minecraft account with copula");
    p.sendMessage(ChatColor.GRAY + " /copula sync         " + ChatColor.WHITE + "re-pull your tier + cassettes");
    p.sendMessage(ChatColor.GRAY + " /copula balance      " + ChatColor.WHITE + "show your copula points");
    p.sendMessage(ChatColor.GRAY + " /copula unlink       " + ChatColor.WHITE + "unpair on the server side");
  }

  private void handleLink(Player p, String[] args) {
    if (args.length < 2) {
      p.sendMessage(ChatColor.RED + "usage: /copula link <code>");
      return;
    }
    String code = args[1].toUpperCase();
    p.sendMessage(ChatColor.GRAY + "linking…");
    api.verify(code, p.getUniqueId(), p.getName()).thenAccept(res -> {
      Bukkit.getScheduler().runTask(plugin, () -> {
        if (res.ok()) {
          p.sendMessage(ChatColor.GREEN + "linked. loading your tier + cassettes…");
          runSync(p);
        } else {
          p.sendMessage(ChatColor.RED + "couldn't link: " + humanize(res.errorCode()));
        }
      });
    });
  }

  private void handleSync(Player p) {
    p.sendMessage(ChatColor.GRAY + "syncing…");
    runSync(p);
  }

  private void runSync(Player p) {
    api.fetchMe(p.getUniqueId()).thenAccept(res -> {
      Bukkit.getScheduler().runTask(plugin, () -> {
        if (res.networkError) {
          p.sendMessage(ChatColor.RED + "copula unreachable — try again in a minute.");
          return;
        }
        if (res.status == 404) {
          p.sendMessage(ChatColor.YELLOW + "your minecraft account isn't linked. use /copula link <code>.");
          return;
        }
        if (!res.ok()) {
          p.sendMessage(ChatColor.RED + "sync failed: " + humanize(res.errorCode()));
          return;
        }
        TierSync.apply(plugin, p, res.body);
        String tier = res.body.has("tier") && !res.body.get("tier").isJsonNull()
          ? res.body.getAsJsonObject("tier").get("name").getAsString().toLowerCase()
          : "unranked";
        int balance = res.body.has("balance") ? res.body.get("balance").getAsInt() : 0;
        p.sendMessage(ChatColor.GREEN + "synced. tier: " + ChatColor.GOLD + tier
          + ChatColor.GRAY + " · points: " + ChatColor.WHITE + balance);
      });
    });
  }

  private void handleBalance(Player p) {
    api.fetchMe(p.getUniqueId()).thenAccept(res -> {
      Bukkit.getScheduler().runTask(plugin, () -> {
        if (!res.ok()) {
          p.sendMessage(ChatColor.RED + "can't read balance: " + humanize(res.errorCode()));
          return;
        }
        int balance = res.body.has("balance") ? res.body.get("balance").getAsInt() : 0;
        p.sendMessage(ChatColor.GOLD + "copula points: " + ChatColor.WHITE + balance);
      });
    });
  }

  private void handleUnlink(Player p) {
    p.sendMessage(ChatColor.YELLOW
      + "to unlink, open your copula profile in the app and tap "
      + ChatColor.GRAY + "unlink" + ChatColor.YELLOW + ". that's the source of truth.");
  }

  private static String humanize(String code) {
    return switch (code) {
      case "unknown_code" -> "that code doesn't exist";
      case "code_expired" -> "that code expired — generate a new one in the app";
      case "code_already_used" -> "that code was already used";
      case "invalid_uuid" -> "invalid minecraft uuid";
      case "uuid_already_linked" -> "this minecraft account is already linked to a different copula user";
      case "not_linked" -> "your account isn't linked yet";
      case "network_error" -> "copula unreachable";
      default -> code;
    };
  }
}
