/**
 * ZotAssets lightweight i18n.
 *
 * We intentionally implement a tiny in-JS string table (en / zh-CN) instead of
 * relying on Fluent (.ftl) registration, because the menus and dialogs here are
 * built dynamically in JS and this approach is identical across Zotero 7/8/9.
 *
 * Language selection: pref "language" ("auto" | "en" | "zh"). "auto" follows
 * Zotero's locale.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;

  const TABLE = {
    en: {
      "menu.root": "ZotAssets",
      "menu.autoSelection": "Auto-classify selected items…",
      "menu.autoLibrary": "Auto-classify entire library…",
      "menu.editRole": "Edit role…",
      "menu.setRole": "Set role",
      "menu.clearRole": "Clear role",
      "menu.renameByRole": "Rename by role",
      "menu.settings": "Settings…",
      "clear.restorePrompt":
        "Also restore the original file names for cleared attachments?\n\n[OK] = restore original names\n[Cancel] = keep current names",

      "dialog.title": "ZotAssets – Edit role",
      "dialog.heading": "Attachment asset role",
      "dialog.currentRole": "Current role:",
      "dialog.selectRole": "Select a new role:",
      "dialog.none": "(none)",
      "dialog.attachment": "Attachment:",

      "summary.title": "ZotAssets",
      "summary.done": "Done: %succeeded% updated, %skipped% skipped, %failed% failed.",
      "summary.detailsHeader": "Details:",

      "result.renamed": "Renamed to: %name%",
      "result.restored": "Original file name restored.",
      "result.roleSaved": "Role saved (no rename).",
      "result.cleared": "Role cleared.",
      "result.skipped.noOriginal": "No original file name stored.",
      "result.skipped.notAttachment": "Not a file attachment.",
      "result.skipped.notPdf": "Role saved; only PDFs are auto-renamed.",
      "result.skipped.linkedFile": "Linked file – renaming disabled in settings.",
      "result.skipped.autoRenameOff": "Auto-rename is turned off in settings.",
      "result.skipped.noRole": "No role set on this attachment.",
      "result.failed.noParent": "No parent item; cannot build a file name.",
      "result.failed.noFile": "File path could not be resolved.",
      "result.failed.missingFile": "File is missing on disk.",
      "result.failed.rename": "Rename failed (file may be locked or in use).",
      "result.failed.generic": "Operation failed.",

      "fallback.author": "Unknown",
      "fallback.year": "0000",
      "fallback.title": "Untitled",

      "settings.notImplemented":
        "Edit settings in Zotero's Config Editor under keys starting with \"extensions.zotassets.\".",
    },

    zh: {
      "menu.root": "ZotAssets",
      "menu.autoSelection": "自动识别选中项…",
      "menu.autoLibrary": "自动识别整个文献库…",
      "menu.editRole": "编辑角色…",
      "menu.setRole": "设置角色",
      "menu.clearRole": "清除角色",
      "menu.renameByRole": "按角色重命名",
      "menu.settings": "设置…",
      "clear.restorePrompt":
        "是否同时把这些附件的文件名恢复为原始文件名？\n\n[确定] = 恢复原始文件名\n[取消] = 保留当前文件名",

      "dialog.title": "ZotAssets – 编辑角色",
      "dialog.heading": "附件资产角色",
      "dialog.currentRole": "当前角色：",
      "dialog.selectRole": "选择新角色：",
      "dialog.none": "（无）",
      "dialog.attachment": "附件：",

      "summary.title": "ZotAssets",
      "summary.done": "完成：成功 %succeeded%，跳过 %skipped%，失败 %failed%。",
      "summary.detailsHeader": "详情：",

      "result.renamed": "已重命名为：%name%",
      "result.restored": "已恢复原始文件名。",
      "result.roleSaved": "已保存角色（未重命名）。",
      "result.cleared": "已清除角色。",
      "result.skipped.noOriginal": "未保存原始文件名。",
      "result.skipped.notAttachment": "不是文件附件。",
      "result.skipped.notPdf": "已保存角色；仅对 PDF 自动重命名。",
      "result.skipped.linkedFile": "链接文件 – 设置中未启用重命名。",
      "result.skipped.autoRenameOff": "设置中已关闭自动重命名。",
      "result.skipped.noRole": "该附件未设置角色。",
      "result.failed.noParent": "无父条目，无法生成文件名。",
      "result.failed.noFile": "无法解析文件路径。",
      "result.failed.missingFile": "磁盘上的文件不存在。",
      "result.failed.rename": "重命名失败（文件可能被锁定或占用）。",
      "result.failed.generic": "操作失败。",

      "fallback.author": "未知",
      "fallback.year": "0000",
      "fallback.title": "无标题",

      "settings.notImplemented":
        "请在 Zotero 的配置编辑器中以 “extensions.zotassets.” 开头的键中修改设置。",
    },
  };

  const Strings = {
    _lang: "en",

    /** Resolve effective language from the pref. */
    resolve() {
      let pref = "auto";
      try {
        pref = ZA.Prefs ? ZA.Prefs.get("language") : "auto";
      } catch (e) {
        /* ignore */
      }
      if (pref === "en" || pref === "zh") {
        this._lang = pref;
        return this._lang;
      }
      // auto: follow Zotero locale.
      let locale = "en";
      try {
        locale = (Zotero.locale || Zotero.Prefs.get("intl.locale.requested") || "en").toString();
      } catch (e) {
        /* ignore */
      }
      this._lang = /^zh/i.test(locale) ? "zh" : "en";
      return this._lang;
    },

    lang() {
      return this._lang;
    },

    /** Get a string, with optional %placeholder% substitution. */
    get(key, params) {
      const lang = this._lang || "en";
      const tbl = TABLE[lang] || TABLE.en;
      let s = tbl[key];
      if (s === undefined) s = TABLE.en[key];
      if (s === undefined) s = key;
      if (params) {
        for (const k of Object.keys(params)) {
          s = s.split("%" + k + "%").join(String(params[k]));
        }
      }
      return s;
    },
  };

  ZA.Strings = Strings;
})();
