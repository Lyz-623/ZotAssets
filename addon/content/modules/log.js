/**
 * ZotAssets logging helper.
 *
 * Centralized, defensive logging so that no logging call can ever throw and
 * take down the rest of the plugin. Writes to Zotero's debug log and the
 * Browser/Error console.
 */
(function () {
  "use strict";

  const PREFIX = "[ZotAssets]";

  function safeString(args) {
    try {
      return args
        .map((a) => {
          if (a instanceof Error) {
            return (a.message || a.name || "Error") + (a.stack ? "\n" + a.stack : "");
          }
          if (typeof a === "object") {
            try {
              return JSON.stringify(a);
            } catch (e) {
              return String(a);
            }
          }
          return String(a);
        })
        .join(" ");
    } catch (e) {
      return "";
    }
  }

  const Log = {
    info(...args) {
      try {
        Zotero.debug(PREFIX + " " + safeString(args));
      } catch (e) {
        /* ignore */
      }
    },

    warn(...args) {
      try {
        Zotero.debug(PREFIX + " WARN " + safeString(args), 2);
      } catch (e) {
        /* ignore */
      }
    },

    error(...args) {
      const msg = PREFIX + " ERROR " + safeString(args);
      try {
        Zotero.debug(msg, 1);
      } catch (e) {
        /* ignore */
      }
      try {
        Components.utils.reportError(msg);
      } catch (e) {
        /* ignore */
      }
    },
  };

  Zotero.ZotAssets.Log = Log;
})();
