/**
 * ZotAssets built-in asset roles.
 *
 * Each role has:
 *   - id:    stable internal identifier (never shown raw to users, never in
 *            filenames). Used as the persisted value.
 *   - tag:   ASCII short label used inside PDF file names (must be filename safe
 *            on Windows / macOS / Linux by construction).
 *   - en/zh: human readable display names.
 *
 * To add or change roles, edit the ROLES array below. Keep `tag` ASCII-only and
 * free of path separators; it is still passed through the filename sanitizer as
 * a safety net.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;

  const ROLES = [
    { id: "main_pdf", tag: "Main", en: "Main PDF", zh: "正文 PDF" },
    { id: "supplement", tag: "Supplement", en: "Supplementary material", zh: "补充材料" },
    { id: "data", tag: "Data", en: "Data", zh: "数据" },
    { id: "code", tag: "Code", en: "Code", zh: "代码" },
    { id: "figure", tag: "Figure", en: "Figure / table", zh: "图表" },
    { id: "translation", tag: "Translation", en: "Translation", zh: "译文" },
    { id: "scan", tag: "Scan", en: "Scan", zh: "扫描件" },
    { id: "published", tag: "Published", en: "Publisher version", zh: "出版商版本" },
    { id: "accepted_ms", tag: "AcceptedMS", en: "Accepted manuscript", zh: "作者接受稿" },
    { id: "preprint", tag: "Preprint", en: "Preprint", zh: "预印本" },
    { id: "other", tag: "Other", en: "Other", zh: "其他" },
  ];

  const BY_ID = new Map(ROLES.map((r) => [r.id, r]));

  const Roles = {
    all() {
      return ROLES.slice();
    },

    byId(id) {
      return BY_ID.get(id) || null;
    },

    isValid(id) {
      return BY_ID.has(id);
    },

    /** ASCII short tag used in filenames, or null if unknown. */
    tag(id) {
      const r = BY_ID.get(id);
      return r ? r.tag : null;
    },

    /**
     * Role tag for generated filenames/titles. Chinese journal articles should
     * not receive a visible type suffix, but the role is still stored.
     */
    filenameTag(id, parentItem) {
      try {
        if (ZA.Compat && ZA.Compat.isChineseJournalArticle(parentItem)) {
          return "";
        }
      } catch (e) {
        /* fall through */
      }
      return this.tag(id);
    },

    /** Localized display name for the current Strings language. */
    label(id) {
      const r = BY_ID.get(id);
      if (!r) return null;
      const lang = ZA.Strings ? ZA.Strings.lang() : "en";
      return (lang === "zh" ? r.zh : r.en) || r.en;
    },
  };

  ZA.Roles = Roles;
})();
