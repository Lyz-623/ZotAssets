/**
 * ZotAssets PDF rename engine.
 *
 * Renames a PDF attachment's physical file based on the configured template and
 * its parent item's metadata, then updates the attachment title to match.
 *
 * Hard rules implemented here:
 *   - Only PDFs are renamed; non-PDFs are never touched (caller still saves the
 *     role separately).
 *   - Linked files are only renamed if the user explicitly enabled it.
 *   - The original file name is captured once (for rollback/troubleshooting)
 *     before the first rename.
 *   - Target collisions get "__2", "__3", ... suffixes.
 *   - Every failure mode is reported, never thrown past the caller.
 *
 * Returns a normalized result:
 *   { status: "renamed"|"skipped"|"failed", reasonKey, oldName, newName }
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  function isPdf(item) {
    const Compat = ZA.Compat;
    const ct = (Compat.contentType(item) || "").toLowerCase();
    if (ct === "application/pdf") return true;
    // Fall back to extension sniffing if content type is missing/wrong.
    try {
      const fn = item.attachmentFilename || "";
      return /\.pdf$/i.test(fn);
    } catch (e) {
      return false;
    }
  }

  const Rename = {
    isPdf,

    /**
     * Rename `item`'s file for `roleId`. `force` bypasses the autoRenamePdf
     * preference (used by the explicit "Rename by role" command).
     */
    async renameForRole(item, roleId, opts) {
      const options = opts || {};
      const Compat = ZA.Compat;
      const Filename = ZA.Filename;
      const Roles = ZA.Roles;

      const result = { status: "skipped", reasonKey: "result.failed.generic", oldName: null, newName: null };

      try {
        if (!Compat.isFileAttachment(item)) {
          result.status = "skipped";
          result.reasonKey = "result.skipped.notAttachment";
          return result;
        }

        if (!isPdf(item)) {
          result.status = "skipped";
          result.reasonKey = "result.skipped.notPdf";
          return result;
        }

        // Respect the auto-rename preference unless forced.
        if (!options.force && !ZA.Prefs.getBool("autoRenamePdf")) {
          result.status = "skipped";
          result.reasonKey = "result.skipped.autoRenameOff";
          return result;
        }

        // Linked files only when explicitly enabled.
        if (Compat.isLinkedFileAttachment(item) && !ZA.Prefs.getBool("renameLinkedFiles")) {
          result.status = "skipped";
          result.reasonKey = "result.skipped.linkedFile";
          return result;
        }

        const parent = await Compat.getParentItem(item);
        if (!parent) {
          result.status = "failed";
          result.reasonKey = "result.failed.noParent";
          return result;
        }

        const path = await Compat.getFilePath(item);
        if (!path) {
          result.status = "failed";
          result.reasonKey = "result.failed.noFile";
          return result;
        }

        const exists = await Compat.fileExists(path);
        if (!exists) {
          result.status = "failed";
          result.reasonKey = "result.failed.missingFile";
          return result;
        }

        const oldLeaf = Compat.leafName(path);
        result.oldName = oldLeaf;

        // Capture the original file name exactly once before the first rename.
        ZA.RoleStore.rememberOriginalFilename(item, oldLeaf);

        const tag = Roles.tag(roleId) || "Other";
        const desired = Filename.render(ZA.Prefs.getString("filenameTemplate"), {
          firstAuthorLastName: Filename.firstAuthorLastName(parent),
          year: Filename.year(parent),
          parentTitle: Filename.parentTitle(parent),
          role: tag,
        });

        const dir = Compat.parentDir(path);
        if (!dir) {
          result.status = "failed";
          result.reasonKey = "result.failed.noFile";
          return result;
        }

        const uniqueLeaf = await Filename.ensureUnique(dir, desired, path);

        // No-op if the file already has the target name.
        if (uniqueLeaf === oldLeaf) {
          // Still make sure the title matches the file name.
          await this._setTitle(item, uniqueLeaf);
          result.status = "renamed";
          result.reasonKey = "result.renamed";
          result.newName = uniqueLeaf;
          return result;
        }

        const renameResult = await Compat.renameAttachmentFile(item, uniqueLeaf);
        if (!renameResult.ok) {
          Log.error("rename failed code", renameResult.code, "for", oldLeaf, "->", uniqueLeaf);
          result.status = "failed";
          result.reasonKey = "result.failed.rename";
          return result;
        }

        // Keep the attachment title in sync with the new file name.
        await this._setTitle(item, uniqueLeaf);

        result.status = "renamed";
        result.reasonKey = "result.renamed";
        result.newName = uniqueLeaf;
        return result;
      } catch (e) {
        Log.error("renameForRole threw", e);
        result.status = "failed";
        result.reasonKey = "result.failed.generic";
        return result;
      }
    },

    async _setTitle(item, title) {
      try {
        item.setField("title", title);
        await ZA.Compat.saveItem(item);
        return true;
      } catch (e) {
        Log.warn("_setTitle failed", e);
        return false;
      }
    },
  };

  ZA.Rename = Rename;
})();
