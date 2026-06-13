/**
 * ZotAssets high-level role operations.
 *
 * This is the API the UI (menu + dialog) calls. It ties together persistence
 * (RoleStore), PDF renaming (Rename) and the optional in-title role label, and
 * provides batch variants that aggregate success / skip / failure counts.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  // Matches a trailing " [SomeTag]" label added for in-title display.
  const TITLE_SUFFIX = /\s*\[[^\]]*\]\s*$/;
  // Matches a role label inserted before a PDF extension, e.g. "File [Main].pdf".
  const PDF_TITLE_SUFFIX = /\s*\[[^\]]*\](\.pdf)\s*$/i;

  function stripTitleRoleLabel(title) {
    return String(title || "")
      .replace(TITLE_SUFFIX, "")
      .replace(PDF_TITLE_SUFFIX, "$1");
  }

  function titleWithRoleLabel(title, tag) {
    const base = stripTitleRoleLabel(title) || "Attachment";
    if (/\.pdf$/i.test(base)) {
      return base.replace(/(\.pdf)$/i, " [" + tag + "]$1");
    }
    return base + " [" + tag + "]";
  }

  function attachmentDisplayName(item) {
    try {
      return item.getField("title") || item.attachmentFilename || ("#" + item.id);
    } catch (e) {
      try {
        return "#" + item.id;
      } catch (e2) {
        return "?";
      }
    }
  }

  const RoleManager = {
    attachmentDisplayName,

    /**
     * Apply the optional " [Tag]" label to the attachment title. Used for items
     * that were NOT renamed (non-PDFs, or PDFs whose rename was skipped/failed),
     * so the role is still visible in the UI.
     */
    async applyTitleDisplay(item, roleId) {
      try {
        if (!ZA.Prefs.getBool("showRoleInTitle")) return false;

        let title = "";
        try {
          title = item.getField("title") || "";
        } catch (e) {
          title = "";
        }
        if (!title) {
          try {
            title = item.attachmentFilename || "";
          } catch (e) {
            title = "";
          }
        }
        const parent = await ZA.Compat.getParentItem(item);
        const tag = ZA.Roles.filenameTag(roleId, parent);
        if (!tag) {
          const base = stripTitleRoleLabel(title);
          if (base && base !== title) {
            item.setField("title", base);
            await ZA.Compat.saveItem(item);
            return true;
          }
          return false;
        }
        item.setField("title", titleWithRoleLabel(title, tag));
        await ZA.Compat.saveItem(item);
        return true;
      } catch (e) {
        Log.warn("applyTitleDisplay failed", e);
        return false;
      }
    },

    /** Remove any trailing " [Tag]" label from the title. */
    async stripTitleDisplay(item) {
      try {
        let title = "";
        try {
          title = item.getField("title") || "";
        } catch (e) {
          return false;
        }
        const base = stripTitleRoleLabel(title);
        if (base && base !== title) {
          item.setField("title", base);
          await ZA.Compat.saveItem(item);
          return true;
        }
        return false;
      } catch (e) {
        Log.warn("stripTitleDisplay failed", e);
        return false;
      }
    },

    /**
     * Set (or change) the role of a single attachment.
     * @param {Object} [opts] { forceRename } — bypass the autoRenamePdf pref.
     * Returns: { status, reasonKey, oldName, newName, name }
     */
    async setRole(item, roleId, opts) {
      const options = opts || {};
      const name = attachmentDisplayName(item);
      try {
        if (!ZA.Roles.isValid(roleId)) {
          return { status: "failed", reasonKey: "result.failed.generic", name };
        }
        if (!ZA.Compat.isAttachment(item)) {
          return { status: "skipped", reasonKey: "result.skipped.notAttachment", name };
        }

        // 1) Persist the role first so it survives even if renaming fails.
        ZA.RoleStore.setRole(item, roleId);

        // 2) Try to rename PDFs (engine enforces all PDF/linked/auto rules).
        const renameResult = await ZA.Rename.renameForRole(item, roleId, {
          force: !!options.forceRename,
        });

        if (renameResult.status === "renamed") {
          // Title already updated to match the new file name; no extra label.
          return {
            status: "renamed",
            reasonKey: "result.renamed",
            oldName: renameResult.oldName,
            newName: renameResult.newName,
            name,
          };
        }

        // Not renamed (non-PDF or skipped/failed): apply the in-title label so
        // the role is still visible, then report.
        await this.applyTitleDisplay(item, roleId);

        if (renameResult.status === "failed") {
          return { status: "failed", reasonKey: renameResult.reasonKey, name };
        }
        // skipped -> role saved; surface the specific reason.
        return {
          status: "saved",
          reasonKey: renameResult.reasonKey || "result.roleSaved",
          name,
        };
      } catch (e) {
        Log.error("setRole failed", e);
        return { status: "failed", reasonKey: "result.failed.generic", name };
      }
    },

    /**
     * Clear the role of a single attachment.
     * @param {Object} [opts] { restoreFilename } — also rename the file back to
     *   the original name captured before the first rename (if available).
     */
    async clearRole(item, opts) {
      const options = opts || {};
      const name = attachmentDisplayName(item);
      try {
        if (!ZA.Compat.isAttachment(item)) {
          return { status: "skipped", reasonKey: "result.skipped.notAttachment", name };
        }
        ZA.RoleStore.clearRole(item);
        await this.stripTitleDisplay(item);

        if (options.restoreFilename) {
          const restore = await ZA.Rename.restoreOriginal(item);
          // Only surface a restore-specific outcome when it actually did/needed something.
          if (restore.status === "renamed") {
            return { status: "cleared", reasonKey: "result.cleared", name };
          }
          if (restore.status === "failed") {
            return { status: "failed", reasonKey: restore.reasonKey, name };
          }
        }
        return { status: "cleared", reasonKey: "result.cleared", name };
      } catch (e) {
        Log.error("clearRole failed", e);
        return { status: "failed", reasonKey: "result.failed.generic", name };
      }
    },

    /** Force a rename based on the attachment's currently stored role. */
    async renameByRole(item) {
      const name = attachmentDisplayName(item);
      try {
        const roleId = ZA.RoleStore.getRole(item);
        if (!roleId) {
          return { status: "skipped", reasonKey: "result.skipped.noRole", name };
        }
        const renameResult = await ZA.Rename.renameForRole(item, roleId, { force: true });
        renameResult.name = name;
        if (renameResult.status === "skipped") {
          // e.g. non-PDF: still ensure label is present.
          await this.applyTitleDisplay(item, roleId);
        }
        return renameResult;
      } catch (e) {
        Log.error("renameByRole failed", e);
        return { status: "failed", reasonKey: "result.failed.generic", name };
      }
    },

    // ---- Batch helpers -----------------------------------------------------
    _emptySummary() {
      return { succeeded: 0, skipped: 0, failed: 0, details: [] };
    },

    _tally(summary, result) {
      switch (result.status) {
        case "renamed":
        case "saved":
        case "cleared":
          summary.succeeded += 1;
          break;
        case "skipped":
          summary.skipped += 1;
          break;
        default:
          summary.failed += 1;
      }
      summary.details.push(result);
    },

    async setRoleBatch(items, roleId) {
      const summary = this._emptySummary();
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const res = await this.setRole(item, roleId);
        this._tally(summary, res);
      }
      return summary;
    },

    async clearRoleBatch(items, opts) {
      const summary = this._emptySummary();
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const res = await this.clearRole(item, opts);
        this._tally(summary, res);
      }
      return summary;
    },

    async renameByRoleBatch(items) {
      const summary = this._emptySummary();
      for (const item of items) {
        // eslint-disable-next-line no-await-in-loop
        const res = await this.renameByRole(item);
        this._tally(summary, res);
      }
      return summary;
    },
  };

  ZA.RoleManager = RoleManager;
})();
