/**
 * ZotAssets item context menu.
 *
 * Injects a "ZotAssets" submenu into Zotero's item context menu
 * (#zotero-itemmenu) for each main window. Provides:
 *   - Edit role…       (single attachment -> dialog)
 *   - Set role ▸ <list> (single or batch quick-set)
 *   - Clear role        (single or batch)
 *   - Rename by role    (single or batch)
 *
 * Visibility is decided on popupshowing based on the current selection.
 */
(function () {
  "use strict";

  const ZA = Zotero.ZotAssets;
  const Log = ZA.Log;

  const ID_PREFIX = "zotassets-";
  const ROOT_MENU_ID = ID_PREFIX + "itemmenu";
  const SEPARATOR_ID = ID_PREFIX + "separator";

  // Per-window bookkeeping so we can cleanly remove everything on shutdown.
  // Map<Window, { elements: Element[], onPopup: Function, popup: Element }>
  const registry = new Map();

  function doc(win) {
    return win.document;
  }

  function createXUL(win, tag) {
    const d = doc(win);
    if (typeof d.createXULElement === "function") {
      return d.createXULElement(tag);
    }
    // Extremely defensive fallback for unexpected hosts.
    return d.createElementNS(
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      tag
    );
  }

  /** Return the selected attachment items in the active pane of `win`. */
  function getSelectedAttachments(win) {
    try {
      const pane = win.ZoteroPane;
      if (!pane || typeof pane.getSelectedItems !== "function") return [];
      const items = pane.getSelectedItems() || [];
      return items.filter((it) => ZA.Compat.isAttachment(it));
    } catch (e) {
      Log.warn("getSelectedAttachments failed", e);
      return [];
    }
  }

  const Menu = {
    addToWindow(win) {
      try {
        if (registry.has(win)) return;
        const d = doc(win);
        const popup = d.getElementById("zotero-itemmenu");
        if (!popup) {
          Log.warn("zotero-itemmenu not found in window");
          return;
        }

        const elements = [];
        const Strings = ZA.Strings;

        // Separator.
        const sep = createXUL(win, "menuseparator");
        sep.id = SEPARATOR_ID;
        popup.appendChild(sep);
        elements.push(sep);

        // Root submenu.
        const rootMenu = createXUL(win, "menu");
        rootMenu.id = ROOT_MENU_ID;
        rootMenu.setAttribute("label", Strings.get("menu.root"));
        const rootPopup = createXUL(win, "menupopup");
        rootMenu.appendChild(rootPopup);
        popup.appendChild(rootMenu);
        elements.push(rootMenu);

        // Edit role… (single).
        const editItem = createXUL(win, "menuitem");
        editItem.id = ID_PREFIX + "edit";
        editItem.setAttribute("label", Strings.get("menu.editRole"));
        editItem.addEventListener("command", () => Menu._onEditRole(win));
        rootPopup.appendChild(editItem);

        // Set role ▸ <list>.
        const setMenu = createXUL(win, "menu");
        setMenu.id = ID_PREFIX + "set";
        setMenu.setAttribute("label", Strings.get("menu.setRole"));
        const setPopup = createXUL(win, "menupopup");
        setMenu.appendChild(setPopup);
        for (const role of ZA.Roles.all()) {
          const ri = createXUL(win, "menuitem");
          ri.id = ID_PREFIX + "set-" + role.id;
          ri.setAttribute("label", ZA.Roles.label(role.id) + "  (" + role.tag + ")");
          ri.addEventListener("command", () => Menu._onSetRole(win, role.id));
          setPopup.appendChild(ri);
        }
        rootPopup.appendChild(setMenu);

        // Clear role.
        const clearItem = createXUL(win, "menuitem");
        clearItem.id = ID_PREFIX + "clear";
        clearItem.setAttribute("label", Strings.get("menu.clearRole"));
        clearItem.addEventListener("command", () => Menu._onClearRole(win));
        rootPopup.appendChild(clearItem);

        // Rename by role.
        const renameItem = createXUL(win, "menuitem");
        renameItem.id = ID_PREFIX + "rename";
        renameItem.setAttribute("label", Strings.get("menu.renameByRole"));
        renameItem.addEventListener("command", () => Menu._onRenameByRole(win));
        rootPopup.appendChild(renameItem);

        // popupshowing handler to toggle visibility/enablement.
        const onPopup = () => Menu._onPopupShowing(win, { rootMenu, sep, editItem });
        popup.addEventListener("popupshowing", onPopup);

        registry.set(win, { elements, onPopup, popup });
        Log.info("menu added to window");
      } catch (e) {
        Log.error("addToWindow failed", e);
      }
    },

    removeFromWindow(win) {
      try {
        const entry = registry.get(win);
        if (!entry) return;
        if (entry.popup && entry.onPopup) {
          entry.popup.removeEventListener("popupshowing", entry.onPopup);
        }
        for (const el of entry.elements) {
          if (el && el.parentNode) {
            el.parentNode.removeChild(el);
          }
        }
        registry.delete(win);
        Log.info("menu removed from window");
      } catch (e) {
        Log.error("removeFromWindow failed", e);
      }
    },

    _onPopupShowing(win, refs) {
      try {
        const attachments = getSelectedAttachments(win);
        const hasAttachment = attachments.length > 0;
        const single = attachments.length === 1;
        refs.rootMenu.hidden = !hasAttachment;
        refs.sep.hidden = !hasAttachment;
        // Edit dialog only makes sense for exactly one attachment.
        // Use the property (a stray disabled attribute disables regardless of value).
        refs.editItem.disabled = !single;
      } catch (e) {
        Log.warn("_onPopupShowing failed", e);
      }
    },

    async _onEditRole(win) {
      try {
        const attachments = getSelectedAttachments(win);
        if (attachments.length !== 1) return;
        const item = attachments[0];
        const roleId = await ZA.Dialog.editRole(win, item);
        if (!roleId) return;
        const res = await ZA.RoleManager.setRole(item, roleId);
        ZA.UI.summary({
          succeeded: res.status === "skipped" ? 0 : res.status === "failed" ? 0 : 1,
          skipped: res.status === "skipped" ? 1 : 0,
          failed: res.status === "failed" ? 1 : 0,
          details: [res],
        });
      } catch (e) {
        Log.error("_onEditRole failed", e);
      }
    },

    async _onSetRole(win, roleId) {
      try {
        const attachments = getSelectedAttachments(win);
        if (!attachments.length) return;
        const summary = await ZA.RoleManager.setRoleBatch(attachments, roleId);
        ZA.UI.summary(summary);
      } catch (e) {
        Log.error("_onSetRole failed", e);
      }
    },

    async _onClearRole(win) {
      try {
        const attachments = getSelectedAttachments(win);
        if (!attachments.length) return;
        const summary = await ZA.RoleManager.clearRoleBatch(attachments);
        ZA.UI.summary(summary);
      } catch (e) {
        Log.error("_onClearRole failed", e);
      }
    },

    async _onRenameByRole(win) {
      try {
        const attachments = getSelectedAttachments(win);
        if (!attachments.length) return;
        const summary = await ZA.RoleManager.renameByRoleBatch(attachments);
        ZA.UI.summary(summary);
      } catch (e) {
        Log.error("_onRenameByRole failed", e);
      }
    },
  };

  ZA.Menu = Menu;
})();
