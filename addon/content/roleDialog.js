/* eslint-disable no-var */
/**
 * Controller for content/roleDialog.xhtml.
 *
 * Self-contained: reads everything it needs from window.arguments[0] (passed by
 * content/modules/dialog.js) so it has no dependency on Zotero internals and
 * works identically across Zotero 7/8/9.
 */
var ZotAssetsDialog = {
  data: null,

  onLoad: function () {
    try {
      this.data = window.arguments && window.arguments[0] ? window.arguments[0] : {};
      var data = this.data;
      var strings = data.strings || {};

      // Localize labels and window title.
      if (strings.title) document.title = strings.title;
      this._setText("za-heading", strings.heading);
      this._setAttr("za-attachment-label", "value", strings.attachment);
      this._setText("za-attachment-name", data.attachmentName || "");
      this._setAttr("za-current-label", "value", strings.currentRole);
      this._setText("za-current-value", data.currentRoleLabel || "");
      this._setAttr("za-select-label", "value", strings.selectRole);

      // Populate the role list.
      var popup = document.getElementById("za-role-popup");
      var list = document.getElementById("za-role-list");
      var roles = data.roles || [];
      var selectedIndex = 0;
      for (var i = 0; i < roles.length; i++) {
        var role = roles[i];
        var mi = document.createXULElement
          ? document.createXULElement("menuitem")
          : document.createElement("menuitem");
        mi.setAttribute("label", role.label + "  (" + role.tag + ")");
        mi.setAttribute("value", role.id);
        popup.appendChild(mi);
        if (data.currentRoleId && role.id === data.currentRoleId) {
          selectedIndex = i;
        }
      }
      if (list && roles.length) {
        list.selectedIndex = selectedIndex;
      }
    } catch (e) {
      // Make sure a broken dialog never traps the user; just allow cancel.
      if (window.Components) {
        window.Components.utils.reportError("[ZotAssets] dialog onLoad failed: " + e);
      }
    }
  },

  onAccept: function () {
    try {
      var list = document.getElementById("za-role-list");
      var value = list && list.selectedItem ? list.selectedItem.getAttribute("value") : null;
      this.data.selectedRoleId = value;
      this.data.confirmed = !!value;
    } catch (e) {
      this.data.confirmed = false;
    }
    return true; // allow the dialog to close
  },

  _setText: function (id, text) {
    if (text === undefined || text === null) return;
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  },

  _setAttr: function (id, attr, value) {
    if (value === undefined || value === null) return;
    var el = document.getElementById(id);
    if (el) el.setAttribute(attr, value);
  },
};
