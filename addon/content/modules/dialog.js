/**
 * ZotAssets role editor dialog launcher.
 *
 * Primary UI: a small XHTML dialog (content/roleDialog.xhtml) that shows the
 * current role and lets the user pick a new one.
 *
 * Fallback: if the custom dialog cannot be opened for any reason (host quirk,
 * file URL issue), we fall back to the always-available Services.prompt.select
 * picker so the feature never breaks across Zotero 7/8/9.
 *
 * Returns a roleId string, or null if the user cancelled.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  const Dialog = {
    /**
     * @param {Window} parentWindow
     * @param {Zotero.Item} item  the attachment being edited
     * @returns {Promise<string|null>} chosen roleId or null
     */
    async editRole(parentWindow, item) {
      const Strings = ZA.Strings;
      const Roles = ZA.Roles;
      const roles = Roles.all();
      const currentRole = ZA.RoleStore.getRole(item);

      const data = {
        // inputs
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
        // outputs
        confirmed: false,
        selectedRoleId: currentRole,
      };

      // Try the custom XHTML dialog first.
      try {
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
      } catch (e) {
        Log.warn("custom dialog failed; using prompt fallback", e);
      }

      // Fallback: native selection prompt.
      try {
        const prompts = Services.prompt;
        const labels = roles.map((r) => Roles.label(r.id));
        const selected = { value: 0 };
        // Preselect current role if any.
        const curIdx = currentRole ? roles.findIndex((r) => r.id === currentRole) : -1;
        if (curIdx >= 0) selected.value = curIdx;

        const titleText =
          Strings.get("dialog.title") +
          " — " +
          Strings.get("dialog.currentRole") +
          " " +
          data.currentRoleLabel;

        const ok = prompts.select(
          parentWindow,
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
      } catch (e2) {
        Log.error("prompt fallback failed", e2);
        return null;
      }
    },
  };

  ZA.Dialog = Dialog;
})();
