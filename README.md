<div align="center">

<img src="docs/banner.svg" alt="ZotAssets" width="100%"/>

# ZotAssets

**EN:** A Zotero plugin for attachment asset roles, content-based PDF classification, and safe PDF renaming.<br>
**中文：** 为 Zotero 附件标注资产角色，基于 PDF 内容识别正文和补充材料，并按模板安全重命名 PDF。

[Latest release](https://github.com/Lyz-623/ZotAssets/releases/latest) | [Changelog](CHANGELOG.md) | [Support](SUPPORT.md)

Compatible with **Zotero 7 / 8 / 9** | Bootstrapped plugin, no overlay

</div>

---

## What It Does / 它做什么

ZotAssets helps keep large Zotero libraries tidy when one item has many attachments: main PDF, supplements, datasets, code, scans, translations, and manuscript versions. It adds one primary role to each attachment, shows it in the UI, and can rename PDFs consistently so their purpose is clear at a glance.

ZotAssets 用来整理一个条目下的多个附件：正文 PDF、补充材料、数据、代码、扫描件、译文和不同稿件版本。它会给每个附件记录一个主角色，在界面中显示，并可按统一模板重命名 PDF，让文件用途一眼可见。

## Highlights / 亮点

| Feature | 中文 | Notes |
|---|---|---|
| Asset roles | 附件资产角色 | 11 built-in roles, one primary role per attachment |
| Content-based detection | 基于内容识别 | Reads first-page PDF text, not file names |
| Preview before changes | 先预览再执行 | Shows role counts, unchanged items, and rename examples |
| Determinate progress | 明确进度条 | Scanning and applying do not freeze silently |
| Safe PDF renaming | 安全重命名 PDF | Cross-platform file-name sanitization and collision suffixes |
| Non-destructive | 不破坏原数据 | Roles are stored separately; paths, notes, and tags are untouched |
| Reversible | 可恢复 | Original file names are saved before the first rename |
| Bilingual UI | 中英双语界面 | Menus, dialogs, previews, and summaries support English and Simplified Chinese |

## Auto-Detection / 自动识别

Auto-detection is deliberately conservative. It reads the **first page** of each PDF through Zotero's PDF text engine and only assigns:

- **Main PDF / 正文 PDF**: the first page contains both a DOI and the parent item's journal name (`publicationTitle` or `journalAbbreviation`).
- **Supplement / 补充材料**: the first page contains explicit supplement markers such as `Supplementary Information`, `Supporting Information`, `Supplementary Material`, `Supplement`, `SI <heading>`, or `补充材料 / 补充信息`.

All other PDFs, and all non-PDF attachments, are left unchanged for manual assignment. This avoids turning uncertain guesses into bad metadata.

## Asset Roles / 资产角色

| Role | 中文 | File-name tag |
|---|---|---|
| Main PDF | 正文 PDF | `Main` |
| Supplementary material | 补充材料 | `Supplement` |
| Data | 数据 | `Data` |
| Code | 代码 | `Code` |
| Figure / table | 图表 | `Figure` |
| Translation | 译文 | `Translation` |
| Scan | 扫描件 | `Scan` |
| Publisher version | 出版商版本 | `Published` |
| Accepted manuscript | 作者接收稿 | `AcceptedMS` |
| Preprint | 预印本 | `Preprint` |
| Other | 其他 | `Other` |

## Install / 安装

1. Download `ZotAssets-<version>.xpi` from [Releases](https://github.com/Lyz-623/ZotAssets/releases/latest).
2. In Zotero, open **Tools > Plugins** / **工具 > 插件**.
3. Click the gear icon and choose **Install Plugin From File...** / **从文件安装插件...**.
4. Select the `.xpi`, then restart Zotero if prompted.

Requires Zotero 7 or later. If your browser opens the `.xpi` directly, right-click the release asset and choose **Save link as...**. After installation, ZotAssets can auto-update from GitHub Releases.

## Usage / 使用

Right-click an item or attachment and open the **ZotAssets** submenu.

**Automatic / 自动：**

1. Choose **Auto-classify selected items** or **Auto-classify entire library**.
2. Review the preview: role counts, unchanged count, and `old -> new` rename examples.
3. Confirm, then choose whether to rename PDFs or only write roles.
4. Check the final summary for succeeded, skipped, and failed items.

**Manual / 手动：**

- **Edit role / 编辑角色**: pick a role for one attachment.
- **Set role / 设置角色**: quickly assign a role to one or many attachments.
- **Clear role / 清除角色**: remove the role and optionally restore original file names.
- **Rename by role / 按角色重命名**: re-apply the template using the stored role.

## PDF Renaming / PDF 重命名

Default template:

```text
{firstAuthorLastName}_{year}_{parentTitle}_{role}.pdf
```

Examples:

```text
Smith_2021_Deep Learning for Citation Analysis_Main.pdf
Smith_2021_Deep Learning for Citation Analysis_Supplement.pdf
Smith_2021_Deep Learning for Citation Analysis_AcceptedMS.pdf
```

Rules are intentionally safe:

- Only PDFs are renamed; non-PDF attachments only receive the saved role.
- Author, year, title, and role are sanitized for Windows, macOS, and Linux.
- Missing metadata falls back to `Unknown`, `0000`, and `Untitled`.
- Name collisions receive suffixes such as `__2` and `__3`.
- Attachment titles stay in sync with file names.
- Original file names are captured once for rollback.
- Linked files are not renamed unless `renameLinkedFiles` is enabled.

## Settings / 设置

Until a dedicated settings pane is added, edit preferences in Zotero's **Settings > Advanced > Config Editor** under `extensions.zotassets.`.

| Key | Default | Meaning |
|---|---|---|
| `autoRenamePdf` | `true` | Rename PDFs when roles change |
| `renameLinkedFiles` | `false` | Allow renaming linked files |
| `showRoleInTitle` | `true` | Show the role tag in attachment titles |
| `filenameTemplate` | `{firstAuthorLastName}_{year}_{parentTitle}_{role}.pdf` | PDF naming template |
| `language` | `auto` | `auto`, `en`, or `zh` |
| `useCustomDialog` | `false` | Use the XHTML role picker instead of the native picker |
| `roleData` | `{}` | Internal role storage, do not edit manually |

Role definitions live in [`addon/content/modules/roles.js`](addon/content/modules/roles.js). Detection rules live in [`addon/content/modules/classifier.js`](addon/content/modules/classifier.js). UI strings live in [`addon/content/modules/strings.js`](addon/content/modules/strings.js).

## Build / 构建

PowerShell, no Node.js required:

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

Node.js:

```bash
npm run build
```

The packaged plugin is created at `dist/ZotAssets-<version>.xpi`.

## Development / 开发调试

Run from source by placing a file named `zotassets@yunze.dev` in `<Zotero profile>/extensions/`. Its only content should be the absolute path to this repository's `addon` folder. Start Zotero with:

```bash
zotero -purgecaches -ZoteroDebug -jsconsole
```

Logs are prefixed with `[ZotAssets]` in Zotero's Error Console / Debug Output.

## Project Layout / 项目结构

```text
addon/
  manifest.json            WebExtension manifest for Zotero 7+
  bootstrap.js             Lifecycle entry
  content/
    zotassets.js           Module loader and window orchestration
    roleDialog.xhtml/js     Optional XHTML role picker
    modules/
      compat.js            Zotero 7/8/9 compatibility and PDF text access
      classifier.js        Content-based role detection
      autoClassify.js      Scan, preview, apply, and progress handling
      roleManager.js       Set, clear, rename, and batch orchestration
      rename.js            PDF rename and restore-original engine
      filename.js          File-name sanitization and template expansion
      roleStore.js         Role and original-name persistence
      roles.js             Built-in roles
      strings.js           English and Chinese UI strings
scripts/
  build.ps1
  build.js
```

## Safety / 安全性

- Library-wide auto-classify is preview-gated and asks before renaming.
- Role data is stored separately from Zotero fields.
- Clearing a role or uninstalling the plugin does not delete files.
- Individual failures are reported without crashing Zotero or the plugin.

## Support / 支持

ZotAssets is free and open source. A GitHub star helps others find it. If it saves you time and would like to support ongoing maintenance, you can buy me a coffee through the options in [SUPPORT.md](SUPPORT.md).

ZotAssets 是免费开源项目。GitHub Star 可以帮助更多人发现它。如果它确实帮你节省了时间，也欢迎通过 [SUPPORT.md](SUPPORT.md) 中的方式请我喝杯咖啡，支持后续维护。

## License / 许可

MIT. See [LICENSE](LICENSE).
