/* eslint-disable */
// Default preferences for ZotAssets.
//
// NOTE: The authoritative defaults live in content/modules/prefs.js (so the
// plugin works even if this file is not loaded by the host). This file mirrors
// them for documentation and for hosts that read bootstrapped prefs.js.

pref("extensions.zotassets.autoRenamePdf", true);
pref("extensions.zotassets.renameLinkedFiles", false);
pref("extensions.zotassets.showRoleInTitle", true);
pref("extensions.zotassets.filenameTemplate", "{firstAuthorLastName}_{year}_{parentTitle}__{role}.pdf");
pref("extensions.zotassets.language", "auto");
