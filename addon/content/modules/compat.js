/**
 * ZotAssets compatibility layer for Zotero 7 / 8 / 9.
 *
 * Centralizes every API that has differed (or may differ) across Zotero major
 * versions and the underlying Gecko platform, with graceful fallbacks:
 *   - File system: IOUtils/PathUtils (modern) -> OS.File/OS.Path -> nsIFile.
 *   - Item attachment helpers: async path getters with sync fallback.
 *
 * Everything here is best-effort and never throws for "expected" conditions;
 * callers branch on returned values instead.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  // ---- Platform feature detection ------------------------------------------
  const hasIOUtils = typeof IOUtils !== "undefined";
  const hasPathUtils = typeof PathUtils !== "undefined";
  const hasOSFile = typeof OS !== "undefined" && OS.File;
  const hasOSPath = typeof OS !== "undefined" && OS.Path;

  function nsIFileFromPath(path) {
    const file = Components.classes["@mozilla.org/file/local;1"].createInstance(
      Components.interfaces.nsIFile
    );
    file.initWithPath(path);
    return file;
  }

  const Compat = {
    // ---- Version helpers ---------------------------------------------------
    version() {
      try {
        return String(Zotero.version || "");
      } catch (e) {
        return "";
      }
    },

    majorVersion() {
      const v = this.version();
      const m = /^(\d+)/.exec(v);
      return m ? parseInt(m[1], 10) : 0;
    },

    /** True if Zotero is at least the given major version. */
    atLeast(major) {
      return this.majorVersion() >= major;
    },

    // ---- Path helpers ------------------------------------------------------
    parentDir(path) {
      try {
        if (hasPathUtils) return PathUtils.parent(path);
      } catch (e) {
        /* fall through */
      }
      try {
        if (hasOSPath) return OS.Path.dirname(path);
      } catch (e) {
        /* fall through */
      }
      try {
        return nsIFileFromPath(path).parent.path;
      } catch (e) {
        Log.warn("parentDir failed", path, e);
        return null;
      }
    },

    leafName(path) {
      try {
        if (hasPathUtils) return PathUtils.filename(path);
      } catch (e) {
        /* fall through */
      }
      try {
        if (hasOSPath) return OS.Path.basename(path);
      } catch (e) {
        /* fall through */
      }
      try {
        return nsIFileFromPath(path).leafName;
      } catch (e) {
        // Last-ditch manual split.
        const parts = String(path).split(/[\\/]/);
        return parts[parts.length - 1] || "";
      }
    },

    joinPath(dir, name) {
      try {
        if (hasPathUtils) return PathUtils.join(dir, name);
      } catch (e) {
        /* fall through */
      }
      try {
        if (hasOSPath) return OS.Path.join(dir, name);
      } catch (e) {
        /* fall through */
      }
      const sep = dir.indexOf("\\") !== -1 ? "\\" : "/";
      return dir.replace(/[\\/]+$/, "") + sep + name;
    },

    async fileExists(path) {
      if (!path) return false;
      try {
        if (hasIOUtils) return await IOUtils.exists(path);
      } catch (e) {
        /* fall through */
      }
      try {
        if (hasOSFile) return await OS.File.exists(path);
      } catch (e) {
        /* fall through */
      }
      try {
        return nsIFileFromPath(path).exists();
      } catch (e) {
        Log.warn("fileExists failed", path, e);
        return false;
      }
    },

    // ---- Item / attachment helpers ----------------------------------------
    isAttachment(item) {
      try {
        return !!item && typeof item.isAttachment === "function" && item.isAttachment();
      } catch (e) {
        return false;
      }
    },

    /** True for attachments that point at a real file (imported or linked). */
    isFileAttachment(item) {
      try {
        if (!this.isAttachment(item)) return false;
        if (typeof item.isFileAttachment === "function") return item.isFileAttachment();
        const mode = item.attachmentLinkMode;
        const M = Zotero.Attachments;
        return (
          mode === M.LINK_MODE_IMPORTED_FILE ||
          mode === M.LINK_MODE_IMPORTED_URL ||
          mode === M.LINK_MODE_LINKED_FILE
        );
      } catch (e) {
        return false;
      }
    },

    isLinkedFileAttachment(item) {
      try {
        return item.attachmentLinkMode === Zotero.Attachments.LINK_MODE_LINKED_FILE;
      } catch (e) {
        return false;
      }
    },

    /** Resolve the on-disk path of an attachment, async with sync fallback. */
    async getFilePath(item) {
      try {
        if (typeof item.getFilePathAsync === "function") {
          const p = await item.getFilePathAsync();
          if (p) return p;
        }
      } catch (e) {
        Log.warn("getFilePathAsync failed", e);
      }
      try {
        if (typeof item.getFilePath === "function") {
          return item.getFilePath() || null;
        }
      } catch (e) {
        Log.warn("getFilePath failed", e);
      }
      return null;
    },

    /** Content type, e.g. "application/pdf". */
    contentType(item) {
      try {
        return item.attachmentContentType || "";
      } catch (e) {
        return "";
      }
    },

    /**
     * Rename the physical attachment file, using Zotero's own safe API so the
     * stored relative/absolute path stays consistent. Returns a normalized
     * result: { ok: boolean, code: any }.
     */
    async renameAttachmentFile(item, newName) {
      try {
        // Zotero signature: renameAttachmentFile(newName, overwrite=false, unique=false)
        const result = await item.renameAttachmentFile(newName, false, false);
        // Zotero returns true on success, or a negative/false-y code on failure.
        return { ok: result === true, code: result };
      } catch (e) {
        Log.error("renameAttachmentFile threw", e);
        return { ok: false, code: e };
      }
    },

    /**
     * Extract text from the first `maxPages` pages of a PDF attachment.
     * Tries Zotero's PDF worker first (true page-scoped extraction), then falls
     * back to the indexed full-text content (approximated by a head slice).
     * Returns "" on any failure — callers treat empty as "unknown".
     */
    async getPdfHeadText(item, maxPages) {
      const pages = maxPages || 1;
      // 1) Page-accurate extraction via the PDF worker (Zotero 7+).
      try {
        if (typeof Zotero.PDFWorker !== "undefined" && Zotero.PDFWorker &&
            typeof Zotero.PDFWorker.getFullText === "function") {
          const res = await Zotero.PDFWorker.getFullText(item.id, pages);
          if (res && res.text) return String(res.text);
        }
      } catch (e) {
        Log.warn("PDFWorker.getFullText failed; trying indexed text", e);
      }
      // 2) Fallback: indexed full text (head slice approximates the first page).
      try {
        if ("attachmentText" in item) {
          const t = await item.attachmentText;
          if (t) return String(t).slice(0, 4000);
        }
      } catch (e) {
        Log.warn("attachmentText failed", e);
      }
      return "";
    },

    async getParentItem(item) {
      try {
        const parentID = item.parentItemID;
        if (!parentID) return null;
        return await Zotero.Items.getAsync(parentID);
      } catch (e) {
        Log.warn("getParentItem failed", e);
        try {
          return item.parentItem || null;
        } catch (e2) {
          return null;
        }
      }
    },

    async saveItem(item) {
      try {
        await item.saveTx();
        return true;
      } catch (e) {
        Log.error("saveItem failed", e);
        return false;
      }
    },
  };

  ZA.Compat = Compat;
  Log.info("compat loaded; Zotero version", Compat.version(), "major", Compat.majorVersion());
})();
