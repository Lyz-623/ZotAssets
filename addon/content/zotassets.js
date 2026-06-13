/**
 * ZotAssets main entry / orchestrator.
 *
 * Loaded by bootstrap.js into the bootstrap scope (where Zotero, Services,
 * Components, ChromeUtils, and IOUtils/OS are available as globals). It:
 *   1. Creates the Zotero.ZotAssets namespace.
 *   2. Loads every module (each attaches itself to Zotero.ZotAssets).
 *   3. Manages adding/removing the UI to/from each main window.
 *
 * Keeping orchestration here (and logic in content/modules/*) satisfies the
 * "don't dump everything in bootstrap.js" requirement.
 */
(function () {
  "use strict";

  // Create namespace early so modules can attach to it.
  if (!Zotero.ZotAssets) {
    Zotero.ZotAssets = {};
  }
  const ZA = Zotero.ZotAssets;

  // Module load order matters: dependencies first.
  const MODULES = [
    "log.js",
    "prefs.js",
    "strings.js",
    "compat.js",
    "roles.js",
    "roleStore.js",
    "filename.js",
    "rename.js",
    "roleManager.js",
    "classifier.js",
    "autoClassify.js",
    "ui.js",
    "dialog.js",
    "menu.js",
  ];

  ZA.loadModules = function (rootURI) {
    for (const mod of MODULES) {
      try {
        Services.scriptloader.loadSubScript(rootURI + "content/modules/" + mod);
      } catch (e) {
        // Use reportError directly; Log may be the very module that failed.
        Components.utils.reportError("[ZotAssets] failed loading module " + mod + ": " + e);
        throw e;
      }
    }
  };

  ZA.init = async function ({ id, version, rootURI }) {
    this.id = id;
    this.version = version;
    this.rootURI = rootURI;
    this.initialized = false;

    this.loadModules(rootURI);

    // Resolve effective language now that Prefs + Strings exist.
    try {
      this.Strings.resolve();
    } catch (e) {
      Components.utils.reportError("[ZotAssets] Strings.resolve failed: " + e);
    }

    // Make defaults concrete so the Config Editor shows them.
    try {
      this.Prefs.ensureDefaults();
    } catch (e) {
      /* non-fatal */
    }

    this.initialized = true;
    this.Log.info("initialized version", version, "rootURI", rootURI);
  };

  /** Iterate Zotero's main windows. */
  ZA.getMainWindows = function () {
    const wins = [];
    try {
      if (typeof Zotero.getMainWindows === "function") {
        return Zotero.getMainWindows() || [];
      }
    } catch (e) {
      /* fall through */
    }
    try {
      const e = Services.wm.getEnumerator("navigator:browser");
      while (e.hasMoreElements()) {
        wins.push(e.getNext());
      }
    } catch (e) {
      /* ignore */
    }
    return wins;
  };

  ZA.addToWindow = function (win) {
    try {
      if (!win || !win.ZoteroPane) return;
      this.Strings.resolve();
      this.Menu.addToWindow(win);
    } catch (e) {
      this.Log ? this.Log.error("addToWindow failed", e) : Components.utils.reportError(e);
    }
  };

  ZA.removeFromWindow = function (win) {
    try {
      if (this.Menu) this.Menu.removeFromWindow(win);
    } catch (e) {
      this.Log ? this.Log.error("removeFromWindow failed", e) : Components.utils.reportError(e);
    }
  };

  ZA.addToAllWindows = function () {
    for (const win of this.getMainWindows()) {
      this.addToWindow(win);
    }
  };

  ZA.removeFromAllWindows = function () {
    for (const win of this.getMainWindows()) {
      this.removeFromWindow(win);
    }
  };

  ZA.shutdown = function () {
    this.initialized = false;
    if (this.Log) this.Log.info("shutdown complete");
  };
})();
