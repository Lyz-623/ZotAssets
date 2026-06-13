/**
 * ZotAssets settings manager.
 *
 * Single source of truth for plugin preferences. All settings live under the
 * "extensions.zotassets." branch. Defaults are defined here in code so the
 * plugin behaves correctly even if addon/prefs.js was not loaded by the host.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  const BRANCH = "extensions.zotassets.";

  const DEFAULTS = {
    autoRenamePdf: true,
    renameLinkedFiles: false,
    showRoleInTitle: true,
    filenameTemplate: "{firstAuthorLastName}_{year}_{parentTitle}__{role}.pdf",
    language: "auto", // "auto" | "en" | "zh"
    // Internal persistence blob (managed by RoleStore). Default empty object.
    roleData: "{}",
  };

  const Prefs = {
    BRANCH,
    DEFAULTS,

    fullKey(key) {
      return BRANCH + key;
    },

    get(key) {
      const fullKey = BRANCH + key;
      try {
        const val = Zotero.Prefs.get(fullKey, true);
        if (val === undefined || val === null) {
          return DEFAULTS[key];
        }
        return val;
      } catch (e) {
        Log.warn("Prefs.get failed for", key, e);
        return DEFAULTS[key];
      }
    },

    set(key, value) {
      const fullKey = BRANCH + key;
      try {
        Zotero.Prefs.set(fullKey, value, true);
        return true;
      } catch (e) {
        Log.error("Prefs.set failed for", key, e);
        return false;
      }
    },

    getBool(key) {
      return this.get(key) === true || this.get(key) === "true";
    },

    getString(key) {
      const v = this.get(key);
      return v === undefined || v === null ? "" : String(v);
    },

    /** Ensure all defaults exist as real prefs (optional convenience). */
    ensureDefaults() {
      for (const key of Object.keys(DEFAULTS)) {
        try {
          const fullKey = BRANCH + key;
          const existing = Zotero.Prefs.get(fullKey, true);
          if (existing === undefined || existing === null) {
            Zotero.Prefs.set(fullKey, DEFAULTS[key], true);
          }
        } catch (e) {
          Log.warn("ensureDefaults failed for", key, e);
        }
      }
    },
  };

  ZA.Prefs = Prefs;
})();
