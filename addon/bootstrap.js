/* eslint-disable no-unused-vars */
/**
 * ZotAssets bootstrap entry point.
 *
 * This file intentionally stays thin: it only wires Zotero's bootstrapped
 * lifecycle (install/startup/shutdown/uninstall + main window hooks) to the
 * real implementation that lives in content/zotassets.js and content/modules/*.
 *
 * Zotero 7+ bootstrapped architecture only. No Zotero 6 overlay mechanism.
 */

var ZotAssetsBootstrap = { initialized: false };

/**
 * Load the main implementation into this bootstrap scope. Every module attaches
 * itself to Zotero.ZotAssets and shares the globals available here (Zotero,
 * Services, ChromeUtils, Components, IOUtils/OS, ...).
 */
function loadMainScript(rootURI) {
  Services.scriptloader.loadSubScript(rootURI + "content/zotassets.js");
}

async function install(data, reason) {
  // Nothing to do on install; defaults are resolved lazily by the Prefs module.
}

async function startup({ id, version, rootURI }, reason) {
  try {
    // Make sure Zotero is fully initialized before we touch its API.
    if (typeof Zotero === "undefined" || !Zotero.initializationPromise) {
      // Extremely old/unexpected host; bail out quietly.
      // eslint-disable-next-line no-console
      Components.utils.reportError("[ZotAssets] Zotero global not available; aborting startup.");
      return;
    }
    await Zotero.initializationPromise;

    loadMainScript(rootURI);

    if (!Zotero.ZotAssets) {
      Components.utils.reportError("[ZotAssets] Main script did not register Zotero.ZotAssets.");
      return;
    }

    await Zotero.ZotAssets.init({ id, version, rootURI });
    Zotero.ZotAssets.addToAllWindows();
    ZotAssetsBootstrap.initialized = true;
  } catch (e) {
    Components.utils.reportError("[ZotAssets] startup failed: " + (e && e.message ? e.message : e));
    Components.utils.reportError(e);
  }
}

function onMainWindowLoad({ window }) {
  try {
    if (Zotero && Zotero.ZotAssets) {
      Zotero.ZotAssets.addToWindow(window);
    }
  } catch (e) {
    Components.utils.reportError("[ZotAssets] onMainWindowLoad failed: " + e);
  }
}

function onMainWindowUnload({ window }) {
  try {
    if (Zotero && Zotero.ZotAssets) {
      Zotero.ZotAssets.removeFromWindow(window);
    }
  } catch (e) {
    Components.utils.reportError("[ZotAssets] onMainWindowUnload failed: " + e);
  }
}

function shutdown({ id, version, rootURI }, reason) {
  try {
    if (Zotero && Zotero.ZotAssets) {
      Zotero.ZotAssets.removeFromAllWindows();
      if (typeof Zotero.ZotAssets.shutdown === "function") {
        Zotero.ZotAssets.shutdown();
      }
      Zotero.ZotAssets = undefined;
    }
  } catch (e) {
    Components.utils.reportError("[ZotAssets] shutdown failed: " + e);
  }
  ZotAssetsBootstrap.initialized = false;
}

async function uninstall(data, reason) {
  // Persisted role data is intentionally left in prefs so a re-install can
  // recover it. Users can clear it manually via Zotero's config editor key
  // "extensions.zotassets.roleData" if desired.
}
