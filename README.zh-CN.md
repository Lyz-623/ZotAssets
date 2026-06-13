<div align="center">

<img src="docs/banner.svg" alt="ZotAssets" width="100%"/>

# ZotAssets

[English](README.md) · **简体中文**

**ZotAssets 是一个 Zotero 附件资产管理插件：为每个附件标注"资产角色"（正文 PDF、补充材料、数据、代码、图表、译文、扫描件、出版商版本、作者接受稿、预印本……），可根据 PDF 正文内容自动识别"正文 PDF"和"补充材料"，并按模板自动重命名 PDF。**

[最新版本](https://github.com/Lyz-623/ZotAssets/releases/latest) · [更新日志](CHANGELOG.md) · [打赏支持](#打赏支持)

兼容 **Zotero 7 / 8 / 9** · bootstrapped 插件（非 overlay）

</div>

---

## 它解决什么问题

在大型文献库里，一个条目下往往挂着很多附件：正文、补充材料、数据、代码、扫描件……但
Zotero 把它们一视同仁。ZotAssets 给每个附件一个**主资产角色**，在界面上显示出来，并对
PDF 按统一模板重命名，让你一眼区分。可针对**单个条目、选中项或整个文献库**批量处理。

## 主要功能

| 功能 | 说明 |
|---|---|
| 资产角色 | 内置 11 种角色，每个附件一个主角色。 |
| 基于内容的自动识别 | 读取 PDF **第一页正文**，**仅**识别"正文 PDF"和"补充材料"（见下文）。其余附件保持不变，由你手动设置。 |
| 先预览 | 整库 / 选中项运行会先显示各角色数量、保持不变的数量以及重命名示例，确认后才执行。 |
| 进度条 | 扫描和应用阶段都显示明确的进度条，不会让窗口"凭空消失"。 |
| PDF 自动重命名 | 按跨平台安全模板重命名 PDF，并同步标题。 |
| 不破坏数据 | 角色单独存储，不动附件路径、笔记和标签。 |
| 可恢复 | 首次重命名前保存原始文件名；清除角色可一键恢复。 |
| 批量与汇总 | 单个或批量操作都会汇总成功 / 跳过 / 失败。 |
| 中英双语 | 菜单、对话框、预览与汇总支持中英双语。 |

## 自动识别的原理

识别**基于正文内容**——读取每个 PDF 的第一页文本（使用 Zotero 的 PDF 文本引擎），而不是
根据文件名猜测：

- **补充材料**——第一页出现明确的补充材料标识，例如 *Supplementary Information*、
  *Supporting Information*、*Supplementary Material*、*Supplement*、*SI &lt;标题词&gt;*
  形式的引用，或中文 *补充材料 / 补充信息*。
- **正文 PDF**——第一页**同时**出现 **DOI** 和父条目的**期刊名称**
  （`publicationTitle` / `journalAbbreviation`）。

任何不能明确归入上述两类的 PDF（以及所有非 PDF 附件）都会**保持不变**，由你手动设置角色。
全部 11 种角色仍可从菜单和"编辑角色"对话框手动指定。

> 提示：正文 PDF 的识别需要父条目的元数据中含有期刊名称。没有期刊信息的条目（书籍、学位
> 论文等）会保持不变，交由手动设置。

## 资产角色

| 角色 | 文件名后缀 |
|---|---|
| 正文 PDF | `Main` |
| 补充材料 | `Supplement` |
| 数据 | `Data` |
| 代码 | `Code` |
| 图表 | `Figure` |
| 译文 | `Translation` |
| 扫描件 | `Scan` |
| 出版商版本 | `Published` |
| 作者接受稿 | `AcceptedMS` |
| 预印本 | `Preprint` |
| 其他 | `Other` |

## 安装

1. 从 [Releases](https://github.com/Lyz-623/ZotAssets/releases/latest) 下载 `ZotAssets-<版本>.xpi`。
2. 打开 Zotero → **工具 → 插件**。
3. 点击齿轮图标 → **从文件安装插件…**。
4. 选择 `.xpi`，按提示重启 Zotero。

环境要求：Zotero 7 及以上。若浏览器直接打开了 `.xpi`，请右键点击下载链接选择"链接另存为…"。
安装后，ZotAssets 会通过 GitHub Releases **自动更新**。

## 使用方式

右键点击任意条目或附件，打开 **ZotAssets** 子菜单。

**自动：**

1. **自动识别选中项…**——识别选中条目下的附件。
2. **自动识别整个文献库…**——扫描全部。
3. 扫描时显示进度条；只自动识别"正文 PDF"和"补充材料"。
4. **预览**会显示各角色数量、保持不变的数量，以及 `旧名 → 新名` 示例。
5. 确认继续后，选择**重命名 PDF** 或**只写角色**。
6. 应用阶段显示进度条，并汇总成功 / 跳过 / 失败。

**手动：**

- **编辑角色…**——为单个附件选择角色（显示当前角色）。
- **设置角色 ▸**——为一个或多个附件快速设置角色。
- **清除角色**——移除角色；会询问是否同时恢复原始文件名。
- **按角色重命名**——用已存角色重新套用模板。

## PDF 重命名规则

当 **PDF** 附件被设置或修改角色时，按模板（默认）重命名：

```
{firstAuthorLastName}_{year}_{parentTitle}_{role}.pdf
```

示例：

```
Smith_2021_Deep Learning for Citation Analysis_Main.pdf
Smith_2021_Deep Learning for Citation Analysis_Supplement.pdf
Smith_2021_Deep Learning for Citation Analysis_AcceptedMS.pdf
```

规则：

- 只重命名 **PDF**；非 PDF 只保存角色。
- 作者姓、年份、标题、角色短标签都做跨平台文件名安全处理。
- 缺少作者/年份/标题时使用安全占位符 `Unknown` / `0000` / `Untitled`。
- 目标名冲突时追加后缀：`__2`、`__3`……
- 重命名后同步附件标题。
- 首次重命名前保存原始文件名，便于回滚。
- 默认不重命名链接文件，除非显式启用。
- 文件缺失、被占用、无父条目等情况安全处理并提示。

## 设置项

设置项位于 `extensions.zotassets.` 分支。在加入独立设置面板之前，可在
**设置 → 高级 → 配置编辑器** 中修改。

| 键名（`extensions.zotassets.` 之后） | 默认值 | 含义 |
|---|---|---|
| `autoRenamePdf` | `true` | 角色变化时自动重命名 PDF |
| `renameLinkedFiles` | `false` | 允许重命名链接文件 |
| `showRoleInTitle` | `true` | 在附件标题中显示角色 |
| `filenameTemplate` | `{firstAuthorLastName}_{year}_{parentTitle}_{role}.pdf` | PDF 命名模板 |
| `language` | `auto` | `auto` \| `en` \| `zh` 界面语言 |
| `useCustomDialog` | `false` | 使用 XHTML 对话框替代原生选择器 |
| `roleData` | `{}` | 内部角色存储（请勿手改） |

### 修改命名模板

编辑 `filenameTemplate`。占位符：`{firstAuthorLastName}` · `{year}` ·
`{parentTitle}` · `{role}`。模板始终强制单个 `.pdf` 扩展名。

### 修改角色列表 / 识别规则

角色定义在 [`addon/content/modules/roles.js`](addon/content/modules/roles.js)。
基于内容的识别规则（补充材料标识、DOI 正则、期刊名匹配）在
[`addon/content/modules/classifier.js`](addon/content/modules/classifier.js)。

### 界面语言

所有 UI 文案在 [`addon/content/modules/strings.js`](addon/content/modules/strings.js)（`en` / `zh`）。

## 开发构建

PowerShell（无需 Node）：

```powershell
powershell -ExecutionPolicy Bypass -File scripts\build.ps1
```

Node.js（跨平台）：

```bash
npm run build
```

打包结果在 `dist/ZotAssets-<版本>.xpi`。`.xpi` 本质就是 `manifest.json` 位于根目录的 ZIP
（使用正斜杠条目名，确保 Zotero 的 zip 读取器可加载）。

## 开发调试

这是 bootstrapped 插件，可直接从源码运行：

1. 在 `<Zotero 配置目录>/extensions/` 下创建名为 `zotassets@yunze.dev` 的文件。
2. 文件内容仅一行：本仓库 `addon` 文件夹的绝对路径。
3. 用 `zotero -purgecaches -ZoteroDebug -jsconsole` 启动 Zotero。
4. 日志以 `[ZotAssets]` 为前缀，可在错误控制台 / Debug 输出中查看。

## 项目结构

```
addon/
  manifest.json            WebExtension 清单（Zotero 7+）
  bootstrap.js             精简的生命周期入口
  content/
    zotassets.js           编排器：加载模块、管理窗口
    roleDialog.xhtml/js     可选的 XHTML 角色对话框
    modules/
      compat.js            Zotero 7/8/9 + 平台 API 兼容层（含 PDF 取文）
      classifier.js        基于内容的角色识别（第一页文本）
      autoClassify.js      整库/选中项扫描 + 预览 + 应用（含进度）
      roleManager.js       设置/清除/重命名 + 批量编排
      rename.js            PDF 重命名 + 恢复原始名引擎
      filename.js          文件名安全处理 + 模板
      roleStore.js         按条目存储角色 + 原始文件名
      roles.js  strings.js  prefs.js  dialog.js  menu.js  ui.js  log.js
scripts/
  build.ps1  build.js       .xpi 打包
```

## 适配未来 Zotero 版本

所有版本相关逻辑都集中在 [`compat.js`](addon/content/modules/compat.js)：版本检测、文件
系统多层回退（`IOUtils`/`PathUtils` → `OS.File`/`OS.Path` → `nsIFile`）、PDF 取文
（`PDFWorker` → 索引的 `attachmentText`）、附件 API 封装。`manifest.json` 声明了
`strict_max_version` 为 `9.*`；适配新版本时，调整该值并只在 `compat.js` 补充回退即可。

## 安全与恢复

- 整库自动识别**先预览**，并在重命名前二次确认。
- 角色数据独立存储，清除角色或卸载插件都不会删除你的文件。
- 首次重命名前记录原始文件名，可随时恢复。
- 单个操作失败不会导致 Zotero 或插件整体不可用。

## 版本记录

- `0.3.0`：基于内容的识别（读取 PDF 第一页）——补充材料看明确标识，正文 PDF 看 DOI +
  期刊名；扫描与应用阶段显示明确进度条；README 拆分为中英两个独立文件。
- `0.2.1`：将自动识别限制为正文 PDF + 补充材料；正文后缀改为 Main。
- `0.2.0`：自动角色识别（选中项 + 整库），先预览。
- `0.1.0`：初始原型——角色、持久化、右键菜单、角色对话框、模板化 PDF 重命名。

详见 [CHANGELOG.md](CHANGELOG.md)。

## 打赏支持

ZotAssets 免费开源。如果它帮你节省了时间，欢迎 Star 或打赏支持。

| PayPal | 微信支付 | 支付宝 |
|:---:|:---:|:---:|
| <img src="docs/donate/paypal.jpg" width="180" alt="PayPal QR"/> | <img src="docs/donate/wechat.jpg" width="180" alt="WeChat Pay QR"/> | <img src="docs/donate/alipay.jpg" width="180" alt="Alipay QR"/> |

## 许可

MIT — 见 [LICENSE](LICENSE)。
