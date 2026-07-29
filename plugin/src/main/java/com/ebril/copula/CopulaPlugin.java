package com.ebril.copula;

import org.bukkit.configuration.file.FileConfiguration;
import org.bukkit.configuration.file.YamlConfiguration;
import org.bukkit.plugin.java.JavaPlugin;

import java.io.File;
import java.io.IOException;

public final class CopulaPlugin extends JavaPlugin {

  private ApiClient api;
  private CollectibleStore collectibleStore;
  private File appliedFile;
  private FileConfiguration applied;

  @Override
  public void onEnable() {
    saveDefaultConfig();
    FileConfiguration cfg = getConfig();

    String baseUrl = cfg.getString("copula.base-url", "").replaceAll("/+$", "");
    String secret = cfg.getString("copula.shared-secret", "");
    if (baseUrl.isBlank() || secret.isBlank() || "CHANGE-ME-32-HEX-CHARS".equals(secret)) {
      getLogger().severe("copula: base-url or shared-secret not configured. disabling plugin.");
      getServer().getPluginManager().disablePlugin(this);
      return;
    }

    this.api = new ApiClient(baseUrl, secret, getLogger());

    this.appliedFile = new File(getDataFolder(), "applied-collectibles.yml");
    if (!appliedFile.exists()) {
      try {
        getDataFolder().mkdirs();
        appliedFile.createNewFile();
      } catch (IOException e) {
        getLogger().warning("couldn't create applied-collectibles.yml: " + e.getMessage());
      }
    }
    this.applied = YamlConfiguration.loadConfiguration(appliedFile);
    this.collectibleStore = new CollectibleStore(applied, appliedFile, getLogger());

    getCommand("copula").setExecutor(new CommandCopula(this, api));
    getServer().getPluginManager().registerEvents(new LoginListener(this, api, collectibleStore), this);

    if (cfg.getBoolean("playtime.enabled", true)) {
      long minutes = Math.max(1, cfg.getLong("playtime.minutes-between-grants", 60));
      long ticks = minutes * 60L * 20L;
      new PlaytimeTask(this, api, cfg).runTaskTimer(this, ticks, ticks);
      getLogger().info("copula: playtime grants every " + minutes + " min.");
    }

    getLogger().info("copula: online. base-url=" + baseUrl);
  }

  @Override
  public void onDisable() {
    if (api != null) api.close();
  }

  public ApiClient api() { return api; }
  public CollectibleStore collectibleStore() { return collectibleStore; }
}
