/**
 * ZotAssets automatic role classifier.
 *
 * Heuristically guesses the asset role of an attachment from its file name,
 * content type / extension, the parent title, and sibling context (e.g. whether
 * it is the only PDF under its parent).
 *
 * The rules are ordered from most specific to least specific; the first match
 * wins. Everything is keyword/extension based and intentionally conservative —
 * it is meant to be reviewed in the preview step before anything is applied.
 *
 * To tune detection, edit the RULES / EXT_* tables below.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  const EXT_CODE = new Set([
    "py", "r", "ipynb", "m", "cpp", "cc", "c", "h", "hpp", "js", "ts", "java",
    "sh", "bat", "ps1", "do", "jl", "go", "rs", "scala", "rb", "pl", "sql",
  ]);
  const EXT_DATA = new Set([
    "csv", "tsv", "xls", "xlsx", "xlsm", "dta", "sav", "por", "parquet",
    "h5", "hdf5", "mat", "rdata", "rds", "nc", "fits", "fasta", "fastq",
  ]);
  const EXT_IMAGE = new Set([
    "png", "jpg", "jpeg", "tif", "tiff", "gif", "svg", "eps", "bmp", "webp",
  ]);

  function extOf(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  // "Document variant" rules: which version of the paper this is. These are
  // tested against "<filename> <title>" because the markers often appear in the
  // parent/attachment title too.
  const DOC_RULES = [
    { role: "translation", re: /translat|译文|翻\s*译|中\s*译|译稿/i },
    {
      role: "supplement",
      re: /supp?lement|supporting[\s_-]*info|supporting[\s_-]*information|\bsuppl?\b|\bsi\b|\besi\b|appendix|附录|补充材料|supplementary/i,
    },
    { role: "preprint", re: /preprint|arxiv|biorxiv|medrxiv|chemrxiv|ssrn|预印本/i },
    {
      role: "accepted_ms",
      re: /accepted[\s_-]*manuscript|author[\s_-]*accepted|\baam\b|post[\s_-]?print|accepted[\s_-]*version|accepted_ms|接受稿|录用稿/i,
    },
    {
      role: "published",
      re: /published|publisher|version[\s_-]*of[\s_-]*record|\bvor\b|final[\s_-]*version|as[\s_-]*published|出版.?版本|正式版/i,
    },
    { role: "scan", re: /scan(ned)?|扫描件?|影印/i },
  ];

  // "Category" rules: code/data/figure. Tested against the FILENAME ONLY, so a
  // Main PDF whose title merely contains a word like "data" or "figure" is not
  // misfiled. (Strong extension signals are handled before these anyway.)
  const CAT_RULES = [
    { role: "code", re: /\bcode\b|source[\s_-]*code|\bscript\b|github|代码|脚本/i },
    {
      role: "data",
      re: /\bdata(set)?\b|raw[\s_-]*data|supplementary[\s_-]*data|数据集?/i,
    },
    {
      role: "figure",
      re: /\bfig(ure)?s?\b|\bscheme\b|graphical[\s_-]*abstract|\btoc\b|\bchart\b|\bplot\b|\bdiagram\b|图\s*\d|图表/i,
    },
  ];

  // File names that strongly indicate the main article PDF.
  const MAIN_HINT =
    /full[\s_-]*text|fulltext|main[\s_-]*(text|document|article|pdf)?|\barticle\b|\bmanuscript\b|\bpaper\b|正文|全文/i;

  const Classifier = {
    EXT_CODE,
    EXT_DATA,
    EXT_IMAGE,

    isPdf(item, ext) {
      const ct = (ZA.Compat.contentType(item) || "").toLowerCase();
      if (ct === "application/pdf") return true;
      return ext === "pdf";
    },

    /**
     * @param {Zotero.Item} item        attachment item
     * @param {Object}      ctx         { parentTitle, pdfSiblingCount }
     * @returns {string} roleId
     */
    classify(item, ctx) {
      try {
        const context = ctx || {};
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
        const ct = (ZA.Compat.contentType(item) || "").toLowerCase();
        const fnHay = filename.toLowerCase();
        const fullHay = (filename + " " + title).toLowerCase();
        const pdf = this.isPdf(item, ext);

        // 1) Extension-driven strong signals first (override fuzzy keywords).
        if (EXT_CODE.has(ext)) return "code";
        if (EXT_DATA.has(ext)) return "data";
        if (!pdf && (ct.indexOf("image/") === 0 || EXT_IMAGE.has(ext))) return "figure";

        // 2) Document-variant rules (filename + title).
        for (const rule of DOC_RULES) {
          if (rule.re.test(fullHay)) return rule.role;
        }

        // 3) Category rules (filename only) — avoids title false positives.
        for (const rule of CAT_RULES) {
          if (rule.re.test(fnHay)) return rule.role;
        }

        // 4) PDF fallback: most PDFs are the main article.
        if (pdf) {
          if (context.pdfSiblingCount === 1) return "main_pdf";
          if (MAIN_HINT.test(fnHay)) return "main_pdf";
          // Multiple PDFs and no hints: still most likely the article.
          return "main_pdf";
        }

        // 5) Anything else.
        return "other";
      } catch (e) {
        Log.warn("classify failed", e);
        return "other";
      }
    },
  };

  ZA.Classifier = Classifier;
})();
