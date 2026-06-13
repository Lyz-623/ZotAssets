# ZotAssets

ZotAssets is a Zotero plugin for managing **attachment asset roles**. It lets you
tag each attachment under an item with a single primary role — Main PDF,
Supplementary material, Data, Code, Figure/table, Translation, Scan, Publisher
version, Accepted manuscript, Preprint, or Other — and (for PDFs) automatically
renames the file from a configurable template.

- **Architecture:** Zotero 7+ bootstrapped plugin (no Zotero 6 overlay).
- **Compatibility:** Zotero 7, 8 and 9 via an explicit compatibility layer with
  API fallbacks.
- **Languages:** English and Simplified Chinese (简体中文).

---

## Features

- Built-in asset roles; one **primary role per attachment**.
- Role data is **bound to the attachment item** and persisted across restarts —
  without touching the attachment's stored path, note, or tags.
- Attachment context menu: **Edit role… / Set role ▸ / Clear role / Rename by role**,
  for single items **and batches**.
- Roles shown in the Zotero UI as a short label in the attachment title.
- A simple **role editor dialog** (view current role, pick a new one, OK/Cancel),
  with a native picker fallback.
- **Automatic PDF renaming** on role change, using a safe, cross-platform file
  name template.
- Centralized settings; every Zotero API and file-system call is wrapped in
  error handling and logging. Batch operations report a **succeeded / skipped /
  failed** summary.

### PDF renaming

When you set or change the role of a **PDF** attachment, the file is renamed
using the template (default):

```
{firstAuthorLastName}_{year}_{parentTitle}__{role}.pdf
```

Examples:

```
Smith_2021_Deep Learning for Citation Analysis__MainPDF.pdf
Smith_2021_Deep Learning for Citation Analysis__Supplement.pdf
Smith_2021_Deep Learning for Citation Analysis__AcceptedMS.pdf
```

Rules:

- Only **PDFs** are renamed; non-PDF attachments only get the role saved.
- First-author surname, year, parent title and role tag are all made
  **file-name safe** on Windows/macOS/Linux.
- Missing author/year/title fall back to safe placeholders (`Unknown` / `0000`
  / `Untitled`) instead of failing.
- If the target name already exists, a suffix is appended: `__2`, `__3`, …
- After renaming, the attachment **title is updated to match** the file name.
- The **original file name is captured once** (before the first rename) for
  rollback/troubleshooting; the new name never embeds the old one.
- **Linked files are not renamed** unless you explicitly enable it.
- Missing/locked files, or attachments without a parent item, are handled
  safely and reported.

---

## Installation

### From a built `.xpi`

1. Build the package (see **Build & package**) or download a release `.xpi`.
2. In Zotero: **Tools → Plugins** (Zotero 7+), click the **gear** icon →
   **Install Plugin From File…**, and choose `dist/ZotAssets-<version>.xpi`.
3. Restart Zotero if prompted.

### Verify

Right-click an attachment under any item — you should see a **ZotAssets**
submenu.

---

## Development & debugging

This is a bootstrapped plugin, so you can run it from source without a build:

1. Locate your Zotero **profile** directory
   (Help → "Show Data Directory" gives the data dir; the profile is alongside,
   under `…/Zotero/Profiles/<xxxx>` or set via `about:profiles` in a Zotero dev
   build).
2. Create a "proxy file" pointing at this repo's `addon/` folder:
   - File name = the plugin ID: `zotassets@yunze.dev`
   - Put it in `<profile>/extensions/`
   - Its single line of content is the **absolute path to the `addon` folder**,
     e.g. `C:\OneDrive\AI tool\ZotAssets\addon`
3. Start Zotero with developer flags so changes reload and errors surface:
   ```
   zotero -purgecaches -ZoteroDebug -jsconsole
   ```
4. Logs: every ZotAssets message is prefixed `[ZotAssets]` in **Help → Debug
   Output Logging** and in the **Error Console** (Tools → Developer →
   Error Console / `jsconsole`).

### Project layout

