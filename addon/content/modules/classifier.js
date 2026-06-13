/**
 * ZotAssets content-based role classifier (conservative, async).
 *
 * Detection is based on the PDF's FIRST-PAGE TEXT, not the file name:
 *
 *   - "supplement"  — the first page contains an explicit supplementary marker
 *                     (e.g. "Supplementary Information", "Supporting Information",
 *                     "Supplementary Material", "Supplement", an "SI <heading>"
 *                     reference, or the Chinese "补充材料/信息").
 *
 *   - "main_pdf"    — the first page contains BOTH a DOI and the parent item's
 *                     journal name (publicationTitle / journalAbbreviation).
 *
 * Anything else (including PDFs whose text cannot be read, and all non-PDFs)
 * returns `null` => "leave untouched; set manually". The other roles (Data,
 * Code, Figure, Translation, Scan, Published, AcceptedMS, Preprint, Other)
 * remain available for manual assignment.
 *
 * To tune detection, edit SUPPLEMENT_RE / DOI_RE / journal matching below.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  // Explicit supplementary-material markers found on a supplement's first page.
  // A bare "SI" token is intentionally NOT matched (too many false positives
  // like "SI units"); "SI" only counts next to a heading word or in "(SI)".
  const SUPPLEMENT_RE = new RegExp(
    [
      "supplementary\\s+(information|materials?|data|methods?|figures?|tables?|notes?|results?|discussion|appendix)",
      "supporting\\s+information",
      "electronic\\s+supplementary\\s+material",
      "\\bsupplementary\\b",
      "\\bsupplemental\\b",
      "\\bsupplement\\b",
      "\\(SI\\)",
      "\\bSI\\s+(appendix|text|figures?|tables?|materials?|methods?|dataset|guide|section)\\b",
      "\\bESI\\b",
      "补充(材料|信息|说明|数据)",
      "supporting\\s+materials?",
    ].join("|"),
    "i"
  );

  // DOI pattern (Crossref-style).
  const DOI_RE = /\b10\.\d{4,9}\/[^\s"'<>)\]]+/i;

  function extOf(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[.,;:()\[\]{}'"]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function journalNameInText(parent, normText) {
    if (!parent) return false;
    const candidates = [];
    try {
      const pub = parent.getField("publicationTitle");
      if (pub) candidates.push(pub);
    } catch (e) {
      /* ignore */
    }
    try {
      const abbr = parent.getField("journalAbbreviation");
      if (abbr) candidates.push(abbr);
    } catch (e) {
      /* ignore */
    }
    for (const c of candidates) {
      const n = normalize(c);
      // Require a non-trivial journal name to avoid spurious substring hits.
      if (n.length >= 4 && normText.indexOf(n) !== -1) return true;
    }
    return false;
  }

  const Classifier = {
    isPdf(item, ext) {
      const ct = (ZA.Compat.contentType(item) || "").toLowerCase();
      if (ct === "application/pdf") return true;
      return ext === "pdf";
    },

    /**
     * @param {Zotero.Item} item  attachment item
     * @param {Object} ctx        { parent }
     * @returns {Promise<string|null>} "main_pdf" | "supplement" | null
     */
    async classify(item, ctx) {
      try {
        const context = ctx || {};
        if (!ZA.Compat.isFileAttachment(item)) return null;

        let filename = "";
        try {
          filename = item.attachmentFilename || "";
        } catch (e) {
          filename = "";
        }
        const ext = extOf(filename);
        if (!this.isPdf(item, ext)) return null; // content rules need a PDF

        // Read the first page text (empty on failure).
        const text = await ZA.Compat.getPdfHeadText(item, 1);
        if (!text) return null;

        // 1) Supplement — explicit first-page marker wins.
        if (SUPPLEMENT_RE.test(text)) return "supplement";

        // 2) Main PDF — needs BOTH a DOI and the parent's journal name.
        const hasDoi = DOI_RE.test(text);
        if (hasDoi) {
          const normText = normalize(text);
          if (journalNameInText(context.parent, normText)) {
            return "main_pdf";
          }
        }

        // 3) Not confident -> leave for manual assignment.
        return null;
      } catch (e) {
        Log.warn("classify failed", e);
        return null;
      }
    },
  };

  ZA.Classifier = Classifier;
})();
