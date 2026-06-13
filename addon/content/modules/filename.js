/**
 * ZotAssets file-name construction and cross-platform sanitization.
 *
 * Builds a safe PDF file name from a template and the parent item's metadata.
 * Every dynamic component is sanitized to be valid on Windows, macOS and Linux.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  // Windows reserved device names (case-insensitive).
  const RESERVED = new Set([
    "CON", "PRN", "AUX", "NUL",
    "COM1", "COM2", "COM3", "COM4", "COM5", "COM6", "COM7", "COM8", "COM9",
    "LPT1", "LPT2", "LPT3", "LPT4", "LPT5", "LPT6", "LPT7", "LPT8", "LPT9",
  ]);

  // Illegal on Windows + path separators.
  const ILLEGAL = /[<>:"/\\|?*]/g;
  // Control characters (0x00-0x1F and 0x7F).
  // eslint-disable-next-line no-control-regex
  const CONTROL = /[\x00-\x1F\x7F]/g;

  // Max length budget for a single component (keeps total path well under
  // platform limits even with directories prefixed).
  const MAX_COMPONENT = 80;

  const Filename = {
    /**
     * Sanitize a single file-name component (not a full path). Replaces illegal
     * characters, strips control chars, trims trailing dots/spaces, avoids
     * reserved names, and bounds the length.
     */
    sanitizeComponent(input, fallback) {
      let s = input === undefined || input === null ? "" : String(input);

      // Normalize whitespace.
      s = s.replace(/[\r\n\t]+/g, " ");
      // Replace path separators and illegal Windows chars with a space.
      s = s.replace(ILLEGAL, " ");
      // Strip remaining control characters.
      s = s.replace(CONTROL, "");
      // Collapse whitespace.
      s = s.replace(/\s+/g, " ").trim();
      // Trim leading/trailing dots and spaces (illegal as trailing on Windows).
      s = s.replace(/^[.\s]+/, "").replace(/[.\s]+$/, "");

      if (!s) {
        s = fallback || "Untitled";
      }

      // Avoid reserved device names.
      if (RESERVED.has(s.toUpperCase())) {
        s = "_" + s;
      }

      if (s.length > MAX_COMPONENT) {
        s = s.slice(0, MAX_COMPONENT).replace(/[.\s]+$/, "");
      }
      return s;
    },

    /** First author's last name (any creator with a usable surname). */
    firstAuthorLastName(parentItem) {
      const fallback = ZA.Strings ? ZA.Strings.get("fallback.author") : "Unknown";
      try {
        if (!parentItem) return fallback;
        const creators =
          typeof parentItem.getCreators === "function" ? parentItem.getCreators() : [];
        if (!creators || !creators.length) return fallback;

        // Take the first creator with a usable last/family name, else the first.
        let chosen = null;
        for (const c of creators) {
          if (c && (c.lastName || c.name)) {
            chosen = c;
            break;
          }
        }
        if (!chosen) return fallback;
        const name = chosen.lastName || chosen.name || "";
        return this.sanitizeComponent(name, fallback);
      } catch (e) {
        Log.warn("firstAuthorLastName failed", e);
        return fallback;
      }
    },

    /** 4-digit year extracted from the item's date, with safe fallback. */
    year(parentItem) {
      const fallback = ZA.Strings ? ZA.Strings.get("fallback.year") : "0000";
      try {
        if (!parentItem) return fallback;
        let dateStr = "";
        try {
          dateStr = parentItem.getField("date") || "";
        } catch (e) {
          dateStr = "";
        }
        if (!dateStr) return fallback;

        // Try Zotero's date parser first (handles many formats / multipart).
        try {
          if (Zotero.Date && typeof Zotero.Date.strToDate === "function") {
            const d = Zotero.Date.strToDate(dateStr);
            if (d && d.year) return this.sanitizeComponent(String(d.year), fallback);
          }
        } catch (e) {
          /* fall through to regex */
        }
        const m = /(\d{4})/.exec(dateStr);
        return m ? m[1] : fallback;
      } catch (e) {
        Log.warn("year failed", e);
        return fallback;
      }
    },

    parentTitle(parentItem) {
      const fallback = ZA.Strings ? ZA.Strings.get("fallback.title") : "Untitled";
      try {
        if (!parentItem) return fallback;
        let title = "";
        try {
          title = parentItem.getField("title") || "";
        } catch (e) {
          title = "";
        }
        if (!title && typeof parentItem.getDisplayTitle === "function") {
          try {
            title = parentItem.getDisplayTitle() || "";
          } catch (e) {
            /* ignore */
          }
        }
        return this.sanitizeComponent(title, fallback);
      } catch (e) {
        Log.warn("parentTitle failed", e);
        return fallback;
      }
    },

    /**
     * Render the filename template into a sanitized base name (without forcing
     * a unique suffix). Always returns a string ending in ".pdf".
     *
     * Supported placeholders:
     *   {firstAuthorLastName} {year} {parentTitle} {role}
     */
    render(template, fields) {
      const tpl = template || ZA.Prefs.DEFAULTS.filenameTemplate;
      const roleInput = fields.role === undefined || fields.role === null
        ? null
        : String(fields.role);
      const safe = {
        firstAuthorLastName: this.sanitizeComponent(
          fields.firstAuthorLastName,
          ZA.Strings ? ZA.Strings.get("fallback.author") : "Unknown"
        ),
        year: this.sanitizeComponent(
          fields.year,
          ZA.Strings ? ZA.Strings.get("fallback.year") : "0000"
        ),
        parentTitle: this.sanitizeComponent(
          fields.parentTitle,
          ZA.Strings ? ZA.Strings.get("fallback.title") : "Untitled"
        ),
        role: roleInput === "" ? "" : this.sanitizeComponent(roleInput, "Other"),
      };

      let name = tpl
        .replace(/\{firstAuthorLastName\}/g, safe.firstAuthorLastName)
        .replace(/\{year\}/g, safe.year)
        .replace(/\{parentTitle\}/g, safe.parentTitle)
        .replace(/\{role\}/g, safe.role);

      // Ensure a .pdf extension exactly once.
      name = name.replace(/\.pdf$/i, "");
      // Final whole-name sanitation pass (handles separators introduced by the
      // template literal text itself).
      name = name
        .replace(ILLEGAL, " ")
        .replace(CONTROL, "")
        .replace(/\s+/g, " ")
        .replace(/^[._\-\s]+/, "")
        .replace(/[._\-\s]+$/, "");
      if (!name) name = "Attachment";
      return name + ".pdf";
    },

    /**
     * Given a directory and a desired leaf name, return a leaf name that does
     * not collide with an existing file, appending "__2", "__3", ... before the
     * extension. The attachment's own current file (currentPath) is ignored so
     * that re-applying the same name is a no-op rather than a forced suffix.
     */
    async ensureUnique(dir, desiredLeaf, currentPath) {
      const Compat = ZA.Compat;
      const dot = desiredLeaf.lastIndexOf(".");
      const stem = dot > 0 ? desiredLeaf.slice(0, dot) : desiredLeaf;
      const ext = dot > 0 ? desiredLeaf.slice(dot) : "";

      let candidate = desiredLeaf;
      let n = 1;
      // Cap attempts to avoid any pathological loop.
      for (let i = 0; i < 1000; i++) {
        const candidatePath = Compat.joinPath(dir, candidate);
        // If it is the file we are renaming, treat as free.
        if (currentPath && candidatePath === currentPath) {
          return candidate;
        }
        // eslint-disable-next-line no-await-in-loop
        const exists = await Compat.fileExists(candidatePath);
        if (!exists) {
          return candidate;
        }
        n += 1;
        candidate = stem + "__" + n + ext;
      }
      // Extreme fallback: timestamp suffix.
      return stem + "__" + Date.now() + ext;
    },
  };

  ZA.Filename = Filename;
})();