```
addon/
  manifest.json            WebExtension manifest (Zotero 7+)
  bootstrap.js             Thin lifecycle entry (install/startup/shutdown/...)
  prefs.js                 Mirror of default prefs (authoritative copy is in code)
  content/
    zotassets.js           Orchestrator: loads modules, manages windows
    roleDialog.xhtml        Role editor dialog UI
    roleDialog.js           Role editor dialog controller
    icons/                  Toolbar/listing icons
    modules/
      log.js               Defensive logging
      prefs.js             Settings manager (defaults + get/set)
      strings.js           In-JS i18n table (en / zh-CN)
      compat.js            Zotero 7/8/9 + platform API compatibility layer
      roles.js             Built-in role definitions
      roleStore.js         Per-item role persistence (JSON pref blob)
      filename.js          File-name sanitization + template rendering
      rename.js            PDF rename engine
      roleManager.js       High-level set/clear/rename + batch orchestration
      ui.js                User notifications + batch summaries
      dialog.js            Role dialog launcher (+ native fallback)
      menu.js              Item context-menu integration
scripts/
  build.ps1                Build .xpi with PowerShell (no Node needed)
  build.js                 Build .xpi with Node (archiver or system zip)
```

The deliberate split keeps `bootstrap.js` thin and all real logic modular.

---

## Build & package

### PowerShell (no Node.js required) — recommended on Windows

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

Produces `dist/ZotAssets-<version>.xpi`.

### Node.js (cross-platform)

```bash
npm install      # optional, only to use the bundled 'archiver'
npm run build
```

If `archiver` is not installed, the Node script falls back to the system zip
tool (`Compress-Archive` on Windows, `zip` elsewhere).

An `.xpi` is just a ZIP with `manifest.json` at its root.

---

## Settings

Settings live under the `extensions.zotassets.` preference branch. Until a
dedicated preference pane is added, edit them via Zotero's **Config Editor**
(Settings/Preferences → Advanced → Config Editor):

| Key (after `extensions.zotassets.`) | Type    | Default | Meaning |
|-------------------------------------|---------|---------|---------|
| `autoRenamePdf`                     | bool    | `true`  | Auto-rename PDFs when a role changes |
| `renameLinkedFiles`                 | bool    | `false` | Allow renaming **linked** files |
| `showRoleInTitle`                   | bool    | `true`  | Show the role tag in the attachment title |
| `filenameTemplate`                  | string  | `{firstAuthorLastName}_{year}_{parentTitle}__{role}.pdf` | PDF file-name template |
| `language`                          | string  | `auto`  | `auto` \| `en` \| `zh` |
| `roleData`                          | string  | `{}`    | Internal: JSON map of saved roles (do not edit by hand) |

### Changing the PDF naming template

Edit `filenameTemplate`. Supported placeholders:

- `{firstAuthorLastName}` — first author's surname (sanitized)
- `{year}` — 4-digit year (sanitized)
- `{parentTitle}` — parent item title (sanitized, length-bounded)
- `{role}` — the role's ASCII short tag (e.g. `MainPDF`)

The template's literal text is also sanitized, and a single `.pdf` extension is
always enforced.

### Changing the role list

Edit `addon/content/modules/roles.js`. Each role is:

```js
{ id: "main_pdf", tag: "MainPDF", en: "Main PDF", zh: "正文 PDF" }
```

- `id` — stable internal id (persisted value); don't reuse an id for a different
  meaning.
- `tag` — ASCII-only short label used in file names (no path separators).
- `en` / `zh` — display names.

Rebuild and reinstall after editing.

### UI text / localization

All UI strings live in `addon/content/modules/strings.js` as an `en` and `zh`
table. Add a language by extending that table and the `resolve()` logic.

---

## Adapting to future Zotero versions

All version-sensitive behavior is funneled through
`addon/content/modules/compat.js`:

- **Version detection:** `Compat.version()`, `Compat.majorVersion()`,
  `Compat.atLeast(n)`.
- **File system:** path/exists helpers try `IOUtils`/`PathUtils` first, then
  `OS.File`/`OS.Path`, then `nsIFile`. When a future Zotero drops an API, only
  this layer needs updating.
- **Attachment API:** path resolution, link-mode checks, parent lookup, file
  rename and item saving are all wrapped with try/fallback.

`manifest.json` declares `strict_max_version` `9.*`. To support a Zotero 10,
bump that, verify against `compat.js`, and add fallbacks there if any API
changed — the rest of the plugin should be unaffected.

---

## Safety & recovery

- Role data is stored separately from Zotero's attachment fields; clearing a
  role or uninstalling does **not** delete your files.
- The original file name is recorded before the first rename
  (`extensions.zotassets.roleData`), so you can recover it if needed.
- No single failing operation can crash Zotero or the plugin — every API and
  file call is guarded and logged.

---

## License

MIT — see `package.json`.
