# Changelog

All notable changes to ZotAssets are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

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

[Unreleased]: https://github.com/Lyz-623/ZotAssets/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/Lyz-623/ZotAssets/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/Lyz-623/ZotAssets/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Lyz-623/ZotAssets/releases/tag/v0.1.0
