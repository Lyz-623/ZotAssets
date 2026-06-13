/**
 * ZotAssets item context menu.
 *
 * Injects a "ZotAssets" submenu into Zotero's item context menu
 * (#zotero-itemmenu) for each main window. Provides:
 *   - Auto-classify selected items…   (heuristic, preview-first)
 *   - Auto-classify entire library…   (heuristic, preview-first)
 *   - Edit role…       (single attachment -> native picker)
 *   - Set role ▸ <list> (single or batch quick-set)
 *   - Clear role        (single or batch; can restore original file names)
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

  // Map<Window, { elements: Element[], onPopup: Function, popup: Element, refs: Object }>
  const registry = new Map();

  function doc(win) {
    return win.document;
  }

  function createXUL(win, tag) {
    const d = doc(win);
    if (typeof d.createXULElement === "function") {
      return d.createXULElement(tag);
    }
    return d.createElementNS(
      "http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul",
      tag
    );
  }

  function getSelectedItems(win) {
    try {
      const pane = win.ZoteroPane;
      if (!pane || typeof pane.getSelectedItems !== "function") return [];
      return pane.getSelectedItems() || [];
    } catch (e) {
      Log.warn("getSelectedItems failed", e);
      return [];
    }
  }

  function getSelectedAttachments(win) {
    return getSelectedItems(win).filter((it) => ZA.Compat.isAttachment(it));
  }

  function bilingual(zh, en) {
    const lang = ZA.Strings ? ZA.Strings.lang() : "en";
    return lang === "zh" ? zh : en;
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

        const sep = createXUL(win, "menuseparator");
        sep.id = SEPARATOR_ID;
        popup.appendChild(sep);
        elements.push(sep);

        const rootMenu = createXUL(win, "menu");
        rootMenu.id = ROOT_MENU_ID;
        rootMenu.setAttribute("label", Strings.get("menu.root"));
        const rootPopup = createXUL(win, "menupopup");
        rootMenu.appendChild(rootPopup);
        popup.appendChild(rootMenu);
        elements.push(rootMenu);

        // --- Automation (always available) ---
        const autoSel = createXUL(win, "menuitem");
        autoSel.id = ID_PREFIX + "auto-selection";
        autoSel.setAttribute("label", Strings.get("menu.autoSelection"));
        autoSel.addEventListener("command", () => Menu._onAutoSelection(win));
        rootPopup.appendChild(autoSel);

        const autoLib = createXUL(win, "menuitem");
        autoLib.id = ID_PREFIX + "auto-library";
        autoLib.setAttribute("label", Strings.get("menu.autoLibrary"));
        autoLib.addEventListener("command", () => Menu._onAutoLibrary(win));
        rootPopup.appendChild(autoLib);

        const innerSep = createXUL(win, "menuseparator");
        innerSep.id = ID_PREFIX + "inner-sep";
        rootPopup.appendChild(innerSep);

        // --- Per-attachment manual ops ---
        const editItem = createXUL(win, "menuitem");
        editItem.id = ID_PREFIX + "edit";
        editItem.setAttribute("label", Strings.get("menu.editRole"));
        editItem.addEventListener("command", () => Menu._onEditRole(win));
        rootPopup.appendChild(editItem);

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

        const clearItem = createXUL(win, "menuitem");
        clearItem.id = ID_PREFIX + "clear";
        clearItem.setAttribute("label", Strings.get("menu.clearRole"));
        clearItem.addEventListener("command", () => Menu._onClearRole(win));
        rootPopup.appendChild(clearItem);

        const renameItem = createXUL(win, "menuitem");
        renameItem.id = ID_PREFIX + "rename";
        renameItem.setAttribute("label", Strings.get("menu.renameByRole"));
        renameItem.addEventListener("command", () => Menu._onRenameByRole(win));
        rootPopup.appendChild(renameItem);

        const refs = { rootMenu, sep, editItem, setMenu, clearItem, renameItem, autoSel };
        const onPopup = () => Menu._onPopupShowing(win, refs);
        popup.addEventListener("popupshowing", onPopup);

        registry.set(win, { elements, onPopup, popup, refs });
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
        const selected = getSelectedItems(win);
        const attachments = selected.filter((it) => ZA.Compat.isAttachment(it));
        const hasSelection = selected.length > 0;
        const hasAttachment = attachments.length > 0;
        const single = attachments.length === 1;

        // Root + separator show whenever something is selected (auto-classify
        // works on selections and on the whole library).
        refs.rootMenu.hidden = !hasSelection;
        refs.sep.hidden = !hasSelection;

        // Selection auto-classify needs at least one attachment in the selection
        // (directly, or as a child of selected items). Cheap check: any selected
        // item is/has an attachment — we only gate on direct attachments here to
        // stay fast; the handler re-derives the full set.
        refs.autoSel.disabled = !hasSelection;

        // Per-attachment ops require attachments.
        refs.editItem.disabled = !single;
        refs.setMenu.disabled = !hasAttachment;
        refs.clearItem.disabled = !hasAttachment;
        refs.renameItem.disabled = !hasAttachment;
      } catch (e) {
        Log.warn("_onPopupShowing failed", e);
      }
    },

    // ---- Automation handlers ----
    async _onAutoSelection(win) {
      try {
        const items = getSelectedItems(win);
        await ZA.AutoClassify.runSelection(win, items);
      } catch (e) {
        Log.error("_onAutoSelection failed", e);
      }
    },

    async _onAutoLibrary(win) {
      try {
        await ZA.AutoClassify.runLibrary(win);
      } catch (e) {
        Log.error("_onAutoLibrary failed", e);
      }
    },

    // ---- Manual handlers ----
    async _onEditRole(win) {
      try {
        const attachments = getSelectedAttachments(win);
        if (attachments.length !== 1) return;
        const item = attachments[0];
        const roleId = await ZA.Dialog.editRole(win, item);
        if (!roleId) return;
        const res = await ZA.RoleManager.setRole(item, roleId);
        ZA.UI.summary({
          succeeded: res.status === "skipped" || res.status === "failed" ? 0 : 1,
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

        // Offer to also restore original file names (uses captured originals).
        let restoreFilename = false;
        try {
          const anyOriginal = attachments.some(
            (it) => !!ZA.RoleStore.getOriginalFilename(it)
          );
          if (anyOriginal) {
            restoreFilename = Services.prompt.confirm(
              win,
              ZA.Strings.get("menu.clearRole"),
              ZA.Strings.get("clear.restorePrompt")
            );
          }
        } catch (e) {
          restoreFilename = false;
        }

        const summary = await ZA.RoleManager.clearRoleBatch(attachments, {
          restoreFilename,
        });
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
