# ZotAssets — Test checklist

Manual test plan for the prototype. Run against Zotero 7 first, then repeat the
core rows on Zotero 8 / 9 betas as they become available. Logs are prefixed
`[ZotAssets]` (Error Console / Debug Output).

## 0. Setup

- [ ] Build: `powershell -ExecutionPolicy Bypass -File scripts\build.ps1`
      produces `dist/ZotAssets-<version>.xpi`.
- [ ] Install the `.xpi` via Tools → Plugins → gear → Install Plugin From File.
- [ ] No startup errors in the Error Console.
- [ ] Right-clicking an attachment shows the **ZotAssets** submenu.

## 1. Menu visibility

- [ ] Selecting a **regular item** (no attachment) hides/greys the ZotAssets entry.
- [ ] Selecting **one attachment** shows all entries; **Edit role…** enabled.
- [ ] Selecting **multiple attachments** keeps batch entries; **Edit role…** disabled.

## 2. Role on a PDF (happy path)

Use an imported PDF whose parent has author + year + title.

- [ ] **Set role ▸ Main PDF** renames the file to
      `<Surname>_<Year>_<Title>__MainPDF.pdf` and updates the title to match.
- [ ] Changing to **Supplement** re-renames to `…__Supplement.pdf`.
- [ ] The role persists after **restarting Zotero**.
- [ ] **Edit role…** dialog shows the **current role** and lets you pick a new one.

## 3. PDF naming edge cases

- [ ] Parent with **no author** → uses `Unknown` (no error).
- [ ] Parent with **no date** → uses `0000`.
- [ ] Parent with **no title** → uses `Untitled`.
- [ ] Title with illegal chars (`: / \ ? * " < > |`) → sanitized, file still created.
- [ ] Setting the same role twice → no spurious `__2` suffix (no-op rename).
- [ ] Two attachments under the **same parent** set to the **same role** → second
      gets `…__2.pdf`.

## 4. Non-PDF & linked files

- [ ] Set a role on a **non-PDF** attachment → role saved, file **not renamed**,
      title shows `[Tag]` (if "show role in title" is on).
- [ ] With `renameLinkedFiles=false`, setting a role on a **linked PDF** →
      skipped with a "linked file" reason; file untouched.
- [ ] With `renameLinkedFiles=true`, the linked PDF **is** renamed.

## 5. Clear / rename-by-role

- [ ] **Clear role** removes the stored role and strips the `[Tag]` title label;
      the file is **not** renamed back (by design).
- [ ] **Rename by role** on an item with a stored role re-applies the template
      (even if `autoRenamePdf=false`).
- [ ] **Rename by role** on an item with **no** stored role → skipped with a
      "no role" reason.

## 6. Batch operations

- [ ] Select a mix (PDFs, non-PDFs, one with a missing file) → **Set role**.
- [ ] Summary dialog reports correct **succeeded / skipped / failed** counts.
- [ ] Failed/skipped rows list a per-item reason.

## 7. Settings

- [ ] `autoRenamePdf=false` → setting a role on a PDF saves the role but does not
      rename (reason surfaced).
- [ ] `showRoleInTitle=false` → no `[Tag]` appended to titles.
- [ ] Edit `filenameTemplate` (e.g. drop `{year}`) → new names follow it.
- [ ] `language=zh` / `en` → menu and dialog switch language; `auto` follows Zotero.

## 8. Robustness / safety

- [ ] Set a role on an attachment whose file was **deleted on disk** → reported
      as "missing file", Zotero stays responsive.
- [ ] Lock the PDF (open it exclusively) and set a role → reported as rename
      failure, role still saved, no crash.
- [ ] Original file name is recorded in `extensions.zotassets.roleData` before
      the first rename.
- [ ] Disable then re-enable the plugin → menu removed then re-added cleanly; no
      duplicate menu entries.

## 9. Cross-version smoke (repeat 2, 4, 6 per version)

- [ ] Zotero 7
- [ ] Zotero 8
- [ ] Zotero 9
