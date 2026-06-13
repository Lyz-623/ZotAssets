# Changelog

All notable changes to ZotAssets are documented here. The format is based on
[Keep a Changelog](https://keepachangelog.com/), and this project adheres to
[Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed
- Default PDF file-name template now uses a single underscore before the role
  tag: `{firstAuthorLastName}_{year}_{parentTitle}_{role}.pdf` (was `__{role}`).
  Existing custom `filenameTemplate` prefs are unaffected; only the default
  changed.

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

[Unreleased]: https://github.com/Lyz-623/ZotAssets/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Lyz-623/ZotAssets/releases/tag/v0.1.0
