<div align="center">

<img src="docs/banner.svg" alt="ZotAssets" width="100%"/>

# ZotAssets

**A Zotero plugin that gives every attachment an asset role — Main PDF, Supplement, Data, Code, Figure, Translation, Scan, Publisher version, Accepted manuscript, Preprint — auto-classifies your whole library, and auto-renames PDFs from a template.**

**ZotAssets 是一个 Zotero 附件资产管理插件：为每个附件标注"资产角色"（正文 PDF、补充材料、数据、代码、图表、译文、扫描件、出版商版本、作者接受稿、预印本……），可一键自动识别整个文献库，并按模板自动重命名 PDF。**

[Latest release / 最新版本](https://github.com/Lyz-623/ZotAssets/releases/latest) · [Changelog / 更新日志](CHANGELOG.md) · [Support / 打赏支持](#support--支持)

Compatible with **Zotero 7 / 8 / 9** · Bootstrapped plugin (no overlay)

</div>

---

## What it does / 它解决什么问题

In a large Zotero library every item ends up with several attachments — the main
PDF, supplements, datasets, code, scanned copies — but Zotero treats them all the
same. ZotAssets adds one **primary asset role** to each attachment, shows it in
the UI, and (for PDFs) renames the file consistently so you can tell them apart at
a glance. It can do this **for one item, a selection, or the entire library**.

在大型文献库里，一个条目下往往挂着很多附件：正文、补充材料、数据、代码、扫描件……但
Zotero 把它们一视同仁。ZotAssets 给每个附件一个**主资产角色**，在界面上显示出来，并
对 PDF 按统一模板重命名，让你一眼区分。可针对**单个条目、选中项或整个文献库**批量处理。

## Highlights / 主要功能

| Feature | Details / 说明 |
|---|---|
| Asset roles / 资产角色 | 11 built-in roles, one primary role per attachment. 内置 11 种角色，每个附件一个主角色。 |
| Auto-classify / 自动识别 | Guess each attachment's role from file name, type, extension and context — for a selection or the whole library. 根据文件名、类型、扩展名和上下文自动判断角色，支持选中项或整库。 |
| Preview first / 先预览 | Library runs show a per-role count + example renames and require confirmation before anything changes. 整库运行会先显示各角色数量与重命名示例，确认后才执行。 |
| PDF auto-rename / PDF 自动重命名 | Rename PDFs from a safe, cross-platform template; titles stay in sync. 按跨平台安全模板重命名 PDF，并同步标题。 |
| Non-destructive / 不破坏数据 | Roles are stored separately; attachment path, notes and tags are never touched. 角色单独存储，不动附件路径、笔记和标签。 |
| Reversible / 可恢复 | The original file name is captured before the first rename; Clear role can restore it. 首次重命名前保存原始文件名；清除角色可一键恢复。 |
| Batch + summary / 批量与汇总 | Single or batch operations report succeeded / skipped / failed. 单个或批量操作都会汇总成功 / 跳过 / 失败。 |
| EN / 中文 | Menus, dialogs, previews and summaries in English or Simplified Chinese. 菜单、对话框、预览与汇总支持中英双语。 |

## Asset roles / 资产角色

| Role / 角色 | Tag (in file name) | 中文 |
|---|---|---|
| Main PDF | `MainPDF` | 正文 PDF |
| Supplementary material | `Supplement` | 补充材料 |
| Data | `Data` | 数据 |
| Code | `Code` | 代码 |
| Figure / table | `Figure` | 图表 |
| Translation | `Translation` | 译文 |
| Scan | `Scan` | 扫描件 |
| Publisher version | `Published` | 出版商版本 |
| Accepted manuscript | `AcceptedMS` | 作者接受稿 |
| Preprint | `Preprint` | 预印本 |
| Other | `Other` | 其他 |

## Install / 安装

1. Download `ZotAssets-<version>.xpi` from [Releases](https://github.com/Lyz-623/ZotAssets/releases/latest).
2. Open Zotero → **Tools → Plugins / 工具 → 插件**.
3. Click the gear icon → **Install Plugin From File… / 从文件安装插件…**.
4. Select the `.xpi`, then restart Zotero if prompted.

Requirements: Zotero 7 or later. If your browser opens the `.xpi` directly,
right-click the release asset and choose "Save link as…".

环境要求：Zotero 7 及以上。若浏览器直接打开了 `.xpi`，请右键点击下载链接选择"链接另存为…"。

Once installed, ZotAssets **auto-updates** from GitHub Releases.
安装后，ZotAssets 会通过 GitHub Releases **自动更新**。

## Usage / 使用方式

Right-click any item or attachment to open the **ZotAssets** submenu.
右键点击任意条目或附件，打开 **ZotAssets** 子菜单。

**Automatic / 自动：**

1. **Auto-classify selected items… / 自动识别选中项…** — classify the attachments
   of the selected items.
2. **Auto-classify entire library… / 自动识别整个文献库…** — scan everything.
3. A **preview / 预览** shows how many attachments map to each role and example
   `old → new` renames.
4. Confirm to proceed, then choose **rename PDFs / 重命名 PDF** or **roles only /
   只写角色**.
5. A progress window runs and a summary reports succeeded / skipped / failed.

**Manual / 手动：**

- **Edit role… / 编辑角色…** — pick a role for a single attachment (shows the
  current role).
- **Set role ▸ / 设置角色 ▸** — quick-set a role for one or many attachments.
- **Clear role / 清除角色** — remove the role; you'll be asked whether to also
  restore original file names.
- **Rename by role / 按角色重命名** — re-apply the template using the stored role.

## PDF renaming / PDF 重命名规则

When a **PDF** attachment gets or changes a role, its file is renamed using the
template (default):

```
{firstAuthorLastName}_{year}_{parentTitle}_{role}.pdf
```

Examples / 示例:

```
Smith_2021_Deep Learning for Citation Analysis_MainPDF.pdf
Smith_2021_Deep Learning for Citation Analysis_Supplement.pdf
Smith_2021_Deep Learning for Citation Analysis_AcceptedMS.pdf
```

Rules / 规则:

- Only **PDFs** are renamed; non-PDF attachments only get the role saved.
  只重命名 **PDF**；非 PDF 只保存角色。
- Author surname, year, parent title and role tag are all made **file-name safe**
  on Windows/macOS/Linux. 作者姓、年份、标题、角色短标签都做跨平台文件名安全处理。
- Missing author/year/title fall back to `Unknown` / `0000` / `Untitled`.
  缺少作者/年份/标题时使用安全占位符。
- Target name collisions get a suffix: `__2`, `__3`, … 目标名冲突时追加 `__2`、`__3`。
- The attachment **title is kept in sync** with the file name. 重命名后同步标题。
- The **original file name is captured once** before the first rename for
  rollback. 首次重命名前保存原始文件名，便于回滚。
- **Linked files are not renamed** unless explicitly enabled. 默认不重命名链接文件。
- Missing/locked files and parent-less attachments are handled safely and
  reported. 文件缺失、被占用、无父条目等情况安全处理并提示。

## Settings / 设置项

Settings live under the `extensions.zotassets.` branch. Until a dedicated pane is
added, edit them in **Settings → Advanced → Config Editor**.
设置项位于 `extensions.zotassets.` 分支，可在 **设置 → 高级 → 配置编辑器** 中修改。

| Key (after `extensions.zotassets.`) | Default | Meaning / 含义 |
|---|---|---|
| `autoRenamePdf` | `true` | Auto-rename PDFs on role change / 角色变化时自动重命名 PDF |
| `renameLinkedFiles` | `false` | Allow renaming linked files / 允许重命名链接文件 |
| `showRoleInTitle` | `true` | Show the role tag in the attachment title / 在标题中显示角色 |
| `filenameTemplate` | `{firstAuthorLastName}_{year}_{parentTitle}_{role}.pdf` | PDF file-name template / PDF 命名模板 |
| `language` | `auto` | `auto` \| `en` \| `zh` / 界面语言 |
| `useCustomDialog` | `false` | Use the XHTML dialog instead of the native picker / 使用 XHTML 对话框 |
| `roleData` | `{}` | Internal role storage (do not edit) / 内部角色存储（请勿手改） |

### Changing the naming template / 修改命名模板

Edit `filenameTemplate`. Placeholders / 占位符:
`{firstAuthorLastName}` · `{year}` · `{parentTitle}` · `{role}`.
A single `.pdf` extension is always enforced. 模板始终强制单个 `.pdf` 扩展名。

### Changing the role list / 修改角色列表

Edit [`addon/content/modules/roles.js`](addon/content/modules/roles.js). Each role
is `{ id, tag, en, zh }`; keep `tag` ASCII-only. Detection keywords live in
[`addon/content/modules/classifier.js`](addon/content/modules/classifier.js).
角色定义在 `roles.js`，自动识别关键词在 `classifier.js`。

### UI language / 界面语言

All UI strings are in
[`addon/content/modules/strings.js`](addon/content/modules/strings.js) (`en` / `zh`).

## Build / 开发构建

PowerShell (no Node.js required / 无需 Node):

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

Node.js (cross-platform / 跨平台):

```bash
npm run build
```

The packaged plugin is created at `dist/ZotAssets-<version>.xpi`. An `.xpi` is
just a ZIP with `manifest.json` at the root (built with forward-slash entries so
Zotero's zip reader can load it).

## Development & debugging / 开发调试

This is a bootstrapped plugin, so you can run it from source:
这是 bootstrapped 插件，可直接从源码运行：

1. In `<Zotero profile>/extensions/`, create a file named `zotassets@yunze.dev`.
2. Its only content is the absolute path to this repo's `addon` folder.
3. Start Zotero with `zotero -purgecaches -ZoteroDebug -jsconsole`.
4. Logs are prefixed `[ZotAssets]` in the Error Console / Debug Output.

## Project layout / 项目结构

```
addon/
  manifest.json            WebExtension manifest (Zotero 7+)
  bootstrap.js             Thin lifecycle entry
  content/
    zotassets.js           Orchestrator: loads modules, manages windows
    roleDialog.xhtml/js     Optional XHTML role dialog
    modules/
      compat.js            Zotero 7/8/9 + platform API compatibility layer
      classifier.js        Heuristic role detection
      autoClassify.js      Library/selection scan + preview + apply
      roleManager.js       set/clear/rename + batch orchestration
      rename.js            PDF rename + restore-original engine
      filename.js          File-name sanitization + template
      roleStore.js         Per-item role + original-name persistence
      roles.js  strings.js  prefs.js  dialog.js  menu.js  ui.js  log.js
scripts/
  build.ps1  build.js       .xpi packaging
```

## Adapting to future Zotero versions / 适配未来 Zotero 版本

All version-sensitive behavior is funneled through
[`compat.js`](addon/content/modules/compat.js): version detection, file system
(`IOUtils`/`PathUtils` → `OS.File`/`OS.Path` → `nsIFile`), and attachment API
wrappers. `manifest.json` declares `strict_max_version` `9.*`; to support a future
Zotero, bump that and add any new fallbacks in `compat.js` only.

所有版本相关逻辑都集中在 `compat.js`：版本检测、文件系统多层回退、附件 API 封装。
适配新版本时，调整 `manifest.json` 的 `strict_max_version`，并只在 `compat.js` 补充回退即可。

## Safety & recovery / 安全与恢复

- Library-wide auto-classify is **preview-gated** and asks twice before renaming.
  整库自动识别**先预览**，并在重命名前二次确认。
- Role data is stored separately from Zotero's fields — clearing a role or
  uninstalling never deletes your files. 角色数据独立存储，清除或卸载都不会删除文件。
- The original file name is recorded before the first rename and can be restored.
  首次重命名前记录原始文件名，可随时恢复。
- No single failing operation can crash Zotero or the plugin. 单个操作失败不会影响整体。

## Version notes / 版本记录

- `0.2.0`: automatic role classification (selection + whole library) with a
  preview-first workflow; Clear role can restore original file names; Edit role
  switched to a reliable native picker; bilingual previews/prompts.
- `0.1.0`: initial prototype — roles, persistence, context menu, role dialog,
  template-based PDF renaming, EN/中文 strings, build scripts.

See [CHANGELOG.md](CHANGELOG.md) for details.

## Support / 支持

ZotAssets is free and open source. If it saves you time, a GitHub star or a small
tip helps keep the updates coming.

ZotAssets 免费开源。如果它帮你节省了时间，欢迎 Star 或打赏支持。

| PayPal | WeChat Pay / 微信支付 | Alipay / 支付宝 |
|:---:|:---:|:---:|
| <img src="docs/donate/paypal.jpg" width="180" alt="PayPal QR"/> | <img src="docs/donate/wechat.jpg" width="180" alt="WeChat Pay QR"/> | <img src="docs/donate/alipay.jpg" width="180" alt="Alipay QR"/> |

## License / 许可

MIT — see [LICENSE](LICENSE).
