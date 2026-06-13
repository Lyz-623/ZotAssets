/**
 * ZotAssets automatic role classifier (conservative).
 *
 * By design this only auto-detects TWO roles, to keep automation reliable:
 *   - "supplement"  — attachments clearly marked as supplementary/supporting.
 *   - "main_pdf"    — the main article PDF (the only PDF under its parent, or a
 *                     PDF whose file name clearly says "full text / main / ...").
 *
 * Everything else returns `null` => "don't auto-change". Those attachments are
 * left untouched so the user can assign a role manually (Data, Code, Figure,
 * Translation, Scan, Published, AcceptedMS, Preprint, Other are all still
 * available from the menu / Edit role dialog).
 *
 * To tune detection, edit the SUPPLEMENT / MAIN_HINT patterns below.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  function extOf(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  // Clear supplementary-material markers. Tested against "<filename> <title>".
  // Deliberately avoids a bare "SI" token (too many false positives).
  const SUPPLEMENT =
    /supp?lement|supplementary|supporting[\s_-]*info(rmation)?|\bsuppl?\b|\besi\b|\bsi[\s_-]*appendix\b|appendix|附录|补充材料/i;

  // Strong "this is the main article PDF" hints in the FILE NAME only.
  const MAIN_HINT =
    /full[\s_-]*text|fulltext|\bmain\b|main[\s_-]*(text|document|article|pdf)|\barticle\b|\bmanuscript\b|\bpaper\b|正文|全文/i;

  const Classifier = {
    isPdf(item, ext) {
      const ct = (ZA.Compat.contentType(item) || "").toLowerCase();
      if (ct === "application/pdf") return true;
      return ext === "pdf";
    },

    /**
     * @param {Zotero.Item} item  attachment item
     * @param {Object} ctx        { pdfSiblingCount }
     * @returns {string|null} "main_pdf" | "supplement" | null (leave untouched)
     */
    classify(item, ctx) {
      try {
        const context = ctx || {};
        if (!ZA.Compat.isFileAttachment(item)) return null;

        let filename = "";
        try {
          filename = item.attachmentFilename || "";
        } catch (e) {
          filename = "";
        }
        let title = "";
        try {
          title = item.getField("title") || "";
        } catch (e) {
          title = "";
        }

        const ext = extOf(filename);
        const fnHay = filename.toLowerCase();
        const fullHay = (filename + " " + title).toLowerCase();
        const pdf = this.isPdf(item, ext);

        // 1) Supplement — explicit markers win (applies to PDFs and non-PDFs).
        if (SUPPLEMENT.test(fullHay)) return "supplement";

        // 2) Main PDF — only for PDFs, and only when we are confident.
        if (pdf) {
          if (context.pdfSiblingCount === 1) return "main_pdf"; // sole PDF
          if (MAIN_HINT.test(fnHay)) return "main_pdf"; // explicit "full text"/"main"/...
          // Multiple PDFs and no clear hint: ambiguous -> leave for the user.
          return null;
        }

        // 3) Non-PDF without a supplement marker: don't auto-change.
        return null;
      } catch (e) {
        Log.warn("classify failed", e);
        return null;
      }
    },
  };

  ZA.Classifier = Classifier;
})();
