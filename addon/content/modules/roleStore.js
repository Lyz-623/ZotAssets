/**
 * ZotAssets role persistence.
 *
 * Stores the asset role (and the original file name captured before the first
 * rename) for each attachment item. Data is kept in a single JSON pref
 * ("extensions.zotassets.roleData"), keyed by "<libraryID>:<itemKey>".
 *
 * Why a pref blob instead of tags/notes/relations?
 *   - It is bound to the item via its stable key but does NOT touch the
 *     attachment's stored path, note, or tags (a hard requirement).
 *   - It survives Zotero restarts.
 *   - It is trivially backup-/inspect-able via the Config Editor.
 *
 * Entry shape:
 *   {
 *     role: "<roleId>" | null,
 *     originalFilename: "<name.ext>" | null,
 *     updatedAt: "<ISO timestamp>"
 *   }
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  function loadAll() {
    try {
      const raw = ZA.Prefs.getString("roleData") || "{}";
      const obj = JSON.parse(raw);
      return obj && typeof obj === "object" ? obj : {};
    } catch (e) {
      Log.error("roleData parse failed; resetting to empty", e);
      return {};
    }
  }

  function saveAll(obj) {
    try {
      ZA.Prefs.set("roleData", JSON.stringify(obj));
      return true;
    } catch (e) {
      Log.error("roleData save failed", e);
      return false;
    }
  }

  function keyFor(item) {
    try {
      const libraryID = item.libraryID;
      const itemKey = item.key;
      if (libraryID === undefined || !itemKey) return null;
      return libraryID + ":" + itemKey;
    } catch (e) {
      return null;
    }
  }

  const RoleStore = {
    keyFor,

    getEntry(item) {
      const key = keyFor(item);
      if (!key) return null;
      const all = loadAll();
      return all[key] || null;
    },

    getRole(item) {
      const entry = this.getEntry(item);
      return entry && entry.role ? entry.role : null;
    },

    setRole(item, roleId) {
      const key = keyFor(item);
      if (!key) {
        Log.warn("setRole: no key for item");
        return false;
      }
      const all = loadAll();
      const prev = all[key] || {};
      all[key] = {
        role: roleId,
        originalFilename: prev.originalFilename || null,
        updatedAt: new Date().toISOString(),
      };
      return saveAll(all);
    },

    clearRole(item) {
      const key = keyFor(item);
      if (!key) return false;
      const all = loadAll();
      if (!all[key]) return true;
      // Keep originalFilename for potential rollback/troubleshooting; drop role.
      all[key].role = null;
      all[key].updatedAt = new Date().toISOString();
      return saveAll(all);
    },

    getOriginalFilename(item) {
      const entry = this.getEntry(item);
      return entry && entry.originalFilename ? entry.originalFilename : null;
    },

    /** Save the original file name once (never overwritten). */
    rememberOriginalFilename(item, filename) {
      const key = keyFor(item);
      if (!key || !filename) return false;
      const all = loadAll();
      const prev = all[key] || {};
      if (prev.originalFilename) {
        return true; // already captured; do not overwrite
      }
      all[key] = {
        role: prev.role || null,
        originalFilename: filename,
        updatedAt: new Date().toISOString(),
      };
      return saveAll(all);
    },
  };

  ZA.RoleStore = RoleStore;
})();
