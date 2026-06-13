/**
 * ZotAssets role editor dialog launcher.
 *
 * Primary UI: Services.prompt.select — a native, modal, single-selection picker
 * that is rock-solid across Zotero 7/8/9. It shows the current role in the
 * window title and lets the user pick a new one, with OK/Cancel. This was chosen
 * over a custom XHTML dialog because the latter's accept wiring proved
 * version-fragile.
 *
 * The XHTML dialog (content/roleDialog.xhtml) is still shipped and can be used
 * by setting pref "useCustomDialog" = true, but the native picker is the
 * default for reliability.
 *
 * Returns a roleId string, or null if the user cancelled.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  function nativePicker(parentWindow, item) {
    const Strings = ZA.Strings;
    const Roles = ZA.Roles;
    const roles = Roles.all();
    const currentRole = ZA.RoleStore.getRole(item);
    const currentLabel = currentRole ? Roles.label(currentRole) : Strings.get("dialog.none");

    const labels = roles.map((r) => Roles.label(r.id) + "  (" + r.tag + ")");
    const selected = { value: 0 };
    const curIdx = currentRole ? roles.findIndex((r) => r.id === currentRole) : -1;
    if (curIdx >= 0) selected.value = curIdx;

    const titleText =
      Strings.get("dialog.title") +
      "  —  " +
      Strings.get("dialog.currentRole") +
      " " +
      currentLabel;

    const ok = Services.prompt.select(
      parentWindow || null,
      titleText,
      Strings.get("dialog.selectRole"),
      labels.length,
      labels,
      selected
    );
    if (ok && selected.value >= 0 && selected.value < roles.length) {
      return roles[selected.value].id;
    }
    return null;
  }

  function customDialog(parentWindow, item) {
    const Strings = ZA.Strings;
    const Roles = ZA.Roles;
    const roles = Roles.all();
    const currentRole = ZA.RoleStore.getRole(item);

    const data = {
      roles: roles.map((r) => ({ id: r.id, label: Roles.label(r.id), tag: r.tag })),
      currentRoleId: currentRole,
      currentRoleLabel: currentRole ? Roles.label(currentRole) : Strings.get("dialog.none"),
      attachmentName: ZA.RoleManager.attachmentDisplayName(item),
      strings: {
        title: Strings.get("dialog.title"),
        heading: Strings.get("dialog.heading"),
        currentRole: Strings.get("dialog.currentRole"),
        selectRole: Strings.get("dialog.selectRole"),
        attachment: Strings.get("dialog.attachment"),
      },
      confirmed: false,
      selectedRoleId: currentRole,
    };

    const url = ZA.rootURI + "content/roleDialog.xhtml";
    parentWindow.openDialog(
      url,
      "zotassets-role-dialog",
      "chrome,dialog,modal,centerscreen,resizable=yes",
      data
    );
    if (data.confirmed && data.selectedRoleId && Roles.isValid(data.selectedRoleId)) {
      return data.selectedRoleId;
    }
    return null;
  }

  const Dialog = {
    /**
     * @param {Window} parentWindow
     * @param {Zotero.Item} item  the attachment being edited
     * @returns {Promise<string|null>} chosen roleId or null
     */
    async editRole(parentWindow, item) {
      // Optional custom dialog path (off by default).
      try {
        if (ZA.Prefs && ZA.Prefs.get("useCustomDialog") === true) {
          return customDialog(parentWindow, item);
        }
      } catch (e) {
        Log.warn("custom dialog failed; using native picker", e);
      }
      try {
        return nativePicker(parentWindow, item);
      } catch (e) {
        Log.error("native picker failed", e);
        return null;
      }
    },
  };

  ZA.Dialog = Dialog;
})();
