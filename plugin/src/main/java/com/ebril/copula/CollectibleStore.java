package com.ebril.copula;

import org.bukkit.configuration.file.FileConfiguration;

import java.io.File;
import java.io.IOException;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.logging.Logger;

/**
 * Local record of which collectibles have already been applied per-player.
 * Backed by applied-collectibles.yml inside the plugin data folder so that
 * on-collectible-earned commands fire exactly once per player per collectible.
 */
public final class CollectibleStore {

  private final FileConfiguration cfg;
  private final File file;
  private final Logger log;

  public CollectibleStore(FileConfiguration cfg, File file, Logger log) {
    this.cfg = cfg;
    this.file = file;
    this.log = log;
  }

  public synchronized Set<String> get(UUID mcUuid) {
    List<String> list = cfg.getStringList(mcUuid.toString());
    return new HashSet<>(list);
  }

  public synchronized void add(UUID mcUuid, String key) {
    Set<String> current = get(mcUuid);
    if (current.add(key)) {
      cfg.set(mcUuid.toString(), current.stream().sorted().toList());
      save();
    }
  }

  private void save() {
    try {
      cfg.save(file);
    } catch (IOException e) {
      log.warning("copula: couldn't save applied-collectibles.yml: " + e.getMessage());
    }
  }
}
