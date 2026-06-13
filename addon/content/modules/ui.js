/**
 * ZotAssets user-facing notifications.
 *
 * Uses Zotero's non-blocking progress window when available, falling back to a
 * modal alert. Never throws.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  const UI = {
    /** Brief, auto-closing toast-style message. */
    toast(headline, body, iconType) {
      try {
        if (Zotero.ProgressWindow) {
          const pw = new Zotero.ProgressWindow({ closeOnClick: true });
          pw.changeHeadline(headline || "ZotAssets");
          // ItemProgress(iconSrc, text); pass empty icon + the body text.
          const itemProgress = new pw.ItemProgress("", body || "");
          if (typeof itemProgress.setProgress === "function") {
            itemProgress.setProgress(100);
          }
          pw.show();
          pw.startCloseTimer(5000);
          return;
        }
      } catch (e) {
        Log.warn("toast failed; falling back to alert", e);
      }
      this.alert(headline, body);
    },

    /** Build and show a batch summary. */
    summary(summary) {
      const Strings = ZA.Strings;
      const headline = Strings.get("summary.title");
      const body = Strings.get("summary.done", {
        succeeded: summary.succeeded,
        skipped: summary.skipped,
        failed: summary.failed,
      });

      // If there were any non-success outcomes, show a detailed modal so the
      // user can read per-item reasons; otherwise a toast is enough.
      if (summary.failed > 0 || summary.skipped > 0) {
        const lines = [body, "", Strings.get("summary.detailsHeader")];
        for (const d of summary.details) {
          if (d.status === "renamed" || d.status === "saved" || d.status === "cleared") continue;
          const reason = Strings.get(d.reasonKey || "result.failed.generic");
          lines.push("• " + (d.name || "?") + " — " + reason);
        }
        this.alert(headline, lines.join("\n"));
      } else {
        this.toast(headline, body);
      }
    },

    alert(headline, body) {
      try {
        Services.prompt.alert(null, headline || "ZotAssets", body || "");
      } catch (e) {
        Log.error("alert failed", e, headline, body);
      }
    },
  };

  ZA.UI = UI;
})();
