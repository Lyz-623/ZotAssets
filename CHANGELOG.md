# Changelog

All notable changes to ZotAssets are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.3.3] - 2026-06-14

### Changed
- Reworked automatic Main PDF vs Supplement detection to use conservative
  evidence scoring instead of broad single-keyword matches. Supplement
  detection now requires strong SI signals from the file name, opening title, or
  first-page SI figure/table markers; Main PDF detection uses parent title, DOI,
  journal name, abstract/摘要, keywords, and article metadata.
- Added per-parent Main PDF disambiguation: when multiple PDFs in one item look
  like possible main files, ZotAssets only auto-selects a clearly stronger
  candidate and otherwise leaves them unchanged for manual review.
- Chinese journal articles keep stored roles but no longer get visible role
  suffixes in generated filenames or attachment titles.

## [0.3.2] - 2026-06-14

### Fixed
- Role labels shown in attachment titles for unrenamed PDF files are now placed
  before the `.pdf` extension (`Title [Supplement].pdf`) instead of after it
  (`Title.pdf [Supplement]`).
- Clearing or rewriting a title role label now removes both the old trailing
  format and the corrected pre-extension format, so existing affected titles can
  be normalized by applying the role again.

## [0.3.1] - 2026-06-14

### Fixed
- Auto-classification now only operates on Zotero `journalArticle` parent
  items. Theses, conference papers, books, and other item types are left
  unchanged, so they do not receive automatic role suffixes.
- Progress windows now show visible `done / total` text and percentage from
  the start of both the scan and apply phases, avoiding blank-looking progress
  windows during auto-classification.

## [0.3.0] - 2026-06-14

### Changed
- **Detection is now content-based** (reads the PDF's first-page text via
  Zotero's PDF text engine, with a fallback to indexed full text), not file-name
  based:
  - **Supplement** — first page contains an explicit supplementary marker
    (Supplementary/Supporting Information, Supplementary Material, Supplement,
    `SI <heading>`, ESI, 补充材料/信息).
  - **Main PDF** — first page contains **both a DOI and the parent's journal
    name** (`publicationTitle`/`journalAbbreviation`).
  - Anything not confidently matched is left unchanged for manual assignment.
- **README split into separate language files**: English in `README.md`,
  Simplified Chinese in `README.zh-CN.md`, with a language switcher at the top.
  No more mixed bilingual lines.

### Added
- **Determinate progress bars** for both the scan phase (first-page text
  extraction) and the apply phase, so large libraries no longer appear frozen.
- `Compat.getPdfHeadText(item, maxPages)` — first-page PDF text extraction with
  `PDFWorker` → indexed `attachmentText` fallback.

## [0.2.1] - 2026-06-14

### Changed
- **Auto-classification is now conservative**: it only auto-detects **Main PDF**
  and **Supplement**. Any attachment not confidently one of those is **left
  unchanged** so the user can assign a role manually. This removes the
  error-prone Data/Code/Figure/etc. auto-guessing.
- **Main PDF file-name tag changed from `MainPDF` to `Main`** (e.g.
  `Smith_2021_Title_Main.pdf`). Other role tags are unchanged.
- Auto-classify preview now shows how many attachments are left unchanged, and a
  clear notice when nothing was detected.

### Notes
- All 11 roles remain available for manual assignment (Edit role / Set role).

## [0.2.0] - 2026-06-14

### Added
- **Automatic role classification.** New "Auto-classify selected items…" and
  "Auto-classify entire library…" commands. Each attachment's role is guessed
  from its file name, content type/extension, parent title and sibling context
  (`classifier.js`).
- **Preview-first, safe workflow** for library-wide runs (`autoClassify.js`): a
  preview shows the per-role counts and example renames, then asks (1) whether to
  proceed and (2) whether to also rename PDFs or only write roles. Nothing is
  changed until both confirmations pass.
- **Clear role can restore the original file name** for PDFs that were renamed,
  using the original name captured before the first rename (`Rename.restoreOriginal`).
- Bilingual (EN / 中文) preview, prompts and summaries.

### Changed
- **Edit role** now uses the native `Services.prompt.select` picker by default
  (set `extensions.zotassets.useCustomDialog=true` for the XHTML dialog). This
  fixes Edit doing nothing on some Zotero builds where the custom dialog's accept
  wiring was version-fragile.
- The ZotAssets context submenu now appears whenever items are selected (so the
  auto-classify commands are reachable), with per-attachment actions enabled only
  when attachments are selected.
- Default PDF file-name template uses a single underscore before the role tag:
  `{firstAuthorLastName}_{year}_{parentTitle}_{role}.pdf` (was `__{role}`).

### Fixed
- Edit role / Clear role not appearing to work: Edit now uses a reliable native
  picker; Clear gives explicit feedback and can optionally restore original names.

## [0.1.0] - 2026-06-14

Initial prototype.

### Added
- Zotero 7+ bootstrapped plugin scaffold (`manifest.json`, thin `bootstrap.js`,
  modular `content/modules/*`).
- Compatibility layer (`compat.js`) covering Zotero 7/8/9 and platform file-system
  APIs (`IOUtils`/`PathUtils` → `OS.File`/`OS.Path` → `nsIFile`).
- Eleven built-in asset roles with English and Simplified Chinese labels.
- Per-attachment role persistence in a dedicated pref blob, leaving attachment
  path/note/tags untouched and surviving restarts.
- Item context menu: Edit role…, Set role ▸ (quick list), Clear role, Rename by
  role — for single items and batches.
- Role editor dialog (`roleDialog.xhtml`) with a native `prompt.select` fallback.
- In-title role label (configurable).
- Automatic PDF renaming from a configurable, cross-platform-safe template, with
  unique-suffix collision handling, original-filename capture, linked-file
  guard, and title sync.
- Centralized settings under `extensions.zotassets.`.
- Batch operations report succeeded / skipped / failed summaries.
- Build scripts: PowerShell (`build.ps1`, no Node) and Node (`build.js`).
- README, testing checklist, and `update.json` template.

[Unreleased]: https://github.com/Lyz-623/ZotAssets/compare/v0.3.3...HEAD
[0.3.3]: https://github.com/Lyz-623/ZotAssets/compare/v0.3.2...v0.3.3
[0.3.2]: https://github.com/Lyz-623/ZotAssets/compare/v0.3.1...v0.3.2
[0.3.1]: https://github.com/Lyz-623/ZotAssets/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/Lyz-623/ZotAssets/compare/v0.2.1...v0.3.0
[0.2.1]: https://github.com/Lyz-623/ZotAssets/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Lyz-623/ZotAssets/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Lyz-623/ZotAssets/releases/tag/v0.1.0
