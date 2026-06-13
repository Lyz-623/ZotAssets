/**
 * ZotAssets content-based role classifier (conservative, async).
 *
 * Detection reads the first pages of PDF text and combines multiple signals.
 * It intentionally prefers "unknown" over a risky guess:
 *
 *   - Supplement — strong SI evidence in the file name or at the top of the
 *     first pages, such as "Supplementary Information", "Supporting
 *     Information", "Supplementary Material", ESI, "Figure S1", or
 *     Chinese "补充材料/信息".
 *
 *   - Main PDF — article-like evidence such as the parent title, DOI, journal
 *     name, Abstract/摘要, keywords, and publication metadata. A bare mention
 *     of "supplementary" inside a normal article is not enough to make it SI.
 *
 * Auto-classification is journal-article only. Theses, conference papers, books
 * and other parent item types are left untouched.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  const DOI_RE = /\b10\.\d{4,9}\/[^\s"'<>)\]]+/i;

  const SUPPLEMENT_FILENAME_RE = new RegExp(
    [
      "(^|[._\\-\\s])supp(lement|lementary)?([._\\-\\s]|$)",
      "(^|[._\\-\\s])suppinfo([._\\-\\s]|$)",
      "(^|[._\\-\\s])supporting[._\\-\\s]*information([._\\-\\s]|$)",
      "(^|[._\\-\\s])supplementary[._\\-\\s]*(information|materials?|data|file)([._\\-\\s]|$)",
      "(^|[._\\-\\s])esi([._\\-\\s]|$)",
      "(^|[._\\-\\s])si([._\\-\\s]|$)",
      "补充(材料|信息|说明|数据)",
    ].join("|"),
    "i"
  );

  const SUPPLEMENT_HEADING_RE = new RegExp(
    [
      "(^|[\\r\\n])\\s*supplementary\\s+(information|materials?|methods?|figures?|tables?|appendix)\\s*[:：]?(?=[\\r\\n]|$)",
      "(^|[\\r\\n])\\s*supplemental\\s+(information|materials?|methods?|figures?|tables?)\\s*[:：]?(?=[\\r\\n]|$)",
      "(^|[\\r\\n])\\s*supporting\\s+information\\s*[:：]?(?=[\\r\\n]|$)",
      "\\bsupplementary\\s+(information|materials?)\\s+(for|to)\\b",
      "\\bsupporting\\s+information\\s+(for|to)\\b",
      "(^|[\\r\\n])\\s*(补充材料|补充信息|补充说明|补充数据|支持信息)\\b",
    ].join("|"),
    "i"
  );

  const SUPPLEMENT_FIGURE_RE =
    /\b(fig(?:ure)?|table|scheme|movie|video|dataset|appendix)\s*S\d+[A-Za-z]?\b/i;

  const ABSTRACT_RE = /\babstract\b|摘要/i;
  const KEYWORDS_RE = /\bkey\s*words?\b|关键词/i;
  const ARTICLE_META_RE =
    /\b(received|accepted|published|correspondence|copyright|volume|issue)\b|收稿日期|基金项目|中图分类号|通讯作者/i;

  function extOf(name) {
    const m = /\.([a-z0-9]+)$/i.exec(name || "");
    return m ? m[1].toLowerCase() : "";
  }

  function normalize(s) {
    return String(s || "")
      .toLowerCase()
      .replace(/[.,;:()\[\]{}'"]/g, " ")
      .replace(/[，。；：（）【】《》“”‘’、]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  function getField(parent, field) {
    try {
      return parent && typeof parent.getField === "function"
        ? String(parent.getField(field) || "")
        : "";
    } catch (e) {
      return "";
    }
  }

  function textContainsNormalized(normText, candidate, minLen) {
    const n = normalize(candidate);
    if (!n || n.length < minLen) return false;
    return normText.indexOf(n) !== -1;
  }

  function parentTitleInText(parent, normText) {
    const title = getField(parent, "title");
    const minLen = /[\u3400-\u9fff]/.test(title) ? 6 : 14;
    return textContainsNormalized(normText, title, minLen);
  }

  function journalNameInText(parent, normText) {
    const candidates = [
      getField(parent, "publicationTitle"),
      getField(parent, "journalAbbreviation"),
    ];
    for (const c of candidates) {
      if (textContainsNormalized(normText, c, 4)) return true;
    }
    return false;
  }

  function supplementEvidence(filename, text) {
    const head = String(text || "").slice(0, 2200);
    const opening = head.slice(0, 450);
    const evidence = [];
    let score = 0;

    if (SUPPLEMENT_FILENAME_RE.test(filename || "")) {
      score += 5;
      evidence.push("supplement-filename");
    }
    if (/^\s*(supplementary|supplemental)\s+(information|materials?)\b/i.test(opening) ||
        /^\s*supporting\s+information\b/i.test(opening)) {
      score += 6;
      evidence.push("supplement-opening-title");
    }
    if (SUPPLEMENT_HEADING_RE.test(head)) {
      score += 6;
      evidence.push("supplement-heading");
    }
    if (SUPPLEMENT_FIGURE_RE.test(head)) {
      score += 2;
      evidence.push("supplement-numbered-figure");
    }

    return { score, evidence };
  }

  function mainEvidence(parent, text) {
    const normText = normalize(text);
    const evidence = [];
    let score = 0;

    const hasDoi = DOI_RE.test(text);
    const hasTitle = parentTitleInText(parent, normText);
    const hasJournal = journalNameInText(parent, normText);
    const hasAbstract = ABSTRACT_RE.test(text);
    const hasKeywords = KEYWORDS_RE.test(text);
    const hasMeta = ARTICLE_META_RE.test(text);

    if (hasTitle) {
      score += 4;
      evidence.push("parent-title");
    }
    if (hasDoi) {
      score += 2;
      evidence.push("doi");
    }
    if (hasJournal) {
      score += 2;
      evidence.push("journal-name");
    }
    if (hasAbstract) {
      score += 2;
      evidence.push("abstract");
    }
    if (hasKeywords) {
      score += 1;
      evidence.push("keywords");
    }
    if (hasMeta) {
      score += 1;
      evidence.push("article-metadata");
    }
    if (hasTitle && (hasDoi || hasAbstract || hasJournal)) {
      score += 2;
      evidence.push("title-plus-article-signal");
    }
    if (hasDoi && hasJournal) {
      score += 2;
      evidence.push("doi-plus-journal");
    }

    return { score, evidence };
  }

  function decideRole(supplement, main) {
    if (supplement.score >= 5) {
      return {
        role: "supplement",
        confidence: supplement.score,
        evidence: supplement.evidence,
      };
    }
    if (main.score >= 7 && supplement.score < 5) {
      return {
        role: "main_pdf",
        confidence: main.score,
        evidence: main.evidence,
      };
    }
    return { role: null, confidence: 0, evidence: [] };
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
     * @returns {Promise<Object>} { role, confidence, evidence }
     */
    async classifyDetailed(item, ctx) {
      try {
        const context = ctx || {};
        if (!ZA.Compat.isJournalArticle(context.parent)) {
          return { role: null, confidence: 0, evidence: [] };
        }
        if (!ZA.Compat.isFileAttachment(item)) {
          return { role: null, confidence: 0, evidence: [] };
        }

        let filename = "";
        try {
          filename = item.attachmentFilename || "";
        } catch (e) {
          filename = "";
        }
        const ext = extOf(filename);
        if (!this.isPdf(item, ext)) {
          return { role: null, confidence: 0, evidence: [] };
        }

        const text = await ZA.Compat.getPdfHeadText(item, 2);
        const supplement = supplementEvidence(filename, text || "");
        if (!text && supplement.score < 5) {
          return { role: null, confidence: 0, evidence: [] };
        }
        const main = text
          ? mainEvidence(context.parent, text)
          : { score: 0, evidence: [] };
        return decideRole(supplement, main);
      } catch (e) {
        Log.warn("classifyDetailed failed", e);
        return { role: null, confidence: 0, evidence: [] };
      }
    },

    /**
     * @returns {Promise<string|null>} "main_pdf" | "supplement" | null
     */
    async classify(item, ctx) {
      const result = await this.classifyDetailed(item, ctx);
      return result.role || null;
    },
  };

  ZA.Classifier = Classifier;
})();
