/**
 * ZotAssets auto-classification orchestrator.
 *
 * Workflow (per the project decision: PREVIEW FIRST, then decide):
 *   1. Collect attachments (whole library, or from the current selection).
 *   2. Classify each with Classifier and build a plan.
 *   3. Show a preview (counts per role + example renames) and ask to proceed.
 *   4. Ask whether to also rename PDFs, or only write roles.
 *   5. Apply with a progress window and report a final summary.
 *
 * Library scans RE-CLASSIFY ALL attachments (existing roles are overwritten),
 * which is why the preview/confirm gate is mandatory.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  function bilingual(zh, en) {
    const lang = ZA.Strings ? ZA.Strings.lang() : "en";
    return lang === "zh" ? zh : en;
  }

  async function yieldToUI() {
    try {
      if (Zotero.Promise && typeof Zotero.Promise.delay === "function") {
        await Zotero.Promise.delay(1);
        return;
      }
    } catch (e) {
      /* fall through */
    }
    await new Promise((resolve) => {
      if (typeof setTimeout === "function") {
        setTimeout(resolve, 1);
      } else {
        Services.tm.dispatchToMainThread(resolve);
      }
    });
  }

  function reportProgress(onProgress, done, total) {
    if (!onProgress) return;
    try {
      onProgress(done, total);
    } catch (e) {
      /* ignore */
    }
  }

  async function getAllAttachments() {
    const out = [];
    let libs = [];
    try {
      libs = Zotero.Libraries.getAll();
    } catch (e) {
      Log.warn("Libraries.getAll failed", e);
    }
    for (const lib of libs) {
      const libraryID = lib.libraryID !== undefined ? lib.libraryID : lib.id;
      let items = [];
      try {
        items = await Zotero.Items.getAll(libraryID, false, false, false);
      } catch (e) {
        Log.warn("Items.getAll failed for library", libraryID, e);
        continue;
      }
      for (const it of items) {
        if (ZA.Compat.isAttachment(it)) out.push(it);
      }
    }
    return out;
  }

  function attachmentsFromSelection(items) {
    const out = [];
    const seen = new Set();
    const push = (it) => {
      if (it && !seen.has(it.id) && ZA.Compat.isAttachment(it)) {
        seen.add(it.id);
        out.push(it);
      }
    };
    for (const item of items || []) {
      if (ZA.Compat.isAttachment(item)) {
        push(item);
      } else if (item && typeof item.getAttachments === "function") {
        try {
          const ids = item.getAttachments() || [];
          for (const id of ids) {
            const att = Zotero.Items.get(id);
            push(att);
          }
        } catch (e) {
          Log.warn("getAttachments failed", e);
        }
      }
    }
    return out;
  }

  /**
   * Build classification plan entries for a list of attachments.
   * Classification reads first-page PDF text, so this is the slow phase —
   * `onProgress(done, total)` is called so the caller can show a progress bar.
   */
  async function buildPlan(attachments, onProgress) {
    const plan = [];
    const total = attachments.length;
    let i = 0;
    for (const att of attachments) {
      i += 1;
      try {
        const parent = await ZA.Compat.getParentItem(att);
        if (!ZA.Compat.isJournalArticle(parent)) {
          reportProgress(onProgress, i, total);
          continue;
        }
        // Content-based classifier (async): null => leave untouched.
        const detectedRole = await ZA.Classifier.classify(att, { parent });
        if (detectedRole) {
          const currentRole = ZA.RoleStore.getRole(att);
          const name = ZA.RoleManager.attachmentDisplayName(att);

          const ext = (att.attachmentFilename || "").toLowerCase();
          const isPdf =
            (ZA.Compat.contentType(att) || "").toLowerCase() === "application/pdf" ||
            /\.pdf$/.test(ext);

          let proposedName = null;
          if (isPdf && parent) {
            proposedName = ZA.Filename.render(ZA.Prefs.getString("filenameTemplate"), {
              firstAuthorLastName: ZA.Filename.firstAuthorLastName(parent),
              year: ZA.Filename.year(parent),
              parentTitle: ZA.Filename.parentTitle(parent),
              role: ZA.Roles.tag(detectedRole) || "Other",
            });
          }

          plan.push({ item: att, name, currentRole, detectedRole, isPdf, proposedName });
        }
      } catch (e) {
        Log.warn("buildPlan entry failed", e);
      }
      reportProgress(onProgress, i, total);
    }
    return plan;
  }

  function buildPreviewText(plan, scanned) {
    const counts = {};
    let pdfRenames = 0;
    const examples = [];
    for (const e of plan) {
      counts[e.detectedRole] = (counts[e.detectedRole] || 0) + 1;
      if (e.isPdf && e.proposedName) {
        pdfRenames += 1;
        if (examples.length < 12 && e.name !== e.proposedName) {
          examples.push("  • " + e.name + "  ->  " + e.proposedName);
        }
      }
    }
    const unchanged = Math.max(0, (scanned || plan.length) - plan.length);

    const header = bilingual(
      "ZotAssets 自动分类预览",
      "ZotAssets auto-classify preview"
    );
    const lines = [header, ""];
    lines.push(bilingual("共扫描附件：", "Attachments scanned: ") + (scanned || plan.length));
    lines.push(
      bilingual(
        "仅处理期刊论文；学位论文、会议论文和书籍保持不变。",
        "Journal articles only; theses, conference papers and books are left unchanged."
      )
    );
    lines.push(
      bilingual("仅自动识别：正文 PDF / 补充材料", "Auto-detected only: Main PDF / Supplement")
    );
    lines.push("");
    lines.push(bilingual("将写入的角色：", "Roles to assign:"));
    for (const role of ZA.Roles.all()) {
      const c = counts[role.id] || 0;
      if (c > 0) {
        lines.push("  " + ZA.Roles.label(role.id) + " (" + role.tag + "): " + c);
      }
    }
    lines.push(
      bilingual("保持不变（需手动设置）：", "Left unchanged (set manually): ") + unchanged
    );
    lines.push("");
    lines.push(
      bilingual("可重命名的 PDF：", "PDFs eligible for rename: ") + pdfRenames
    );
    if (examples.length) {
      lines.push(bilingual("示例（旧名 -> 新名）：", "Examples (old -> new):"));
      lines.push(examples.join("\n"));
    }
    lines.push("");
    lines.push(bilingual("是否继续？", "Continue?"));
    return lines.join("\n");
  }

  async function applyPlan(plan, mode) {
    const summary = { succeeded: 0, skipped: 0, failed: 0, details: [] };
    const total = plan.length;

    const prog = ZA.UI.progress(
      bilingual("ZotAssets 应用中…", "ZotAssets applying…")
    );
    prog.update(0, total);
    await yieldToUI();

    let i = 0;
    for (const entry of plan) {
      i += 1;
      let res;
      try {
        if (mode === "rename") {
          // Force rename regardless of the autoRenamePdf preference.
          res = await ZA.RoleManager.setRole(entry.item, entry.detectedRole, {
            forceRename: true,
          });
        } else {
          // Roles only: persist + in-title label, never touch files.
          ZA.RoleStore.setRole(entry.item, entry.detectedRole);
          await ZA.RoleManager.applyTitleDisplay(entry.item, entry.detectedRole);
          res = {
            status: "saved",
            reasonKey: "result.roleSaved",
            name: entry.name,
          };
        }
      } catch (e) {
        Log.error("applyPlan entry failed", e);
        res = { status: "failed", reasonKey: "result.failed.generic", name: entry.name };
      }
      ZA.RoleManager._tally(summary, res);
      prog.update(i, total);
    }

    prog.close(1200);
    ZA.UI.summary(summary);
    return summary;
  }

  const AutoClassify = {
    buildPlan,

    /** Entry point: scan whole library, preview, confirm, apply. */
    async runLibrary(win) {
      try {
        const attachments = await getAllAttachments();
        await this._previewAndApply(win, attachments);
      } catch (e) {
        Log.error("runLibrary failed", e);
        ZA.UI.alert("ZotAssets", bilingual("自动分类失败。", "Auto-classify failed."));
      }
    },

    /** Entry point: scan attachments of the current selection. */
    async runSelection(win, items) {
      try {
        const attachments = attachmentsFromSelection(items);
        await this._previewAndApply(win, attachments);
      } catch (e) {
        Log.error("runSelection failed", e);
        ZA.UI.alert("ZotAssets", bilingual("自动分类失败。", "Auto-classify failed."));
      }
    },

    async _previewAndApply(win, attachments) {
      if (!attachments || !attachments.length) {
        ZA.UI.alert(
          "ZotAssets",
          bilingual("没有找到可分类的附件。", "No attachments found to classify.")
        );
        return;
      }

      // Scanning reads first-page PDF text and can be slow on big libraries,
      // so show a determinate progress bar instead of leaving the UI blank.
      const scanProg = ZA.UI.progress(
        bilingual("ZotAssets 扫描中…", "ZotAssets scanning…")
      );
      scanProg.update(0, attachments.length);
      await yieldToUI();
      const plan = await buildPlan(attachments, (done, total) =>
        scanProg.update(done, total)
      );
      scanProg.close(900);

      if (!plan.length) {
        ZA.UI.alert(
          "ZotAssets",
          bilingual(
            "未在期刊论文中识别到正文 PDF 或补充材料，已保持不变。\n（学位论文、会议论文和书籍不会自动加后缀。）",
            "No Main PDF or Supplement detected in journal articles; nothing changed.\n(Theses, conference papers and books are not auto-suffixed.)"
          )
        );
        return;
      }
      const previewText = buildPreviewText(plan, attachments.length);
      const title = bilingual("ZotAssets 自动分类", "ZotAssets auto-classify");

      // Step 1: proceed?
      let proceed = false;
      try {
        proceed = Services.prompt.confirm(win || null, title, previewText);
      } catch (e) {
        Log.error("preview confirm failed", e);
        return;
      }
      if (!proceed) {
        ZA.UI.toast("ZotAssets", bilingual("已取消。", "Cancelled."));
        return;
      }

      // Step 2: also rename PDFs, or roles only?
      let doRename = false;
      try {
        doRename = Services.prompt.confirm(
          win || null,
          title,
          bilingual(
            "是否同时按模板重命名所有 PDF 文件？\n\n[确定] = 重命名 PDF 并写入角色\n[取消] = 只写入角色，不改文件名",
            "Also rename all PDF files using the template?\n\n[OK] = rename PDFs and assign roles\n[Cancel] = assign roles only, keep file names"
          )
        );
      } catch (e) {
        Log.warn("rename confirm failed; defaulting to roles only", e);
        doRename = false;
      }

      await applyPlan(plan, doRename ? "rename" : "rolesonly");
    },
  };

  ZA.AutoClassify = AutoClassify;
})();
