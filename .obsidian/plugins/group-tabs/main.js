/*
 * Group Tabs 1.1.6
 * Generated from main.ts with no external build dependencies.
 */
"use strict";

const {
  addIcon,
  FuzzySuggestModal,
  ItemView,
  Menu,
  Modal,
  Notice,
  Plugin,
  PluginSettingTab,
  Setting,
  setIcon,
  TFile,
  TFolder,
} = require("obsidian");

const PLUGIN_ID = "group-tabs";
const VERSION = "1.1.6";
const EMPTY_GROUP_VIEW_TYPE = "group-tabs-empty";
const HISTORY_VIEW_TYPE = "group-tabs-history-view";
const HISTORY_ICON_ID = "group-tabs-history";
const GROUP_HEADER_CLASS = "group-tabs-native-group";
const DROP_TARGET_CLASS = "group-tabs-drop-target";
const DRAG_HOVER_MS = 500;
const REORDER_CLOSE_MS = 800;
const FILE_OPEN_SETTLE_MS = 25;
const FILE_OPEN_RECHECK_MS = 50;
const LARGE_GROUP_CONFIRM_COUNT = 20;
const LARGE_EXPORT_BYTES = 25 * 1024 * 1024;
const DEFAULT_EXPORT_FOLDER = "Group Tabs Exports";
const DEFAULT_HISTORY_LIMIT = 20;

const HISTORY_ICON_SVG = [
  '<g transform="scale(4.1666667)">',
  '<path d="M7 4h10a3 3 0 0 1 3 3v9a3 3 0 0 1-3 3h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  '<path d="M7 4h4l1.5 2H20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  '<path d="M4 8h10a3 3 0 0 1 3 3v7a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  '<path d="M4 8h4l1.5 2H17" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  '</g>',
].join("");

const DEFAULT_SETTINGS = Object.freeze({
  allowOnlyMarkdown: true,
  exportDestination: "vault",
  exportFolder: DEFAULT_EXPORT_FOLDER,
  externalExportFolder: "",
  showHistory: true,
  historyLimit: DEFAULT_HISTORY_LIMIT,
  groups: [],
  history: [],
});

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function uniqueMembers(members) {
  const seen = new Set();
  const result = [];
  for (const item of Array.isArray(members) ? members : []) {
    if (!isPlainObject(item) || typeof item.path !== "string") continue;
    const path = item.path.trim();
    if (!path || seen.has(path)) continue;
    seen.add(path);
    result.push({
      path,
      viewType: typeof item.viewType === "string" && item.viewType
        ? item.viewType
        : path.toLowerCase().endsWith(".md")
          ? "markdown"
          : "file",
    });
  }
  return result;
}

function normalizeGroup(group) {
  if (!isPlainObject(group)) return null;
  const members = uniqueMembers(group.members);
  if (members.length === 0) return null;
  const id = typeof group.id === "string" && group.id.trim()
    ? group.id.trim()
    : GroupTabsPlugin.createId();
  const name = typeof group.name === "string" && group.name.trim()
    ? group.name.trim()
    : "Tab group";
  const activePath = typeof group.activePath === "string" && members.some((member) => member.path === group.activePath)
    ? group.activePath
    : members[0].path;
  return {
    id,
    historyId: typeof group.historyId === "string" && group.historyId.trim()
      ? group.historyId.trim()
      : id,
    workspaceId: typeof group.workspaceId === "string" && group.workspaceId.trim()
      ? group.workspaceId.trim()
      : "workspace-default",
    leafId: typeof group.leafId === "string" ? group.leafId : "",
    name,
    members,
    activePath,
    createdAt: Number.isFinite(group.createdAt) ? group.createdAt : Date.now(),
    updatedAt: Number.isFinite(group.updatedAt) ? group.updatedAt : Date.now(),
  };
}

function normalizeHistoryEntry(entry) {
  if (!isPlainObject(entry)) return null;
  const members = uniqueMembers(entry.members);
  if (members.length === 0) return null;
  const id = typeof entry.id === "string" && entry.id.trim()
    ? entry.id.trim()
    : GroupTabsPlugin.createId();
  const name = typeof entry.name === "string" && entry.name.trim()
    ? entry.name.trim()
    : "Tab group";
  return {
    id,
    name,
    members,
    activePath: typeof entry.activePath === "string" && members.some((member) => member.path === entry.activePath)
      ? entry.activePath
      : members[0].path,
    pinned: entry.pinned === true,
    createdAt: Number.isFinite(entry.createdAt) ? entry.createdAt : Date.now(),
    updatedAt: Number.isFinite(entry.updatedAt) ? entry.updatedAt : Date.now(),
  };
}

function historySnapshotKey(entry) {
  const name = typeof entry?.name === "string" ? entry.name.trim() : "";
  const paths = uniqueMembers(entry?.members).map((member) => member.path).sort();
  return JSON.stringify([name, paths]);
}

function coalesceHistoryEntries(entries) {
  const result = [];
  const bySnapshot = new Map();
  for (const entry of [...entries].sort((left, right) => right.updatedAt - left.updatedAt)) {
    const key = historySnapshotKey(entry);
    const existing = bySnapshot.get(key);
    if (!existing) {
      const copy = {
        ...entry,
        members: uniqueMembers(entry.members),
      };
      bySnapshot.set(key, copy);
      result.push(copy);
      continue;
    }
    existing.pinned = existing.pinned === true || entry.pinned === true;
    existing.createdAt = Math.min(existing.createdAt, entry.createdAt);
  }
  return result;
}

function sortHistoryEntries(entries) {
  return [...entries].sort((left, right) => {
    const pinDifference = Number(right.pinned === true) - Number(left.pinned === true);
    if (pinDifference !== 0) return pinDifference;
    return right.updatedAt - left.updatedAt;
  });
}

function limitHistoryEntries(entries, limit) {
  const sorted = sortHistoryEntries(entries);
  const pinned = sorted.filter((entry) => entry.pinned === true);
  const recent = sorted.filter((entry) => entry.pinned !== true).slice(0, limit);
  return [...pinned, ...recent];
}

class VaultFolderPickerModal extends FuzzySuggestModal {
  constructor(app, onChoose) {
    super(app);
    this.onChoose = onChoose;
    this.setPlaceholder?.("Choose a folder inside this vault");
  }

  getItems() {
    const folders = this.app.vault.getAllLoadedFiles()
      .filter((item) => item instanceof TFolder)
      .sort((left, right) => left.path.localeCompare(right.path));
    return [{ path: "", name: "Vault root" }, ...folders];
  }

  getItemText(folder) {
    return folder.path || "Vault root";
  }

  onChooseItem(folder) {
    this.onChoose(folder.path || "");
  }
}

class NamePromptModal extends Modal {
  constructor(app, title, suggestedName, onResolve) {
    super(app);
    this.title = title;
    this.suggestedName = suggestedName || "Tab group";
    this.onResolve = onResolve;
    this.resolved = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.replaceChildren();
    contentEl.addClass?.("group-tabs-name-modal");
    contentEl.createEl("h2", { text: this.title });
    const input = contentEl.createEl("input", {
      type: "text",
      value: this.suggestedName,
      cls: "group-tabs-name-input",
    });
    const actions = contentEl.createDiv({ cls: "group-tabs-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    const create = actions.createEl("button", { text: "Create", cls: "mod-cta" });

    const submit = () => {
      const value = input.value.trim() || this.suggestedName;
      this.resolved = true;
      this.onResolve(value);
      this.close();
    };

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        submit();
      }
    });
    cancel.addEventListener("click", () => this.close());
    create.addEventListener("click", submit);
    window.setTimeout(() => {
      input.focus();
      input.select();
    }, 0);
  }

  onClose() {
    this.contentEl.replaceChildren();
    if (!this.resolved) {
      this.resolved = true;
      this.onResolve(this.suggestedName);
    }
  }
}

class ConfirmModal extends Modal {
  constructor(app, title, message, confirmText, onResolve) {
    super(app);
    this.title = title;
    this.message = message;
    this.confirmText = confirmText || "Continue";
    this.onResolve = onResolve;
    this.resolved = false;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.replaceChildren();
    contentEl.createEl("h2", { text: this.title });
    contentEl.createEl("p", { text: this.message });
    const actions = contentEl.createDiv({ cls: "group-tabs-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    const confirm = actions.createEl("button", { text: this.confirmText, cls: "mod-cta" });
    cancel.addEventListener("click", () => this.finish(false));
    confirm.addEventListener("click", () => this.finish(true));
  }

  finish(value) {
    if (this.resolved) return;
    this.resolved = true;
    this.onResolve(value);
    this.close();
  }

  onClose() {
    this.contentEl.replaceChildren();
    if (!this.resolved) {
      this.resolved = true;
      this.onResolve(false);
    }
  }
}

class ExportProgressModal extends Modal {
  constructor(app, total) {
    super(app);
    this.total = total;
    this.cancelled = false;
    this.statusEl = null;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.replaceChildren();
    contentEl.createEl("h2", { text: "Exporting group" });
    this.statusEl = contentEl.createEl("p", { text: `Preparing 0 of ${this.total} files…` });
    const actions = contentEl.createDiv({ cls: "group-tabs-modal-actions" });
    const cancel = actions.createEl("button", { text: "Cancel" });
    cancel.addEventListener("click", () => {
      this.cancelled = true;
      cancel.disabled = true;
      if (this.statusEl) this.statusEl.textContent = "Cancelling…";
    });
  }

  update(current, path) {
    if (this.statusEl) this.statusEl.textContent = `Preparing ${current} of ${this.total}: ${path}`;
  }

  onClose() {
    this.contentEl.replaceChildren();
  }
}

class EmptyGroupView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
    this.groupId = "";
  }

  getViewType() {
    return EMPTY_GROUP_VIEW_TYPE;
  }

  getDisplayText() {
    const group = this.plugin.getGroup(this.groupId);
    return group ? `${group.name} · ${group.members.length}` : "Tab group";
  }

  getIcon() {
    return "";
  }

  getState() {
    return { groupId: this.groupId };
  }

  async setState(state) {
    this.groupId = typeof state?.groupId === "string" ? state.groupId : "";
    this.render();
  }

  async onOpen() {
    const state = this.leaf.getViewState?.()?.state;
    this.groupId = typeof state?.groupId === "string" ? state.groupId : this.groupId;
    this.render();
  }

  onPaneMenu(menu) {
    const group = this.plugin.getGroup(this.groupId);
    if (group) this.plugin.addGroupMenuItems(menu, group);
  }

  render() {
    const content = this.contentEl;
    if (!content) return;
    content.replaceChildren();
    content.addClass?.("group-tabs-empty-view");
    const group = this.plugin.getGroup(this.groupId);
    content.createEl("div", {
      cls: "group-tabs-empty-view-title",
      text: group ? `${group.name} · ${group.members.length}` : "Tab group",
    });
    content.createEl("div", {
      cls: "group-tabs-empty-view-hint",
      text: "Select a note from the tab group menu.",
    });
  }
}


class RecentGroupsView extends ItemView {
  constructor(leaf, plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType() {
    return HISTORY_VIEW_TYPE;
  }

  getDisplayText() {
    return "Recent tab groups";
  }

  getIcon() {
    return "history";
  }

  async onOpen() {
    this.plugin.historyViews.add(this);
    this.render();
  }

  async onClose() {
    this.plugin.historyViews.delete(this);
    this.contentEl?.replaceChildren();
  }

  render() {
    const content = this.contentEl;
    if (!content) return;
    content.replaceChildren();
    content.addClass?.("group-tabs-history-view");

    const toolbar = content.createDiv({ cls: "group-tabs-history-toolbar nav-header" });
    toolbar.createEl("div", { cls: "group-tabs-history-title nav-header-title", text: "Recent tab groups" });
    const clearButton = toolbar.createEl("button", {
      cls: "group-tabs-history-clear clickable-icon",
      attr: { type: "button", "aria-label": "Clear unpinned tab group history", title: "Clear unpinned history" },
    });
    setIcon(clearButton, "trash-2");
    clearButton.disabled = !this.plugin.settings.history.some((entry) => entry.pinned !== true);
    clearButton.addEventListener("click", () => void this.plugin.clearUnpinnedHistory());

    const list = content.createDiv({ cls: "group-tabs-history-list nav-files-container" });
    const entries = sortHistoryEntries(this.plugin.settings.history);
    if (entries.length === 0) {
      list.createDiv({ cls: "group-tabs-history-empty nav-file-title", text: "No recent tab groups" });
      return;
    }

    for (const entry of entries) {
      const row = list.createDiv({
        cls: "group-tabs-history-item nav-file-title",
        attr: { role: "button", tabindex: "0", title: `${entry.name} · ${entry.members.length}` },
      });
      row.createEl("span", { cls: "group-tabs-history-name nav-file-title-content", text: entry.name });
      const meta = row.createEl("span", { cls: "group-tabs-history-meta" });
      if (entry.pinned) {
        const pin = meta.createEl("span", { cls: "group-tabs-history-pin", attr: { title: "Pinned", "aria-label": "Pinned" } });
        setIcon(pin, "pin");
      }
      meta.createEl("span", { cls: "group-tabs-history-count", text: String(entry.members.length) });

      const open = (event) => {
        const newTab = Boolean(event.ctrlKey || event.metaKey);
        void this.plugin.openHistoryEntry(entry.id, newTab);
      };
      row.addEventListener("click", open);
      row.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        open(event);
      });
      row.addEventListener("contextmenu", (event) => this.plugin.openHistoryEntryMenu(entry.id, event));
    }
  }
}

class GroupPopup {
  constructor(plugin, group, anchorEl) {
    this.plugin = plugin;
    this.group = group;
    this.anchorEl = anchorEl;
    this.rootEl = null;
    this.searchEl = null;
    this.viewportEl = null;
    this.canvasEl = null;
    this.query = "";
    this.filtered = [];
    this.dragPath = null;
    this.rowHeight = 34;
    this.cleanupCallbacks = [];
    this.ignoreClickUntil = 0;
    this.recentlyMovedPath = null;
    this.reorderTimer = null;
  }

  open() {
    this.plugin.closePopup();
    const doc = this.anchorEl.ownerDocument;
    const root = doc.createElement("div");
    root.className = "group-tabs-popup";
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-label", `${this.group.name} tab group`);

    const header = doc.createElement("div");
    header.className = "group-tabs-popup-header";
    const title = doc.createElement("div");
    title.className = "group-tabs-popup-title";
    title.textContent = `${this.group.name} · ${this.group.members.length}`;
    title.title = this.group.name;
    header.appendChild(title);
    root.appendChild(header);

    const search = doc.createElement("input");
    search.className = "group-tabs-popup-search";
    search.type = "search";
    search.placeholder = "Search group tabs…";
    search.setAttribute("aria-label", "Search group tabs");
    root.appendChild(search);

    const viewport = doc.createElement("div");
    viewport.className = "group-tabs-popup-viewport";
    const canvas = doc.createElement("div");
    canvas.className = "group-tabs-popup-canvas";
    viewport.appendChild(canvas);
    root.appendChild(viewport);

    doc.body.appendChild(root);
    this.rootEl = root;
    this.searchEl = search;
    this.viewportEl = viewport;
    this.canvasEl = canvas;
    this.filtered = [...this.group.members];
    this.position();
    this.render();

    const onSearch = () => {
      this.query = search.value.trim().toLowerCase();
      this.filtered = this.group.members.filter((member) => {
        const path = member.path.toLowerCase();
        return path.includes(this.query) || GroupTabsPlugin.basename(path).includes(this.query);
      });
      viewport.scrollTop = 0;
      this.render();
    };
    const onScroll = () => this.render();
    const onPointerDown = (event) => {
      if (this.rootEl?.contains(event.target) || this.anchorEl.contains(event.target)) return;
      if (Date.now() < this.ignoreClickUntil) return;
      this.close();
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") this.close();
    };
    const onResize = () => this.position();

    search.addEventListener("input", onSearch);
    viewport.addEventListener("scroll", onScroll);
    doc.addEventListener("pointerdown", onPointerDown, true);
    doc.addEventListener("keydown", onKeyDown, true);
    doc.defaultView?.addEventListener("resize", onResize);
    this.cleanupCallbacks.push(
      () => search.removeEventListener("input", onSearch),
      () => viewport.removeEventListener("scroll", onScroll),
      () => doc.removeEventListener("pointerdown", onPointerDown, true),
      () => doc.removeEventListener("keydown", onKeyDown, true),
      () => doc.defaultView?.removeEventListener("resize", onResize),
    );
    this.plugin.activePopup = this;
    window.setTimeout(() => search.focus(), 0);
  }

  position() {
    if (!this.rootEl) return;
    const rect = this.anchorEl.getBoundingClientRect();
    const win = this.anchorEl.ownerDocument.defaultView;
    const width = Math.min(560, Math.max(360, win.innerWidth - 24));
    this.rootEl.style.width = `${width}px`;
    const rootRect = this.rootEl.getBoundingClientRect();
    const left = Math.min(Math.max(12, rect.left), Math.max(12, win.innerWidth - rootRect.width - 12));
    const below = rect.bottom + 6;
    const above = rect.top - rootRect.height - 6;
    const top = below + rootRect.height <= win.innerHeight - 12 ? below : Math.max(12, above);
    this.rootEl.style.left = `${left}px`;
    this.rootEl.style.top = `${top}px`;
  }

  render() {
    if (!this.canvasEl || !this.viewportEl) return;
    this.canvasEl.replaceChildren();
    if (this.filtered.length === 0) {
      this.canvasEl.style.height = "auto";
      const empty = this.canvasEl.ownerDocument.createElement("div");
      empty.className = "group-tabs-popup-empty";
      empty.textContent = "No matching files.";
      this.canvasEl.appendChild(empty);
      return;
    }
    this.canvasEl.style.height = `${this.filtered.length * this.rowHeight}px`;
    const start = Math.max(0, Math.floor(this.viewportEl.scrollTop / this.rowHeight) - 4);
    const visible = Math.ceil(this.viewportEl.clientHeight / this.rowHeight) + 8;
    const end = Math.min(this.filtered.length, start + visible);
    for (let index = start; index < end; index += 1) {
      const member = this.filtered[index];
      const row = this.createRow(member);
      row.style.transform = `translateY(${index * this.rowHeight}px)`;
      this.canvasEl.appendChild(row);
    }
  }

  finishReorder(path) {
    this.ignoreClickUntil = Date.now() + REORDER_CLOSE_MS;
    this.recentlyMovedPath = path;
    if (this.reorderTimer) window.clearTimeout(this.reorderTimer);
    this.render();
    this.reorderTimer = window.setTimeout(() => this.close(), REORDER_CLOSE_MS);
  }

  createRow(member) {
    const doc = this.anchorEl.ownerDocument;
    const row = doc.createElement("div");
    row.className = "group-tabs-popup-row";
    row.dataset.path = member.path;
    row.style.height = `${this.rowHeight}px`;
    row.title = member.path;
    row.setAttribute("role", "button");
    row.tabIndex = 0;
    if (member.path === this.group.activePath) row.classList.add("is-active");
    if (member.path === this.recentlyMovedPath) row.classList.add("is-reordered");

    const handle = doc.createElement("span");
    handle.className = "group-tabs-popup-handle";
    handle.textContent = "≡";
    handle.setAttribute("aria-hidden", "true");
    row.appendChild(handle);

    const label = doc.createElement("span");
    label.className = "group-tabs-popup-label";
    label.textContent = GroupTabsPlugin.basename(member.path);
    row.appendChild(label);

    const path = doc.createElement("span");
    path.className = "group-tabs-popup-path";
    path.textContent = GroupTabsPlugin.dirname(member.path);
    row.appendChild(path);

    const remove = doc.createElement("button");
    remove.className = "group-tabs-popup-remove";
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "Remove from group";
    remove.setAttribute("aria-label", `Remove ${member.path} from group`);
    row.appendChild(remove);

    row.draggable = this.query.length === 0;
    row.addEventListener("click", (event) => {
      if (event.target === remove || Date.now() < this.ignoreClickUntil) return;
      void this.plugin.activateMember(this.group.id, member.path);
      this.close();
    });
    row.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        void this.plugin.activateMember(this.group.id, member.path);
        this.close();
      } else if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
        this.plugin.openMemberMenu(this.group.id, member.path, event, row);
      }
    });
    row.addEventListener("contextmenu", (event) => this.plugin.openMemberMenu(this.group.id, member.path, event, row));
    remove.addEventListener("click", (event) => {
      event.stopPropagation();
      void this.plugin.removeMember(this.group.id, member.path).then(() => {
        const updated = this.plugin.getGroup(this.group.id);
        if (!updated) {
          this.close();
          return;
        }
        this.group = updated;
        this.filtered = this.group.members.filter((item) => item.path.toLowerCase().includes(this.query));
        this.render();
      });
    });
    row.addEventListener("dragstart", (event) => {
      if (this.query) {
        event.preventDefault();
        return;
      }
      if (this.reorderTimer) window.clearTimeout(this.reorderTimer);
      this.dragPath = member.path;
      this.plugin.draggedMember = { groupId: this.group.id, path: member.path };
      event.dataTransfer?.setData("application/x-group-tabs-member", JSON.stringify({
        groupId: this.group.id,
        path: member.path,
      }));
      if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
    });
    row.addEventListener("dragover", (event) => {
      if (!this.dragPath || this.query) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    });
    row.addEventListener("drop", (event) => {
      if (!this.dragPath || this.query) return;
      event.preventDefault();
      event.stopPropagation();
      const sourcePath = this.dragPath;
      this.dragPath = null;
      this.plugin.reorderMember(this.group.id, sourcePath, member.path);
      this.group = this.plugin.getGroup(this.group.id) ?? this.group;
      this.filtered = [...this.group.members];
      this.finishReorder(sourcePath);
    });
    row.addEventListener("dragend", () => {
      const path = this.dragPath || member.path;
      this.dragPath = null;
      if (this.plugin.draggedMember?.groupId === this.group.id) this.finishReorder(path);
      this.plugin.clearDragState();
    });
    return row;
  }

  close() {
    for (const cleanup of this.cleanupCallbacks.splice(0)) cleanup();
    if (this.reorderTimer) window.clearTimeout(this.reorderTimer);
    this.reorderTimer = null;
    this.rootEl?.remove();
    this.rootEl = null;
    if (this.plugin.activePopup === this) this.plugin.activePopup = null;
  }
}

class GroupTabsPlugin extends Plugin {
  constructor(...args) {
    super(...args);
    this.settings = { ...DEFAULT_SETTINGS, groups: [], history: [] };
    this.groupLeaves = new Map();
    this.leafGroups = new Map();
    this.groupParents = new Map();
    this.leafDisplayOverrides = new Map();
    this.viewDisplayBindings = new Map();
    this.leafIconOverrides = new Map();
    this.viewIconBindings = new Map();
    this.leafViewStateOverrides = new Map();
    this.leafOpenFileOverrides = new Map();
    this.headerCleanups = new Map();
    this.multiFileMenus = new WeakSet();
    this.fileExplorerSelectionPaths = new Set();
    this.fileExplorerSelectionOrder = [];
    this.activePopup = null;
    this.historyRibbonEl = null;
    this.historyViews = new Set();
    this.lastMainLeaf = null;
    this.refreshScheduled = false;
    this.fileOpenRoutingDepth = 0;
    this.pendingFileOpenPaths = new Set();
    this.fileOpenReconcilePromise = null;
    this.stampingLeaves = new WeakSet();
    this.refreshAfterDrag = false;
    this.isUnloading = false;
    this.isRestoring = false;
    this.draggedLeaf = null;
    this.draggedGroupId = null;
    this.draggedMember = null;
    this.draggedFiles = null;
    this.pendingNavigationDragFiles = null;
    this.dragHoverTimer = null;
    this.dragHoverTarget = null;
    this.dragArmed = false;
    this.lastWorkspaceId = null;
    this.layoutReady = false;
  }

  static createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `group-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  static normalizeSettings(data) {
    const source = isPlainObject(data) ? data : {};
    const groups = [];
    const groupIds = new Set();
    for (const candidate of Array.isArray(source.groups) ? source.groups : []) {
      const group = normalizeGroup(candidate);
      if (!group || groupIds.has(group.id)) continue;
      groupIds.add(group.id);
      groups.push(group);
    }
    const history = [];
    const historyIds = new Set();
    for (const candidate of Array.isArray(source.history) ? source.history : []) {
      const entry = normalizeHistoryEntry(candidate);
      if (!entry || historyIds.has(entry.id)) continue;
      historyIds.add(entry.id);
      history.push(entry);
    }
    const historyLimit = Math.min(100, Math.max(0, Number.isFinite(source.historyLimit)
      ? Math.round(source.historyLimit)
      : DEFAULT_HISTORY_LIMIT));
    return {
      allowOnlyMarkdown: source.allowOnlyMarkdown !== false,
      exportDestination: source.exportDestination === "external" ? "external" : "vault",
      exportFolder: typeof source.exportFolder === "string"
        ? source.exportFolder.trim().replace(/^\/+|\/+$/g, "")
        : DEFAULT_EXPORT_FOLDER,
      externalExportFolder: typeof source.externalExportFolder === "string"
        ? source.externalExportFolder.trim()
        : "",
      showHistory: source.showHistory !== false,
      historyLimit,
      groups,
      history: limitHistoryEntries(coalesceHistoryEntries(history), historyLimit),
    };
  }

  static basename(path) {
    const normalized = String(path || "").replace(/\\/g, "/");
    return normalized.slice(normalized.lastIndexOf("/") + 1) || normalized;
  }

  static dirname(path) {
    const normalized = String(path || "").replace(/\\/g, "/");
    const index = normalized.lastIndexOf("/");
    return index === -1 ? "" : normalized.slice(0, index);
  }

  static commonParentName(paths) {
    const parents = paths.map((path) => GroupTabsPlugin.dirname(path)).filter(Boolean);
    if (parents.length === 0) return "Tab group";
    const segments = parents.map((parent) => parent.split("/"));
    const common = [];
    const shortest = Math.min(...segments.map((parts) => parts.length));
    for (let index = 0; index < shortest; index += 1) {
      const value = segments[0][index];
      if (segments.every((parts) => parts[index] === value)) common.push(value);
      else break;
    }
    if (common.length > 0) return common[common.length - 1] || "Tab group";
    const uniqueParents = new Set(parents);
    if (uniqueParents.size === 1) return GroupTabsPlugin.basename(parents[0]);
    return "Tab group";
  }

  static sanitizeExportBase(name) {
    const cleaned = String(name || "Tab group")
      .normalize("NFKC")
      .replace(/[<>:"/\\|?*\u0000-\u001F]/g, "-")
      .replace(/\s*-\s*/g, "-")
      .replace(/-+/g, "-")
      .replace(/\s+/g, " ")
      .trim()
      .replace(/^[. -]+|[. -]+$/g, "");
    return cleaned || "Tab-group";
  }

  static formatTimestamp(date = new Date()) {
    const pad = (value) => String(value).padStart(2, "0");
    return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}`;
  }

  static formatBytes(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  static byteLength(text) {
    if (typeof TextEncoder !== "undefined") return new TextEncoder().encode(text).length;
    return Buffer.byteLength(text, "utf8");
  }

  static countWords(text) {
    const matches = String(text || "").trim().match(/\S+/gu);
    return matches ? matches.length : 0;
  }

  static buildExportDocument(groupName, sources, skippedNonMarkdown, skippedMissing, exportedAt = new Date()) {
    const sourceWordCount = sources.reduce((sum, source) => sum + GroupTabsPlugin.countWords(source.content), 0);
    const dateText = `${exportedAt.getFullYear()}-${String(exportedAt.getMonth() + 1).padStart(2, "0")}-${String(exportedAt.getDate()).padStart(2, "0")} ${String(exportedAt.getHours()).padStart(2, "0")}:${String(exportedAt.getMinutes()).padStart(2, "0")}`;
    const render = (sizeBytes) => {
      const lines = [`# ${groupName}`, "", "## Included files", ""];
      sources.forEach((source, index) => lines.push(`${index + 1}. \`${source.path}\``));
      lines.push(
        "",
        `Sources included: ${sources.length}`,
        `Non-markdown files skipped: ${skippedNonMarkdown}`,
        `Missing files skipped: ${skippedMissing}`,
        `Combined source word count: ${sourceWordCount.toLocaleString("en-US")}`,
        `Document size: ${GroupTabsPlugin.formatBytes(sizeBytes)} (${sizeBytes.toLocaleString("en-US")} bytes)`,
        `Exported: ${dateText}`,
        "",
      );
      sources.forEach((source, index) => {
        lines.push(`<!-- GROUP-TABS-SOURCE-START: ${source.path} -->`);
        lines.push("");
        lines.push(`# ${index + 1}. ${GroupTabsPlugin.basename(source.path)}`);
        lines.push("");
        lines.push(`Source: \`${source.path}\``);
        lines.push("");
        lines.push(String(source.content).replace(/\r\n?/g, "\n"));
        lines.push("");
        lines.push(`<!-- GROUP-TABS-SOURCE-END: ${source.path} -->`);
        lines.push("");
      });
      return `${lines.join("\n").replace(/\n{4,}/g, "\n\n\n").trimEnd()}\n`;
    };
    let size = 0;
    let output = render(size);
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const next = GroupTabsPlugin.byteLength(output);
      if (next === size) break;
      size = next;
      output = render(size);
    }
    return output;
  }

  static errorMessage(error) {
    if (error instanceof Error && error.message) return error.message;
    return String(error || "Unknown error");
  }

  extractNavigationCandidatesFromJson(value) {
    let parsed;
    try {
      parsed = JSON.parse(value);
    } catch (_) {
      return [];
    }
    const candidates = [];
    const visit = (item, depth = 0) => {
      if (depth > 3 || candidates.length >= 100) return;
      if (typeof item === "string") {
        candidates.push(item);
        return;
      }
      if (Array.isArray(item)) {
        for (const child of item.slice(0, 100)) visit(child, depth + 1);
        return;
      }
      if (!item || typeof item !== "object") return;
      for (const key of ["path", "file", "filePath", "href", "files"]) {
        if (Object.hasOwn(item, key)) visit(item[key], depth + 1);
      }
    };
    visit(parsed);
    return candidates;
  }

  getNavigationFilesFromDataTransfer(dataTransfer) {
    if (!dataTransfer) return [];
    const files = [];
    const seen = new Set();
    const addCandidate = (candidate) => {
      const file = this.resolveNavigationFileCandidate(candidate);
      if (!(file instanceof TFile) || !this.isSupportedFile(file) || seen.has(file.path)) return;
      seen.add(file.path);
      files.push(file);
    };
    const read = (type) => {
      try {
        return dataTransfer.getData(type) || "";
      } catch (_) {
        return "";
      }
    };

    const custom = read("application/x-group-tabs-files");
    if (custom) {
      for (const candidate of this.extractNavigationCandidatesFromJson(custom)) addCandidate(candidate);
      if (files.length > 0) return files;
    }

    const uriList = read("text/uri-list");
    if (uriList) {
      for (const line of uriList.split(/\r?\n/)) {
        const candidate = line.trim();
        if (candidate && !candidate.startsWith("#")) addCandidate(candidate);
      }
      if (files.length > 0) return files;
    }

    const plain = read("text/plain").trim();
    if (/^obsidian:\/\/open\?/i.test(plain)) {
      for (const line of plain.split(/\r?\n/)) addCandidate(line.trim());
    }
    return files;
  }

  getNavigationFilePathFromEvent(event) {
    const path = typeof event?.composedPath === "function" ? event.composedPath() : [];
    for (const node of path) {
      const resolved = this.getNavigationFilePathFromTarget(node);
      if (resolved) return resolved;
    }
    return null;
  }

  capturePotentialDragSource(event) {
    this.pendingNavigationDragFiles = null;
    const target = event?.target instanceof Element ? event.target : null;
    if (!target) return;
    const files = this.getDraggedNavigationFiles(target);
    if (files.length > 0) {
      this.pendingNavigationDragFiles = files;
      return;
    }
    const path = this.getNavigationFilePathFromEvent(event);
    const file = path ? this.app.vault.getAbstractFileByPath(path) : null;
    if (this.isSupportedFile(file)) this.pendingNavigationDragFiles = [file];
  }

  getDraggedNavigationFilesFromEvent(event) {
    const transferFiles = this.getNavigationFilesFromDataTransfer(event?.dataTransfer);
    if (transferFiles.length > 0) return transferFiles;
    const target = event?.target instanceof Element ? event.target : null;
    if (target) {
      const targetFiles = this.getDraggedNavigationFiles(target);
      if (targetFiles.length > 0) return targetFiles;
    }
    const eventPath = this.getNavigationFilePathFromEvent(event);
    if (eventPath) {
      const file = this.app.vault.getAbstractFileByPath(eventPath);
      if (this.isSupportedFile(file)) return [file];
    }
    return Array.isArray(this.pendingNavigationDragFiles)
      ? this.pendingNavigationDragFiles.filter((file) => this.isSupportedFile(file))
      : [];
  }

  armDraggedNavigationFiles(files, event = null, writePayload = false) {
    const supported = [];
    const seen = new Set();
    for (const file of Array.isArray(files) ? files : []) {
      if (!this.isSupportedFile(file) || seen.has(file.path)) continue;
      seen.add(file.path);
      supported.push(file);
    }
    if (supported.length === 0) return false;
    this.draggedFiles = supported;
    this.pendingNavigationDragFiles = supported;
    this.draggedLeaf = null;
    this.draggedGroupId = null;
    this.draggedMember = null;
    if (writePayload && event?.dataTransfer) {
      try {
        event.dataTransfer.setData("application/x-group-tabs-files", JSON.stringify(supported.map((file) => file.path)));
      } catch (_) {
        // Obsidian may control a native navigation payload.
      }
      try {
        event.dataTransfer.effectAllowed = "copy";
      } catch (_) {
        // Some native drags expose a read-only effectAllowed value.
      }
    }
    return true;
  }

  onDragStartBubble(event) {
    if (this.draggedLeaf || this.draggedGroupId || this.draggedMember || this.draggedFiles) return;
    const files = this.getDraggedNavigationFilesFromEvent(event);
    this.armDraggedNavigationFiles(files, event, true);
  }

  async onload() {
    this.isUnloading = false;
    this.settings = GroupTabsPlugin.normalizeSettings(await this.loadData());
    addIcon(HISTORY_ICON_ID, HISTORY_ICON_SVG);
    this.registerView(EMPTY_GROUP_VIEW_TYPE, (leaf) => new EmptyGroupView(leaf, this));
    this.registerView(HISTORY_VIEW_TYPE, (leaf) => new RecentGroupsView(leaf, this));
    this.addSettingTab(new GroupTabsSettingTab(this.app, this));

    this.registerEvent(this.app.workspace.on("files-menu", (menu, files) => this.addOpenAsGroupMenuItem(menu, files)));
    this.registerEvent(this.app.workspace.on("file-menu", (menu, file, source, leaf) => {
      if (source === "tab-header" && leaf) {
        const group = this.getGroupForLeaf(leaf);
        if (group) {
          menu.addSeparator();
          this.addGroupMenuItems(menu, group);
        }
        return;
      }
      if (file instanceof TFolder) {
        this.addFolderAsGroupMenuItem(menu, file);
        return;
      }
      this.addOpenAsGroupMenuItem(menu, this.getSelectedFileExplorerFiles(file));
    }));

    this.registerEvent(this.app.workspace.on("layout-change", () => this.handleLayoutChange()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", (leaf) => {
      this.rememberMainLeaf(leaf);
      this.scheduleRefresh();
    }));
    this.registerEvent(this.app.workspace.on("file-open", (file) => {
      void this.handleFileOpen(file);
      this.scheduleRefresh();
    }));
    this.registerEvent(this.app.vault.on("rename", (file, oldPath) => this.handleRename(file, oldPath)));
    this.registerEvent(this.app.vault.on("delete", (file) => this.handleDelete(file.path)));

    this.registerDomEvent(document, "pointerdown", (event) => {
      this.trackFileExplorerSelection(event);
      this.capturePotentialDragSource(event);
    }, true);
    this.registerDomEvent(document, "pointerup", () => {
      if (!this.draggedFiles) this.pendingNavigationDragFiles = null;
    }, true);
    this.registerDomEvent(document, "pointercancel", () => {
      if (!this.draggedFiles) this.pendingNavigationDragFiles = null;
    }, true);
    this.registerDomEvent(document, "contextmenu", (event) => this.captureFileExplorerContext(event), true);
    this.registerDomEvent(document, "dragstart", (event) => this.onDragStart(event), true);
    this.registerDomEvent(document, "dragstart", (event) => this.onDragStartBubble(event));
    this.registerDomEvent(document, "dragover", (event) => this.onDragOver(event), true);
    this.registerDomEvent(document, "dragleave", (event) => this.onDragLeave(event), true);
    this.registerDomEvent(document, "drop", (event) => this.onDrop(event), true);
    this.registerDomEvent(document, "dragend", () => this.clearDragState(), true);

    this.addCommand({
      id: "create-group-from-current-tab-strip",
      name: "Create group from current tab strip",
      callback: () => this.promptCreateGroupFromCurrentStrip(),
    });
    this.addCommand({
      id: "open-current-group",
      name: "Open current group popup",
      checkCallback: (checking) => {
        const group = this.getCurrentGroup();
        if (!group) return false;
        if (!checking) {
          const header = this.getLeafHeader(this.getGroupLeaf(group.id));
          if (header) this.openPopup(group, header);
        }
        return true;
      },
    });
    this.addCommand({
      id: "open-recent-tab-groups",
      name: "Open recent tab groups",
      callback: () => void this.openHistoryView(),
    });
    this.addCommand({
      id: "rename-current-group",
      name: "Rename current group",
      checkCallback: (checking) => {
        const group = this.getCurrentGroup();
        if (!group) return false;
        if (!checking) void this.renameGroup(group.id);
        return true;
      },
    });
    this.addCommand({
      id: "expand-current-group",
      name: "Expand current group into tabs",
      checkCallback: (checking) => {
        const group = this.getCurrentGroup();
        if (!group) return false;
        if (!checking) void this.expandGroup(group.id);
        return true;
      },
    });
    this.addCommand({
      id: "export-current-group-as-markdown",
      name: "Export current group as markdown",
      checkCallback: (checking) => {
        const group = this.getCurrentGroup();
        if (!group) return false;
        if (!checking) void this.exportGroup(group.id);
        return true;
      },
    });
    this.addCommand({
      id: "close-current-group",
      name: "Close current group",
      checkCallback: (checking) => {
        const group = this.getCurrentGroup();
        if (!group) return false;
        if (!checking) void this.closeGroup(group.id);
        return true;
      },
    });

    this.register(() => this.cleanupPresentation());
    this.app.workspace.onLayoutReady(() => {
      this.layoutReady = true;
      this.lastWorkspaceId = this.currentWorkspaceId();
      this.rememberMainLeaf(this.app.workspace.getMostRecentLeaf?.());
      this.updateHistoryRibbon();
      void this.restoreGroups();
    });
  }

  onunload() {
    this.isUnloading = true;
    this.closePopup();
    this.clearDragState();
    this.cleanupPresentation();
    this.historyRibbonEl = null;
    this.historyViews.clear();
    this.pendingFileOpenPaths.clear();
    this.pendingNavigationDragFiles = null;
  }

  requestWorkspaceSave() {
    try {
      this.app.workspace.requestSaveLayout?.();
    } catch (error) {
      console.warn("Group Tabs could not request a workspace save", error);
    }
  }

  async persist() {
    await this.saveData({
      allowOnlyMarkdown: this.settings.allowOnlyMarkdown,
      exportDestination: this.settings.exportDestination,
      exportFolder: this.settings.exportFolder,
      externalExportFolder: this.settings.externalExportFolder,
      showHistory: this.settings.showHistory,
      historyLimit: this.settings.historyLimit,
      groups: this.settings.groups,
      history: this.settings.history,
    });
    this.requestWorkspaceSave();
  }

  getGroup(groupId) {
    return this.settings.groups.find((group) => group.id === groupId) ?? null;
  }

  getHistoryEntry(entryId) {
    return this.settings.history.find((entry) => entry.id === entryId) ?? null;
  }

  getHistoryIdForGroup(group) {
    if (!group) return null;
    return typeof group.historyId === "string" && group.historyId.trim()
      ? group.historyId.trim()
      : group.id;
  }

  getHistoryEntryForGroup(group) {
    const historyId = this.getHistoryIdForGroup(group);
    return historyId ? this.getHistoryEntry(historyId) : null;
  }

  historyEntryFromGroup(group, pinned = false) {
    return {
      id: this.getHistoryIdForGroup(group),
      name: group.name,
      members: uniqueMembers(group.members),
      activePath: group.activePath,
      pinned,
      createdAt: group.createdAt,
      updatedAt: group.updatedAt,
    };
  }

  applyHistoryLimit() {
    this.settings.history = limitHistoryEntries(this.settings.history, this.settings.historyLimit);
  }

  currentWorkspaceId() {
    const layout = this.app.workspace.getLayout?.();
    const id = layout?.main?.id;
    return typeof id === "string" && id ? id : "workspace-default";
  }

  getCurrentWorkspaceGroups() {
    const workspaceId = this.currentWorkspaceId();
    return this.settings.groups.filter((group) => group.workspaceId === workspaceId);
  }

  getCurrentGroup() {
    const leaf = this.app.workspace.getMostRecentLeaf?.();
    return leaf ? this.getGroupForLeaf(leaf) : null;
  }

  createGroupRecord(name, members, activePath = "", options = {}) {
    const normalizedMembers = uniqueMembers(members);
    const now = Date.now();
    const id = GroupTabsPlugin.createId();
    const historyId = typeof options.historyId === "string" && options.historyId.trim()
      ? options.historyId.trim()
      : id;
    const group = {
      id,
      historyId,
      workspaceId: this.currentWorkspaceId(),
      leafId: "",
      name: String(name || "Tab group").trim() || "Tab group",
      members: normalizedMembers,
      activePath: normalizedMembers.some((member) => member.path === activePath)
        ? activePath
        : normalizedMembers[0]?.path ?? "",
      createdAt: Number.isFinite(options.createdAt) ? options.createdAt : now,
      updatedAt: now,
    };
    this.settings.groups.push(group);
    return group;
  }

  touchGroup(group) {
    if (!group) return;
    group.updatedAt = Date.now();
    const existing = this.getHistoryEntryForGroup(group);
    if ((!this.settings.showHistory || this.settings.historyLimit <= 0) && !existing?.pinned) return;
    const entry = this.historyEntryFromGroup(group, existing?.pinned === true);
    this.settings.history = [entry, ...this.settings.history.filter((item) => item.id !== entry.id)];
    this.applyHistoryLimit();
    this.refreshHistoryViews();
  }

  pruneHistory() {
    this.applyHistoryLimit();
    this.refreshHistoryViews();
  }

  async clearUnpinnedHistory() {
    const before = this.settings.history.length;
    this.settings.history = this.settings.history.filter((entry) => entry.pinned === true);
    await this.persist();
    this.refreshHistoryViews();
    const removed = before - this.settings.history.length;
    new Notice(removed > 0 ? `Cleared ${removed} unpinned tab group${removed === 1 ? "" : "s"}.` : "No unpinned tab groups to clear.");
  }

  async setHistoryPinned(entryId, pinned) {
    const entry = this.getHistoryEntry(entryId);
    if (!entry) return;
    entry.pinned = pinned === true;
    entry.updatedAt = Date.now();
    this.applyHistoryLimit();
    await this.persist();
    this.refreshHistoryViews();
  }

  async toggleGroupHistoryPin(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return;
    const existing = this.getHistoryEntryForGroup(group);
    const pinned = existing?.pinned === true;
    const entry = this.historyEntryFromGroup(group, !pinned);
    entry.updatedAt = Date.now();
    this.settings.history = [entry, ...this.settings.history.filter((item) => item.id !== entry.id)];
    this.applyHistoryLimit();
    await this.persist();
    this.refreshHistoryViews();
  }

  async renameHistoryEntry(entryId) {
    const entry = this.getHistoryEntry(entryId);
    if (!entry) return;
    this.promptName("Rename tab group", entry.name, async (name) => {
      entry.name = name;
      entry.updatedAt = Date.now();
      for (const openGroup of this.settings.groups) {
        if (this.getHistoryIdForGroup(openGroup) !== entry.id) continue;
        openGroup.name = name;
        openGroup.updatedAt = entry.updatedAt;
      }
      this.applyHistoryLimit();
      await this.persist();
      this.refreshUI();
      this.refreshHistoryViews();
    });
  }

  async removeHistoryEntry(entryId) {
    const entry = this.getHistoryEntry(entryId);
    if (!entry) return;
    if (entry.pinned) {
      const confirmed = await this.confirm(
        "Remove pinned tab group",
        `Remove “${entry.name}” from Recent tab groups? The currently open group, if any, will remain open.`,
        "Remove",
      );
      if (!confirmed) return;
    }
    this.settings.history = this.settings.history.filter((item) => item.id !== entryId);
    await this.persist();
    this.refreshHistoryViews();
  }

  openHistoryEntryMenu(entryId, event) {
    const entry = this.getHistoryEntry(entryId);
    if (!entry) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const menu = new Menu();
    menu.addItem((item) => item.setTitle("Open group").setIcon("folder-open").onClick(() => void this.openHistoryEntry(entry.id, false)));
    menu.addItem((item) => item.setTitle("Open group in new tab").setIcon("file-plus-2").onClick(() => void this.openHistoryEntry(entry.id, true)));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle("Rename group").setIcon("pencil").onClick(() => void this.renameHistoryEntry(entry.id)));
    menu.addItem((item) => item.setTitle("Export group as markdown").setIcon("file-output").onClick(() => void this.exportHistoryEntry(entry.id)));
    menu.addItem((item) => item
      .setTitle(entry.pinned ? "Unpin group" : "Pin group to top")
      .setIcon(entry.pinned ? "pin-off" : "pin")
      .onClick(() => void this.setHistoryPinned(entry.id, !entry.pinned)));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle("Remove from history").setIcon("trash-2").onClick(() => void this.removeHistoryEntry(entry.id)));
    menu.showAtMouseEvent(event);
  }

  updateHistoryRibbon() {
    if (!this.settings.showHistory) {
      if (this.historyRibbonEl) this.historyRibbonEl.remove();
      this.historyRibbonEl = null;
      return;
    }
    if (!this.layoutReady) return;
    if (this.historyRibbonEl?.isConnected) return;
    this.historyRibbonEl?.remove();
    this.historyRibbonEl = this.addRibbonIcon(HISTORY_ICON_ID, "Recent tab groups", () => {
      void this.openHistoryView();
    });
    this.historyRibbonEl?.addClass?.("group-tabs-history-ribbon");
    this.historyRibbonEl?.setAttribute?.("aria-label", "Recent tab groups");
    this.historyRibbonEl?.setAttribute?.("data-group-tabs-history-ribbon", "true");
  }

  refreshHistoryViews() {
    for (const view of this.historyViews ?? []) view.render?.();
  }

  async openHistoryView() {
    if (!this.settings.showHistory) {
      new Notice("Recent tab group history is disabled in Group Tabs settings.");
      return;
    }
    const workspace = this.app.workspace;
    let leaf = workspace.getLeavesOfType?.(HISTORY_VIEW_TYPE)?.[0] ?? null;
    if (!leaf) {
      leaf = workspace.getLeftLeaf?.(false) ?? null;
      if (!leaf) {
        new Notice("Group Tabs could not open the Recent tab groups sidebar.");
        return;
      }
      await leaf.setViewState({ type: HISTORY_VIEW_TYPE, active: true });
    }
    await workspace.revealLeaf?.(leaf);
    leaf.view?.render?.();
  }

  isSidebarLeaf(leaf) {
    if (!leaf) return false;
    const type = leaf.getViewState?.()?.type;
    if (type === HISTORY_VIEW_TYPE) return true;
    const root = leaf.getRoot?.();
    return Boolean(root && (root === this.app.workspace.leftSplit || root === this.app.workspace.rightSplit));
  }

  rememberMainLeaf(leaf) {
    if (leaf && !this.isSidebarLeaf(leaf)) this.lastMainLeaf = leaf;
  }

  getPreferredMainLeaf() {
    if (this.lastMainLeaf && this.isLeafInWorkspace(this.lastMainLeaf) && !this.isSidebarLeaf(this.lastMainLeaf)) {
      return this.lastMainLeaf;
    }
    const recent = this.app.workspace.getMostRecentLeaf?.() ?? null;
    if (recent && !this.isSidebarLeaf(recent)) {
      this.lastMainLeaf = recent;
      return recent;
    }
    let fallback = null;
    this.app.workspace.iterateAllLeaves?.((leaf) => {
      if (!fallback && !this.isSidebarLeaf(leaf)) fallback = leaf;
    });
    if (fallback) this.lastMainLeaf = fallback;
    return fallback;
  }

  async openHistoryEntry(entryId, newTab) {
    const entry = this.getHistoryEntry(entryId);
    if (!entry) return;
    const available = [];
    let missing = 0;
    for (const member of entry.members) {
      const file = this.app.vault.getAbstractFileByPath(member.path);
      if (file instanceof TFile) available.push(member);
      else missing += 1;
    }
    if (available.length === 0) {
      new Notice("This recent tab group has no available files.");
      return;
    }

    let leaf;
    if (newTab) {
      const active = this.app.workspace.getMostRecentLeaf?.();
      if (active) this.app.workspace.setActiveLeaf(active, { focus: false });
      leaf = this.app.workspace.getLeaf("tab");
    } else {
      leaf = this.getPreferredMainLeaf() ?? this.app.workspace.getLeaf(false);
      const current = this.getGroupForLeaf(leaf);
      if (current) await this.removeGroupRecord(current.id, false);
    }

    const activePath = available.some((member) => member.path === entry.activePath)
      ? entry.activePath
      : available[0].path;
    const snapshotKey = historySnapshotKey(entry);
    let pinned = entry.pinned === true;
    let createdAt = entry.createdAt;
    this.settings.history = this.settings.history.filter((item) => {
      if (item.id === entry.id || historySnapshotKey(item) !== snapshotKey) return true;
      pinned = pinned || item.pinned === true;
      createdAt = Math.min(createdAt, item.createdAt);
      return false;
    });
    entry.pinned = pinned;
    entry.createdAt = createdAt;
    const group = this.createGroupRecord(entry.name, available, activePath, {
      historyId: entry.id,
      createdAt: entry.createdAt,
    });
    await this.openGroupInLeaf(group, leaf, activePath);
    this.touchGroup(group);
    await this.persist();
    this.refreshUI();
    if (missing) new Notice(`Opened ${group.name} with ${available.length} files. Skipped ${missing} missing.`);
  }

  isSupportedFile(file) {
    if (!(file instanceof TFile)) return false;
    return !this.settings.allowOnlyMarkdown || file.extension.toLowerCase() === "md";
  }

  getLeafPath(leaf) {
    const state = leaf?.getViewState?.();
    const path = state?.state?.file;
    return typeof path === "string" ? path : null;
  }

  getLeafViewType(leaf) {
    return leaf?.getViewState?.()?.type || "file";
  }

  getRawLeafViewState(leaf) {
    const original = this.leafViewStateOverrides.get(leaf);
    if (original?.value) return original.value.call(leaf);
    return leaf?.getViewState?.();
  }

  patchLeafOpenFile(group, leaf) {
    if (!group || !leaf || typeof leaf.openFile !== "function") return;
    if (!this.leafOpenFileOverrides.has(leaf)) {
      this.leafOpenFileOverrides.set(leaf, {
        hadOwn: Object.prototype.hasOwnProperty.call(leaf, "openFile"),
        value: leaf.openFile,
      });
    }
    const original = this.leafOpenFileOverrides.get(leaf).value;
    leaf.openFile = async (file, openState) => {
      const currentGroup = this.getGroupForLeaf(leaf) ?? this.getGroup(group.id);
      if (
        this.isUnloading
        || this.fileOpenRoutingDepth > 0
        || !(file instanceof TFile)
        || !currentGroup
        || currentGroup.members.some((member) => member.path === file.path)
      ) {
        const result = await original.call(leaf, file, openState);
        if (currentGroup && file instanceof TFile && currentGroup.members.some((member) => member.path === file.path)) {
          currentGroup.activePath = file.path;
        }
        return result;
      }

      return this.openFileOutsideGroup(leaf, file, openState);
    };
  }

  restoreLeafOpenFile(leaf) {
    const original = this.leafOpenFileOverrides.get(leaf);
    if (!original) return;
    if (original.hadOwn) leaf.openFile = original.value;
    else delete leaf.openFile;
    this.leafOpenFileOverrides.delete(leaf);
  }

  async openFileOutsideGroup(groupLeaf, file, openState) {
    if (!(file instanceof TFile)) return;
    this.fileOpenRoutingDepth += 1;
    try {
      let destination = this.findOrdinaryLeafByPath(file.path, groupLeaf);
      if (!destination) {
        destination = this.app.workspace.getLeaf("tab");
        if (destination === groupLeaf) destination = this.app.workspace.getLeaf(true);
      }
      if (!destination || destination === groupLeaf) {
        throw new Error("Obsidian did not provide a separate tab for the requested file.");
      }

      // A new tab created while a group is active may inherit the group's saved
      // marker from the source leaf. Remove that marker before opening the file so
      // the destination always remains an ordinary tab.
      const marker = this.getLeafGroupMarker(destination);
      if (marker) await this.clearGroupLeafMarker(destination, marker);

      if (this.getLeafPath(destination) !== file.path) {
        const destinationOriginal = this.leafOpenFileOverrides.get(destination)?.value ?? destination.openFile;
        await destinationOriginal.call(destination, file, openState);
      }
      const shouldActivate = openState?.active !== false;
      if (shouldActivate) {
        this.app.workspace.setActiveLeaf(destination, { focus: true });
        await this.app.workspace.revealLeaf?.(destination);
      }
      return undefined;
    } catch (error) {
      console.error("Group Tabs could not open a non-member outside its group", error);
      new Notice(`Group Tabs could not open ${file.path} in a separate tab: ${GroupTabsPlugin.errorMessage(error)}`);
      return undefined;
    } finally {
      this.fileOpenRoutingDepth = Math.max(0, this.fileOpenRoutingDepth - 1);
    }
  }

  patchLeafViewState(group, leaf) {
    if (!leaf || typeof leaf.getViewState !== "function") return;
    if (!this.leafViewStateOverrides.has(leaf)) {
      this.leafViewStateOverrides.set(leaf, {
        hadOwn: Object.prototype.hasOwnProperty.call(leaf, "getViewState"),
        value: leaf.getViewState,
      });
    }
    const original = this.leafViewStateOverrides.get(leaf).value;
    leaf.getViewState = () => {
      const current = original.call(leaf);
      const state = { ...(current?.state || {}) };
      if (current?.type === EMPTY_GROUP_VIEW_TYPE) state.groupId = group.id;
      else state.groupTabsGroupId = group.id;
      return { ...current, state };
    };
  }

  restoreLeafViewState(leaf) {
    const original = this.leafViewStateOverrides.get(leaf);
    if (!original) return;
    if (original.hadOwn) leaf.getViewState = original.value;
    else delete leaf.getViewState;
    this.leafViewStateOverrides.delete(leaf);
  }

  getLeafGroupMarker(leaf) {
    const state = leaf?.getViewState?.();
    if (state?.type === EMPTY_GROUP_VIEW_TYPE && typeof state?.state?.groupId === "string") return state.state.groupId;
    return typeof state?.state?.groupTabsGroupId === "string" ? state.state.groupTabsGroupId : null;
  }

  async stampGroupLeaf(group, leaf) {
    if (!group || !leaf?.getViewState || !leaf?.setViewState || this.stampingLeaves.has(leaf)) return;
    const current = this.getRawLeafViewState(leaf);
    const marker = current?.type === EMPTY_GROUP_VIEW_TYPE
      ? current?.state?.groupId
      : current?.state?.groupTabsGroupId;
    if (marker === group.id) return;
    const state = { ...(current?.state || {}) };
    if (current?.type === EMPTY_GROUP_VIEW_TYPE) state.groupId = group.id;
    else state.groupTabsGroupId = group.id;
    this.stampingLeaves.add(leaf);
    this.fileOpenRoutingDepth += 1;
    try {
      await leaf.setViewState({ ...current, state, active: current?.active });
    } finally {
      this.fileOpenRoutingDepth = Math.max(0, this.fileOpenRoutingDepth - 1);
      this.stampingLeaves.delete(leaf);
    }
    this.requestWorkspaceSave();
  }

  async clearGroupLeafMarker(leaf, groupId = null) {
    if (!leaf?.getViewState || !leaf?.setViewState || this.stampingLeaves.has(leaf)) return;
    const current = this.getRawLeafViewState(leaf);
    const marker = current?.type === EMPTY_GROUP_VIEW_TYPE
      ? current?.state?.groupId
      : current?.state?.groupTabsGroupId;
    if (!marker || (groupId && marker !== groupId)) return;
    if (current?.type === EMPTY_GROUP_VIEW_TYPE) return;
    const state = { ...(current?.state || {}) };
    delete state.groupTabsGroupId;
    this.stampingLeaves.add(leaf);
    this.fileOpenRoutingDepth += 1;
    try {
      await leaf.setViewState({ ...current, state, active: current?.active });
    } finally {
      this.fileOpenRoutingDepth = Math.max(0, this.fileOpenRoutingDepth - 1);
      this.stampingLeaves.delete(leaf);
    }
    this.requestWorkspaceSave();
  }

  getLeafHeader(leaf) {
    const header = leaf?.tabHeaderEl;
    return header && header.nodeType === 1 ? header : null;
  }

  getGroupForLeaf(leaf) {
    const groupId = this.leafGroups.get(leaf);
    return groupId ? this.getGroup(groupId) : null;
  }

  getGroupLeaf(groupId) {
    const leaf = this.groupLeaves.get(groupId) ?? null;
    if (!leaf) return null;
    if (this.isLeafInWorkspace(leaf)) return leaf;
    return null;
  }

  isLeafInWorkspace(target) {
    let found = false;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf === target) found = true;
    });
    return found;
  }

  getOpenLeavesInParent(parent) {
    const leaves = [];
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (leaf.parent === parent && this.getLeafHeader(leaf)) leaves.push(leaf);
    });
    return leaves;
  }

  findLeafByHeader(header) {
    let found = null;
    this.app.workspace.iterateAllLeaves((leaf) => {
      if (!found && this.getLeafHeader(leaf) === header) found = leaf;
    });
    return found;
  }

  bindGroupLeaf(groupId, leaf) {
    const group = this.getGroup(groupId);
    if (!group || !leaf) return;
    const previous = this.groupLeaves.get(groupId);
    if (previous && previous !== leaf) {
      this.unbindGroupLeaf(groupId, false);
      void this.clearGroupLeafMarker(previous, groupId);
    }
    const otherGroupId = this.leafGroups.get(leaf);
    if (otherGroupId && otherGroupId !== groupId) {
      this.unbindGroupLeaf(otherGroupId, false);
      void this.clearGroupLeafMarker(leaf, otherGroupId);
    }
    this.groupLeaves.set(groupId, leaf);
    this.leafGroups.set(leaf, groupId);
    this.patchLeafOpenFile(group, leaf);
    if (leaf.parent) this.groupParents.set(groupId, leaf.parent);
    if (typeof leaf.id === "string") group.leafId = leaf.id;
    this.decorateGroupLeaf(group, leaf);
  }

  unbindGroupLeaf(groupId, restore = true, clearMarker = false) {
    const leaf = this.groupLeaves.get(groupId);
    if (!leaf) return null;
    if (restore) this.restoreLeafDecoration(leaf);
    if (clearMarker) void this.clearGroupLeafMarker(leaf, groupId);
    this.groupLeaves.delete(groupId);
    this.leafGroups.delete(leaf);
    return leaf;
  }

  patchLeafDisplay(group, leaf) {
    if (!leaf || typeof leaf.getDisplayText !== "function") return;
    if (!this.leafDisplayOverrides.has(leaf)) {
      this.leafDisplayOverrides.set(leaf, {
        hadOwn: Object.prototype.hasOwnProperty.call(leaf, "getDisplayText"),
        value: leaf.getDisplayText,
      });
    }
    leaf.getDisplayText = () => `${group.name} · ${group.members.length}`;
  }

  restoreLeafDisplay(leaf) {
    const original = this.leafDisplayOverrides.get(leaf);
    if (!original) return;
    if (original.hadOwn) leaf.getDisplayText = original.value;
    else delete leaf.getDisplayText;
    this.leafDisplayOverrides.delete(leaf);
  }

  patchViewDisplay(group, leaf) {
    const view = leaf?.view;
    const previous = this.viewDisplayBindings.get(leaf);
    if (previous?.view && previous.view !== view) {
      if (previous.hadOwn) previous.view.getDisplayText = previous.value;
      else delete previous.view.getDisplayText;
      this.viewDisplayBindings.delete(leaf);
    }
    if (!view || typeof view.getDisplayText !== "function") return;
    if (!this.viewDisplayBindings.has(leaf)) {
      this.viewDisplayBindings.set(leaf, {
        view,
        hadOwn: Object.prototype.hasOwnProperty.call(view, "getDisplayText"),
        value: view.getDisplayText,
      });
    }
    view.getDisplayText = () => `${group.name} · ${group.members.length}`;
  }

  restoreViewDisplay(leaf) {
    const original = this.viewDisplayBindings.get(leaf);
    if (!original) return;
    if (original.hadOwn) original.view.getDisplayText = original.value;
    else delete original.view.getDisplayText;
    this.viewDisplayBindings.delete(leaf);
  }

  patchLeafIcon(leaf) {
    if (!leaf || typeof leaf.getIcon !== "function") return;
    if (!this.leafIconOverrides.has(leaf)) {
      this.leafIconOverrides.set(leaf, {
        hadOwn: Object.prototype.hasOwnProperty.call(leaf, "getIcon"),
        value: leaf.getIcon,
      });
    }
    leaf.getIcon = () => "";
  }

  restoreLeafIcon(leaf) {
    const original = this.leafIconOverrides.get(leaf);
    if (!original) return;
    if (original.hadOwn) leaf.getIcon = original.value;
    else delete leaf.getIcon;
    this.leafIconOverrides.delete(leaf);
  }

  patchViewIcon(leaf) {
    const view = leaf?.view;
    const previous = this.viewIconBindings.get(leaf);
    if (previous && previous.view !== view) {
      if (previous.hadOwn) previous.view.getIcon = previous.value;
      else delete previous.view.getIcon;
      this.viewIconBindings.delete(leaf);
    }
    if (!view || typeof view.getIcon !== "function") return;
    if (!this.viewIconBindings.has(leaf)) {
      this.viewIconBindings.set(leaf, {
        view,
        hadOwn: Object.prototype.hasOwnProperty.call(view, "getIcon"),
        value: view.getIcon,
      });
    }
    view.getIcon = () => "";
  }

  restoreViewIcon(leaf) {
    const original = this.viewIconBindings.get(leaf);
    if (!original) return;
    if (original.hadOwn) original.view.getIcon = original.value;
    else delete original.view.getIcon;
    this.viewIconBindings.delete(leaf);
  }

  hideNativeGroupIcons(header) {
    for (const icon of header.querySelectorAll?.(
      ".workspace-tab-header-inner-icon, .workspace-tab-header-inner-icon-container, .workspace-tab-header-icon",
    ) ?? []) {
      if (icon.dataset.groupTabsOriginalHidden === undefined) {
        icon.dataset.groupTabsOriginalHidden = icon.hidden ? "true" : "false";
      }
      icon.hidden = true;
      icon.setAttribute?.("aria-hidden", "true");
      icon.dataset.groupTabsHiddenIcon = "true";
    }
  }

  restoreNativeGroupIcons(header) {
    for (const icon of header.querySelectorAll?.('[data-group-tabs-hidden-icon="true"]') ?? []) {
      icon.hidden = icon.dataset.groupTabsOriginalHidden === "true";
      icon.removeAttribute?.("aria-hidden");
      delete icon.dataset.groupTabsOriginalHidden;
      delete icon.dataset.groupTabsHiddenIcon;
    }
  }

  decorateGroupLeaf(group, leaf) {
    this.patchLeafOpenFile(group, leaf);
    this.patchLeafViewState(group, leaf);
    this.patchLeafDisplay(group, leaf);
    this.patchViewDisplay(group, leaf);
    this.patchLeafIcon(leaf);
    this.patchViewIcon(leaf);
    const header = this.getLeafHeader(leaf);
    if (!header) return;
    header.classList.add(GROUP_HEADER_CLASS);
    header.dataset.groupId = group.id;
    header.title = `${group.name} · ${group.members.length}`;
    header.setAttribute("aria-label", `${group.name} tab group with ${group.members.length} files`);
    this.hideNativeGroupIcons(header);
    const titleEl = header.querySelector(".workspace-tab-header-inner-title");
    if (titleEl) {
      titleEl.replaceChildren();
      const label = header.ownerDocument.createElement("span");
      label.className = "group-tabs-native-label";
      label.textContent = group.name;
      label.title = group.name;
      const toggle = header.ownerDocument.createElement("button");
      toggle.type = "button";
      toggle.className = "group-tabs-native-toggle";
      toggle.textContent = "▾";
      toggle.title = "Show group tabs";
      toggle.setAttribute("aria-label", `Show tabs in ${group.name}`);
      toggle.addEventListener("pointerdown", (event) => event.stopPropagation());
      toggle.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const currentGroup = this.getGroup(header.dataset.groupId);
        if (currentGroup) this.togglePopup(currentGroup, header);
      });
      const count = header.ownerDocument.createElement("span");
      count.className = "group-tabs-native-count";
      count.textContent = String(group.members.length);
      titleEl.append(label, toggle, count);
    }
    if (!this.headerCleanups.has(header)) {
      const onContextMenu = (event) => {
        const currentGroup = this.getGroup(header.dataset.groupId);
        if (currentGroup) this.openGroupMenu(currentGroup, event);
      };
      header.addEventListener("contextmenu", onContextMenu);
      this.headerCleanups.set(header, () => {
        header.removeEventListener("contextmenu", onContextMenu);
      });
    }
  }

  restoreLeafDecoration(leaf) {
    const header = this.getLeafHeader(leaf);
    if (header) {
      this.headerCleanups.get(header)?.();
      this.headerCleanups.delete(header);
      this.restoreNativeGroupIcons(header);
      header.classList.remove(GROUP_HEADER_CLASS, DROP_TARGET_CLASS);
      delete header.dataset.groupId;
      header.removeAttribute("aria-label");
    }
    this.restoreLeafOpenFile(leaf);
    this.restoreLeafViewState(leaf);
    this.restoreLeafDisplay(leaf);
    this.restoreViewDisplay(leaf);
    this.restoreLeafIcon(leaf);
    this.restoreViewIcon(leaf);
    if (header) {
      const titleEl = header.querySelector(".workspace-tab-header-inner-title");
      if (titleEl) titleEl.textContent = leaf.getDisplayText?.() || GroupTabsPlugin.basename(this.getLeafPath(leaf));
      header.title = leaf.getDisplayText?.() || "";
    }
  }

  collectSupportedFolderFiles(folder) {
    if (!(folder instanceof TFolder)) return [];
    const files = [];
    const seen = new Set();
    const add = (item) => {
      if (!(item instanceof TFile) || !this.isSupportedFile(item) || seen.has(item.path)) return;
      seen.add(item.path);
      files.push(item);
    };
    if (typeof this.app.vault.recurseChildren === "function") {
      this.app.vault.recurseChildren(folder, add);
    } else {
      const visit = (item) => {
        if (item instanceof TFile) {
          add(item);
          return;
        }
        if (item instanceof TFolder) for (const child of item.children ?? []) visit(child);
      };
      visit(folder);
    }
    return files.sort((left, right) => left.path.localeCompare(right.path));
  }

  addFolderAsGroupMenuItem(menu, folder) {
    if (!menu || !(folder instanceof TFolder) || this.multiFileMenus.has(menu)) return;
    const files = this.collectSupportedFolderFiles(folder);
    if (files.length === 0) return;
    this.multiFileMenus.add(menu);
    menu.addSeparator();
    menu.addItem((item) => item
      .setTitle("Open as tab group")
      .setIcon("folder-plus")
      .onClick(() => this.promptName(
        "Name tab group",
        folder.name || GroupTabsPlugin.basename(folder.path) || "Tab group",
        (name) => void this.createGroupFromFiles(name, files),
      )));
  }

  addOpenAsGroupMenuItem(menu, files) {
    if (!menu || this.multiFileMenus.has(menu)) return;
    const supported = [];
    const seen = new Set();
    for (const file of Array.isArray(files) ? files : []) {
      if (!this.isSupportedFile(file) || seen.has(file.path)) continue;
      seen.add(file.path);
      supported.push(file);
    }
    if (supported.length < 2) return;
    this.multiFileMenus.add(menu);
    menu.addSeparator();
    menu.addItem((item) => item
      .setTitle("Open as tab group")
      .setIcon("folder-plus")
      .onClick(() => this.promptCreateGroupFromFiles(supported)));
  }

  rememberFileExplorerSelection(paths) {
    this.fileExplorerSelectionPaths = new Set(paths);
    this.fileExplorerSelectionOrder = [...paths];
  }

  addTrackedFileExplorerPath(path) {
    if (!path || this.fileExplorerSelectionPaths.has(path)) return;
    this.fileExplorerSelectionPaths.add(path);
    this.fileExplorerSelectionOrder.push(path);
  }

  removeTrackedFileExplorerPath(path) {
    this.fileExplorerSelectionPaths.delete(path);
    this.fileExplorerSelectionOrder = this.fileExplorerSelectionOrder.filter((item) => item !== path);
  }

  isFileExplorerTargetSelected(target) {
    const row = target?.closest?.(".nav-file, .nav-file-title, .tree-item-self, [data-path]");
    return Boolean(row?.classList?.contains("is-selected") || row?.getAttribute?.("aria-selected") === "true");
  }

  trackFileExplorerSelection(event) {
    if (event?.button !== 0) return;
    const target = event?.target;
    if (!target?.closest) return;
    const path = this.getFileExplorerPathFromTarget(target);
    if (!path) return;
    const toggle = Boolean(event.altKey || event.ctrlKey || event.metaKey);
    if (toggle) {
      if (this.fileExplorerSelectionPaths.has(path)) this.removeTrackedFileExplorerPath(path);
      else this.addTrackedFileExplorerPath(path);
      return;
    }
    if (event.shiftKey) {
      this.addTrackedFileExplorerPath(path);
      window.setTimeout(() => this.syncTrackedFileExplorerSelection(target.ownerDocument), 0);
      return;
    }
    this.rememberFileExplorerSelection([path]);
  }

  captureFileExplorerContext(event) {
    const target = event?.target;
    if (!target?.closest) return;
    const path = this.getFileExplorerPathFromTarget(target);
    if (!path) return;
    if (this.fileExplorerSelectionPaths.has(path) || this.isFileExplorerTargetSelected(target)) return;
    this.rememberFileExplorerSelection([path]);
  }

  syncTrackedFileExplorerSelection(doc = typeof document !== "undefined" ? document : null) {
    if (!doc?.querySelectorAll) return;
    const selected = this.getDomSelectedFileExplorerPaths(doc);
    if (selected.length > 0) this.rememberFileExplorerSelection(selected);
  }

  getDomSelectedFileExplorerPaths(doc = typeof document !== "undefined" ? document : null) {
    const paths = [];
    const seen = new Set();
    const selectors = [
      ".nav-file.is-selected",
      ".nav-file-title.is-selected",
      ".tree-item-self.is-selected",
      "[aria-selected=\"true\"]",
      ".is-selected[data-path]",
    ];
    if (!doc?.querySelectorAll) return paths;
    for (const selector of selectors) {
      for (const element of doc.querySelectorAll(selector)) {
        const path = element.dataset?.path
          || element.closest?.("[data-path]")?.dataset?.path
          || element.querySelector?.("[data-path]")?.dataset?.path;
        if (!path || seen.has(path)) continue;
        const file = this.app.vault.getAbstractFileByPath(path);
        if (!(file instanceof TFile)) continue;
        seen.add(path);
        paths.push(path);
      }
    }
    return paths;
  }

  getSelectedFileExplorerFiles(fallbackFile = null, doc = typeof document !== "undefined" ? document : null) {
    const orderedPaths = [];
    const seen = new Set();
    const addPath = (path) => {
      if (!path || seen.has(path)) return;
      seen.add(path);
      orderedPaths.push(path);
    };
    for (const path of this.fileExplorerSelectionOrder) addPath(path);
    for (const path of this.getDomSelectedFileExplorerPaths(doc)) addPath(path);
    if (fallbackFile instanceof TFile) addPath(fallbackFile.path);
    const files = [];
    for (const path of orderedPaths) {
      const file = this.app.vault.getAbstractFileByPath(path);
      if (file instanceof TFile) files.push(file);
    }
    return files;
  }

  getFileExplorerPathFromTarget(target) {
    if (!(target instanceof Element)) return null;
    const explorer = target.closest(".nav-files-container, .workspace-leaf-content[data-type=\"file-explorer\"], .nav-file, .nav-folder");
    if (!explorer) return null;
    const pathElement = target.closest("[data-path]") ?? explorer.closest?.("[data-path]") ?? explorer.querySelector?.("[data-path]");
    const path = pathElement?.dataset?.path;
    if (!path) return null;
    return this.app.vault.getAbstractFileByPath(path) instanceof TFile ? path : null;
  }

  getDraggedFileExplorerFiles(target) {
    const path = this.getFileExplorerPathFromTarget(target);
    if (!path) return [];
    const row = target.closest(".nav-file, .nav-file-title, .tree-item-self, [data-path]");
    const selected = this.fileExplorerSelectionPaths.has(path)
      || row?.classList?.contains("is-selected")
      || row?.getAttribute?.("aria-selected") === "true";
    const files = selected ? this.getSelectedFileExplorerFiles(null, target.ownerDocument) : [];
    if (files.length > 0) return files.filter((file) => this.isSupportedFile(file));
    const file = this.app.vault.getAbstractFileByPath(path);
    return this.isSupportedFile(file) ? [file] : [];
  }

  getBookmarksPluginItems() {
    try {
      const items = this.app?.internalPlugins?.getPluginById?.("bookmarks")?.instance?.items;
      return Array.isArray(items) ? items : [];
    } catch (_) {
      return [];
    }
  }

  isBookmarksNavigationTarget(target) {
    let node = target;
    for (let depth = 0; node && depth < 16; depth += 1) {
      if (node?.dataset?.type === "bookmarks") return true;
      if (typeof node.getAttribute === "function" && node.getAttribute("data-type") === "bookmarks") return true;
      node = node.parentElement || node.parentNode || null;
    }
    return false;
  }

  bookmarkItemDisplayName(item) {
    if (typeof item?.title === "string" && item.title.trim()) return item.title.trim();
    if (typeof item?.path !== "string" || !item.path.trim()) return "";
    const name = item.path.replace(/\\/g, "/").split("/").pop() || "";
    const dot = name.lastIndexOf(".");
    return dot > 0 ? name.slice(0, dot) : name;
  }

  resolveBookmarkTreePath(rawValue) {
    if (typeof rawValue !== "string") return null;
    const treePath = rawValue.replace(/\\/g, "/").replace(/^\/+|\/+$/g, "").trim();
    if (!treePath) return null;
    const matches = [];
    const seen = new Set();
    const visit = (items, groups = [], depth = 0) => {
      if (!Array.isArray(items) || depth > 20) return;
      for (const item of items) {
        if (!item || typeof item !== "object") continue;
        if (item.type === "group") {
          const title = typeof item.title === "string" ? item.title.trim() : "";
          visit(item.items, title ? [...groups, title] : groups, depth + 1);
          continue;
        }
        if (item.type !== "file" || typeof item.path !== "string" || !item.path.trim()) continue;
        const displayName = this.bookmarkItemDisplayName(item);
        if (!displayName) continue;
        const renderedPath = [...groups, displayName].join("/");
        if (renderedPath !== treePath) continue;
        const file = this.app.vault.getAbstractFileByPath(item.path);
        if (!(file instanceof TFile) || !this.isSupportedFile(file) || seen.has(file.path)) continue;
        seen.add(file.path);
        matches.push(file);
      }
    };
    visit(this.getBookmarksPluginItems());
    return matches.length === 1 ? matches[0] : null;
  }

  resolveNavigationFileCandidate(rawValue) {
    if (typeof rawValue !== "string") return null;
    let value = rawValue.trim();
    if (!value) return null;

    if (/^obsidian:\/\/open\?/i.test(value)) {
      try {
        const url = new URL(value);
        value = url.searchParams.get("file") || url.searchParams.get("path") || "";
      } catch (_) {
        return null;
      }
    } else if (/^[a-z][a-z0-9+.-]*:/i.test(value)) {
      return null;
    }

    value = value.replace(/^#+/, "");
    const queryIndex = value.indexOf("?");
    if (queryIndex >= 0) value = value.slice(0, queryIndex);
    const headingIndex = value.indexOf("#");
    if (headingIndex >= 0) value = value.slice(0, headingIndex);
    try {
      value = decodeURIComponent(value);
    } catch (_) {
      // Keep the original candidate when it contains malformed escape sequences.
    }
    value = value.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "").trim();
    if (!value) return null;

    const direct = this.app.vault.getAbstractFileByPath(value);
    if (direct instanceof TFile) return direct;
    if (direct) return null;

    if (!value.toLowerCase().endsWith(".md")) {
      const markdown = this.app.vault.getAbstractFileByPath(`${value}.md`);
      if (markdown instanceof TFile) return markdown;
    }

    const linked = this.app.metadataCache?.getFirstLinkpathDest?.(value, "");
    return linked instanceof TFile ? linked : null;
  }

  getNavigationFilePathFromTarget(target) {
    if (!target || typeof target !== "object") return null;
    const candidates = [];
    const seenNodes = new Set();
    const addCandidate = (value) => {
      if (typeof value === "string" && value.trim()) candidates.push(value);
    };
    const inspectNode = (node) => {
      if (!node || typeof node !== "object" || seenNodes.has(node)) return;
      seenNodes.add(node);
      addCandidate(node.dataset?.path);
      addCandidate(node.dataset?.filePath);
      addCandidate(node.dataset?.href);
      addCandidate(node.dataset?.file);
      if (typeof node.getAttribute === "function") {
        addCandidate(node.getAttribute("data-path"));
        addCandidate(node.getAttribute("data-file-path"));
        addCandidate(node.getAttribute("data-href"));
        addCandidate(node.getAttribute("data-file"));
        addCandidate(node.getAttribute("href"));
      }
      addCandidate(typeof node.href === "string" ? node.href : null);
    };

    let node = target;
    for (let depth = 0; node && depth < 10; depth += 1) {
      inspectNode(node);
      node = node.parentElement || node.parentNode || null;
    }

    const scope = typeof target.closest === "function"
      ? target.closest(".search-result-file-match, .search-result-file-title, .search-result-container, .tree-item-self, .nav-file, .nav-file-title, .internal-link, [data-path], [data-file-path], [data-href]")
      : null;
    inspectNode(scope);
    if (scope && typeof scope.querySelectorAll === "function") {
      for (const descendant of scope.querySelectorAll("[data-path], [data-file-path], [data-href], [data-file], a[href]")) {
        inspectNode(descendant);
      }
    }

    const inBookmarks = this.isBookmarksNavigationTarget(target);
    for (const candidate of candidates) {
      if (inBookmarks) {
        const bookmarked = this.resolveBookmarkTreePath(candidate);
        if (bookmarked instanceof TFile) return bookmarked.path;
      }
      const file = this.resolveNavigationFileCandidate(candidate);
      if (file instanceof TFile) return file.path;
    }
    return null;
  }

  getDraggedNavigationFiles(target) {
    const explorerFiles = this.getDraggedFileExplorerFiles(target);
    if (explorerFiles.length > 0) return explorerFiles;
    const path = this.getNavigationFilePathFromTarget(target);
    if (!path) return [];
    const file = this.app.vault.getAbstractFileByPath(path);
    return this.isSupportedFile(file) ? [file] : [];
  }

  findOrdinaryLeafByPath(path, excludedLeaf = null) {
    let found = null;
    this.app.workspace.iterateAllLeaves?.((leaf) => {
      if (found || leaf === excludedLeaf || this.getGroupForLeaf(leaf)) return;
      if (this.getLeafPath(leaf) === path) found = leaf;
    });
    return found;
  }

  detachOrdinaryLeavesByPaths(paths, excludedLeaves = []) {
    const wanted = paths instanceof Set ? paths : new Set(paths || []);
    if (wanted.size === 0) return 0;
    const excluded = new Set(excludedLeaves.filter(Boolean));
    const matches = [];
    this.app.workspace.iterateAllLeaves?.((leaf) => {
      if (excluded.has(leaf) || this.getGroupForLeaf(leaf)) return;
      const path = this.getLeafPath(leaf);
      if (path && wanted.has(path)) matches.push(leaf);
    });
    for (const leaf of matches) leaf.detach?.();
    return matches.length;
  }

  getAvailableGroupPath(group, preferredPath = group.activePath) {
    const ordered = [preferredPath, ...group.members.map((member) => member.path)];
    const seen = new Set();
    for (const path of ordered) {
      if (!path || seen.has(path)) continue;
      seen.add(path);
      if (this.app.vault.getAbstractFileByPath(path) instanceof TFile) return path;
    }
    return null;
  }

  waitForFileOpenSettlement() {
    return new Promise((resolve) => globalThis.setTimeout(resolve, FILE_OPEN_SETTLE_MS));
  }

  async handleFileOpen(file) {
    if (this.fileOpenRoutingDepth > 0 || !(file instanceof TFile) || this.isUnloading) return;

    // Obsidian can emit file-open before the reused leaf has finished changing its
    // view state. Queue and coalesce events, then enforce the group-leaf invariant
    // after the workspace has settled. This applies equally to File Explorer,
    // Search, Recent Files, Bookmarks, backlinks, the Quick Switcher, graph results,
    // internal links, and third-party navigation that uses normal workspace leaves.
    this.pendingFileOpenPaths.add(file.path);
    if (!this.fileOpenReconcilePromise) {
      this.fileOpenReconcilePromise = this.runFileOpenReconciliationLoop()
        .finally(() => {
          this.fileOpenReconcilePromise = null;
        });
    }
    return this.fileOpenReconcilePromise;
  }

  async runFileOpenReconciliationLoop() {
    while (this.pendingFileOpenPaths.size > 0 && !this.isUnloading) {
      this.pendingFileOpenPaths.clear();
      await this.waitForFileOpenSettlement();
      await this.reconcileGroupLeafRouting();
      await new Promise((resolve) => globalThis.setTimeout(resolve, FILE_OPEN_RECHECK_MS));
      await this.reconcileGroupLeafRouting();
    }
  }

  async reconcileGroupLeafRouting() {
    if (this.fileOpenRoutingDepth > 0 || this.isUnloading) return;
    const candidates = [];
    for (const [groupId, groupLeaf] of this.groupLeaves) {
      const group = this.getGroup(groupId);
      if (!group || !this.isLeafInWorkspace(groupLeaf)) continue;
      const displayedPath = this.getLeafPath(groupLeaf);
      if (!displayedPath) continue;
      const isMember = group.members.some((member) => member.path === displayedPath);
      if (!isMember || group.activePath !== displayedPath) {
        candidates.push({ group, groupLeaf, displayedPath, isMember });
      }
    }
    if (candidates.length === 0) return;

    let changed = false;
    this.fileOpenRoutingDepth += 1;
    try {
      for (const { group, groupLeaf, displayedPath, isMember } of candidates) {
        if (isMember) {
          group.activePath = displayedPath;
          this.bindGroupLeaf(group.id, groupLeaf);
          await this.stampGroupLeaf(group, groupLeaf);
          changed = true;
          continue;
        }

        const targetFile = this.app.vault.getAbstractFileByPath(displayedPath);
        if (!(targetFile instanceof TFile)) continue;
        const previousPath = this.getAvailableGroupPath(group, group.activePath);
        const previous = previousPath ? this.app.vault.getAbstractFileByPath(previousPath) : null;
        if (previous instanceof TFile) {
          await groupLeaf.openFile(previous, { active: false });
          group.activePath = previous.path;
        } else {
          await groupLeaf.setViewState({ type: EMPTY_GROUP_VIEW_TYPE, state: { groupId: group.id }, active: false });
        }
        this.bindGroupLeaf(group.id, groupLeaf);
        await this.stampGroupLeaf(group, groupLeaf);

        let destination = this.findOrdinaryLeafByPath(displayedPath, groupLeaf);
        if (!destination) destination = this.app.workspace.getLeaf("tab");
        if (this.getLeafPath(destination) !== displayedPath) await destination.openFile(targetFile, { active: true });
        this.app.workspace.setActiveLeaf(destination, { focus: true });
        await this.app.workspace.revealLeaf?.(destination);
        changed = true;
      }
      if (changed) {
        await this.persist();
        this.refreshUI();
      }
    } finally {
      this.fileOpenRoutingDepth = Math.max(0, this.fileOpenRoutingDepth - 1);
    }
  }

  promptName(title, suggested, callback) {
    new NamePromptModal(this.app, title, suggested, callback).open();
  }

  confirm(title, message, confirmText = "Continue") {
    return new Promise((resolve) => new ConfirmModal(this.app, title, message, confirmText, resolve).open());
  }

  promptCreateGroupFromFiles(files) {
    const unique = [];
    const seen = new Set();
    for (const file of files) {
      if (!this.isSupportedFile(file) || seen.has(file.path)) continue;
      seen.add(file.path);
      unique.push(file);
    }
    if (unique.length < 2) {
      new Notice("Select at least two supported files.");
      return;
    }
    const suggested = GroupTabsPlugin.commonParentName(unique.map((file) => file.path));
    this.promptName("Name tab group", suggested, (name) => void this.createGroupFromFiles(name, unique));
  }

  promptCreateGroupFromCurrentStrip() {
    const activeLeaf = this.app.workspace.getMostRecentLeaf?.();
    if (!activeLeaf?.parent) {
      new Notice("No active tab strip.");
      return;
    }
    const leaves = this.getOpenLeavesInParent(activeLeaf.parent).filter((leaf) => {
      if (this.leafGroups.has(leaf)) return false;
      const path = this.getLeafPath(leaf);
      return path && this.isSupportedFile(this.app.vault.getAbstractFileByPath(path));
    });
    if (leaves.length < 2) {
      new Notice("The active tab strip needs at least two supported files.");
      return;
    }
    const suggested = GroupTabsPlugin.commonParentName(leaves.map((leaf) => this.getLeafPath(leaf)));
    this.promptName("Name tab group", suggested, (name) => void this.createGroupFromLeaves(name, leaves, activeLeaf));
  }

  async createGroupFromFiles(name, files) {
    const members = uniqueMembers(files.map((file) => ({
      path: file.path,
      viewType: file.extension.toLowerCase() === "md" ? "markdown" : "file",
    })));
    if (members.length < 2) return null;
    const group = this.createGroupRecord(name, members, members[0].path);
    const active = this.app.workspace.getMostRecentLeaf?.();
    if (active) this.app.workspace.setActiveLeaf(active, { focus: false });
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.setViewState({ type: EMPTY_GROUP_VIEW_TYPE, state: { groupId: group.id }, active: true });
    this.bindGroupLeaf(group.id, leaf);
    await this.stampGroupLeaf(group, leaf);

    const selected = new Set(members.map((member) => member.path));
    for (const candidate of this.getOpenLeavesInParent(leaf.parent)) {
      if (candidate !== leaf && !this.leafGroups.has(candidate) && selected.has(this.getLeafPath(candidate))) candidate.detach();
    }

    this.touchGroup(group);
    await this.persist();
    this.refreshUI();
    new Notice(`Tab group “${group.name}” created with ${group.members.length} files.`);
    return group;
  }

  async createGroupFromLeaves(name, leaves, preferredLeaf = null) {
    const validLeaves = leaves.filter((leaf) => this.isLeafSupported(leaf));
    const members = uniqueMembers(validLeaves.map((leaf) => ({
      path: this.getLeafPath(leaf),
      viewType: this.getLeafViewType(leaf),
    })));
    if (members.length < 2) return null;
    const active = this.app.workspace.getMostRecentLeaf?.();
    const host = preferredLeaf && validLeaves.includes(preferredLeaf)
      ? preferredLeaf
      : active && validLeaves.includes(active)
        ? active
        : validLeaves[0];
    const group = this.createGroupRecord(name, members, this.getLeafPath(host));
    this.bindGroupLeaf(group.id, host);
    await this.stampGroupLeaf(group, host);
    for (const leaf of validLeaves) {
      if (leaf !== host) leaf.detach();
    }
    this.touchGroup(group);
    await this.persist();
    this.refreshUI();
    new Notice(`Tab group “${group.name}” created.`);
    return group;
  }

  async createGroupFromLeafAndFiles(name, targetLeaf, files) {
    if (!this.isLeafSupported(targetLeaf)) return null;
    const targetMember = { path: this.getLeafPath(targetLeaf), viewType: this.getLeafViewType(targetLeaf) };
    const fileMembers = files.filter((file) => this.isSupportedFile(file)).map((file) => ({
      path: file.path,
      viewType: file.extension.toLowerCase() === "md" ? "markdown" : "file",
    }));
    const members = uniqueMembers([targetMember, ...fileMembers]);
    if (members.length < 2) return null;
    const group = this.createGroupRecord(name, members, targetMember.path);
    this.bindGroupLeaf(group.id, targetLeaf);
    await this.stampGroupLeaf(group, targetLeaf);
    const addedPaths = new Set(fileMembers.map((member) => member.path));
    for (const leaf of this.getOpenLeavesInParent(targetLeaf.parent)) {
      if (leaf !== targetLeaf && !this.leafGroups.has(leaf) && addedPaths.has(this.getLeafPath(leaf))) leaf.detach();
    }
    this.touchGroup(group);
    await this.persist();
    this.refreshUI();
    return group;
  }

  async openGroupInLeaf(group, leaf, activePath = group.activePath) {
    const file = activePath ? this.app.vault.getAbstractFileByPath(activePath) : null;
    if (file instanceof TFile) await leaf.openFile(file, { active: true });
    else await leaf.setViewState({ type: EMPTY_GROUP_VIEW_TYPE, state: { groupId: group.id }, active: true });
    this.bindGroupLeaf(group.id, leaf);
    await this.stampGroupLeaf(group, leaf);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    await this.app.workspace.revealLeaf?.(leaf);
  }

  async activateMember(groupId, path) {
    const group = this.getGroup(groupId);
    if (!group || !group.members.some((member) => member.path === path)) return;
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) {
      new Notice(`File not found: ${path}`);
      return;
    }
    let leaf = this.getGroupLeaf(groupId);
    if (!leaf) {
      const active = this.app.workspace.getMostRecentLeaf?.();
      if (active) this.app.workspace.setActiveLeaf(active, { focus: false });
      leaf = this.app.workspace.getLeaf("tab");
    }
    await leaf.openFile(file, { active: true });
    group.activePath = path;
    this.bindGroupLeaf(groupId, leaf);
    await this.stampGroupLeaf(group, leaf);
    this.app.workspace.setActiveLeaf(leaf, { focus: true });
    await this.app.workspace.revealLeaf?.(leaf);
    await this.persist();
    this.refreshUI();
  }

  async removeMember(groupId, path) {
    const group = this.getGroup(groupId);
    if (!group) return;
    const wasActive = group.activePath === path;
    group.members = group.members.filter((member) => member.path !== path);
    if (group.members.length === 0) {
      await this.closeGroup(groupId, false);
      return;
    }
    if (wasActive) {
      group.activePath = group.members[0].path;
      await this.activateMember(groupId, group.activePath);
    }
    this.touchGroup(group);
    await this.persist();
    this.refreshUI();
  }

  reorderMember(groupId, sourcePath, targetPath) {
    const group = this.getGroup(groupId);
    if (!group || sourcePath === targetPath) return;
    const sourceIndex = group.members.findIndex((member) => member.path === sourcePath);
    const targetIndex = group.members.findIndex((member) => member.path === targetPath);
    if (sourceIndex === -1 || targetIndex === -1) return;
    const [member] = group.members.splice(sourceIndex, 1);
    const adjustedTarget = sourceIndex < targetIndex ? targetIndex - 1 : targetIndex;
    group.members.splice(adjustedTarget, 0, member);
    this.touchGroup(group);
    void this.persist();
    this.scheduleRefresh();
  }

  moveMember(groupId, path, delta) {
    const group = this.getGroup(groupId);
    if (!group) return;
    const index = group.members.findIndex((member) => member.path === path);
    const target = index + delta;
    if (index < 0 || target < 0 || target >= group.members.length) return;
    const [member] = group.members.splice(index, 1);
    group.members.splice(target, 0, member);
    this.touchGroup(group);
    void this.persist();
    this.scheduleRefresh();
  }

  openMemberMenu(groupId, path, event, anchorEl) {
    const group = this.getGroup(groupId);
    if (!group) return;
    event?.preventDefault?.();
    event?.stopPropagation?.();
    const index = group.members.findIndex((member) => member.path === path);
    const menu = new Menu();
    menu.addItem((item) => item.setTitle("Move up").setIcon("arrow-up").setDisabled(index <= 0).onClick(() => this.moveMember(groupId, path, -1)));
    menu.addItem((item) => item.setTitle("Move down").setIcon("arrow-down").setDisabled(index < 0 || index >= group.members.length - 1).onClick(() => this.moveMember(groupId, path, 1)));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle("Remove from group").setIcon("x").onClick(() => void this.removeMember(groupId, path)));
    if (event?.clientX || event?.clientY) menu.showAtMouseEvent(event);
    else {
      const rect = anchorEl?.getBoundingClientRect?.();
      menu.showAtPosition({ x: rect?.left ?? 0, y: rect?.bottom ?? 0 });
    }
  }

  async renameGroup(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return;
    this.promptName("Rename tab group", group.name, async (name) => {
      group.name = name;
      this.touchGroup(group);
      await this.persist();
      this.refreshUI();
    });
  }

  async expandGroup(groupId) {
    const group = this.getGroup(groupId);
    if (!group) return;
    if (group.members.length >= LARGE_GROUP_CONFIRM_COUNT) {
      const confirmed = await this.confirm(
        "Expand large tab group",
        `This will open ${group.members.length} files as ordinary tabs and remove the group. Continue?`,
        "Expand group",
      );
      if (!confirmed) return;
    }

    const host = this.getGroupLeaf(groupId);
    const parent = host?.parent ?? this.groupParents.get(groupId) ?? null;
    const members = [...group.members];
    const activePath = group.activePath;
    this.closePopup();
    this.settings.groups = this.settings.groups.filter((item) => item.id !== groupId);
    this.unbindGroupLeaf(groupId, true, true);
    this.groupParents.delete(groupId);
    await this.persist();

    let anchor = host ?? this.app.workspace.getMostRecentLeaf?.();
    const opened = new Map();
    for (let index = 0; index < members.length; index += 1) {
      const member = members[index];
      const file = this.app.vault.getAbstractFileByPath(member.path);
      if (!(file instanceof TFile)) continue;
      let leaf;
      if (index === 0 && host && this.isLeafInWorkspace(host)) {
        leaf = host;
      } else {
        if (anchor) this.app.workspace.setActiveLeaf(anchor, { focus: false });
        leaf = this.app.workspace.getLeaf("tab");
      }
      await leaf.openFile(file, { active: false });
      opened.set(member.path, leaf);
      anchor = leaf;
    }
    const activeLeaf = opened.get(activePath) ?? opened.values().next().value ?? null;
    if (activeLeaf) this.app.workspace.setActiveLeaf(activeLeaf, { focus: true });
    this.refreshUI();
  }

  hasUnsavedChanges(groupId) {
    const leaf = this.getGroupLeaf(groupId);
    return Boolean(leaf?.view?.dirty === true || leaf?.view?.isDirty === true);
  }

  async removeGroupRecord(groupId, detachLeaf) {
    const group = this.getGroup(groupId);
    if (!group) return;
    const leaf = this.unbindGroupLeaf(groupId, true, true);
    this.settings.groups = this.settings.groups.filter((item) => item.id !== groupId);
    this.groupParents.delete(groupId);
    this.closePopup();
    await this.persist();
    if (detachLeaf && leaf?.detach) leaf.detach();
    this.clearNativeDragPresentation();
    this.refreshUI();
  }

  async closeGroup(groupId, confirmUnsaved = true) {
    if (confirmUnsaved && this.hasUnsavedChanges(groupId)) {
      const confirmed = await this.confirm(
        "Close tab group",
        "The current group tab reports unsaved changes. Close the group anyway?",
        "Close group",
      );
      if (!confirmed) return;
    }
    await this.removeGroupRecord(groupId, true);
  }

  async mergeGroups(sourceId, targetId) {
    if (sourceId === targetId) return;
    const source = this.getGroup(sourceId);
    const target = this.getGroup(targetId);
    if (!source || !target) return;
    const sourceLeaf = this.getGroupLeaf(sourceId);
    const targetLeaf = this.getGroupLeaf(targetId);
    if (sourceLeaf?.parent && targetLeaf?.parent && sourceLeaf.parent !== targetLeaf.parent) {
      new Notice("Tab groups can only be merged within the same tab strip.");
      return;
    }
    const confirmed = await this.confirm(
      "Merge tab groups",
      `Merge “${source.name}” into “${target.name}”? The target name will be kept.`,
      "Merge groups",
    );
    if (!confirmed) return;
    target.members = uniqueMembers([...target.members, ...source.members]);
    this.touchGroup(target);
    this.settings.groups = this.settings.groups.filter((group) => group.id !== sourceId);
    this.unbindGroupLeaf(sourceId, true, true);
    this.groupParents.delete(sourceId);
    if (sourceLeaf && sourceLeaf !== targetLeaf) sourceLeaf.detach();
    await this.persist();
    this.refreshUI();
  }

  async moveMemberToGroup(sourceId, targetId, path) {
    if (sourceId === targetId) return;
    const source = this.getGroup(sourceId);
    const target = this.getGroup(targetId);
    if (!source || !target) return;
    const sourceLeaf = this.getGroupLeaf(sourceId);
    const targetLeaf = this.getGroupLeaf(targetId);
    if (sourceLeaf?.parent && targetLeaf?.parent && sourceLeaf.parent !== targetLeaf.parent) {
      new Notice("Group members can only move between groups in the same tab strip.");
      return;
    }
    const member = source.members.find((item) => item.path === path);
    if (!member) return;
    source.members = source.members.filter((item) => item.path !== path);
    if (!target.members.some((item) => item.path === path)) target.members.push(member);
    this.touchGroup(target);
    if (source.members.length === 0) {
      await this.removeGroupRecord(sourceId, true);
    } else {
      if (source.activePath === path) {
        source.activePath = source.members[0].path;
        await this.activateMember(sourceId, source.activePath);
      }
      this.touchGroup(source);
      await this.persist();
      this.refreshUI();
    }
  }

  async detachMemberToTab(groupId, path, targetLeaf) {
    const group = this.getGroup(groupId);
    if (!group || !targetLeaf) return;
    const groupLeaf = this.getGroupLeaf(groupId);
    if (groupLeaf?.parent && targetLeaf.parent !== groupLeaf.parent) {
      new Notice("Group members can only be dragged out within the same tab strip.");
      return;
    }
    const file = this.app.vault.getAbstractFileByPath(path);
    if (!(file instanceof TFile)) return;
    this.app.workspace.setActiveLeaf(targetLeaf, { focus: false });
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(file, { active: true });
    await this.removeMember(groupId, path);
  }

  addGroupMenuItems(menu, group) {
    const historyEntry = this.getHistoryEntryForGroup(group);
    menu.addItem((item) => item.setTitle("Rename group").setIcon("pencil").onClick(() => void this.renameGroup(group.id)));
    menu.addItem((item) => item.setTitle("Expand group").setIcon("unfold-vertical").onClick(() => void this.expandGroup(group.id)));
    menu.addItem((item) => item.setTitle("Export group as markdown").setIcon("file-output").onClick(() => void this.exportGroup(group.id)));
    menu.addItem((item) => item
      .setTitle(historyEntry?.pinned ? "Unpin group" : "Pin group to top")
      .setIcon(historyEntry?.pinned ? "pin-off" : "pin")
      .onClick(() => void this.toggleGroupHistoryPin(group.id)));
    menu.addSeparator();
    menu.addItem((item) => item.setTitle("Close group").setIcon("x").onClick(() => void this.closeGroup(group.id)));
  }

  openGroupMenu(group, event) {
    event.preventDefault();
    event.stopPropagation();
    const menu = new Menu();
    this.addGroupMenuItems(menu, group);
    menu.showAtMouseEvent(event);
  }

  openPopup(group, anchorEl) {
    new GroupPopup(this, group, anchorEl).open();
  }

  togglePopup(group, anchorEl) {
    if (this.activePopup?.group?.id === group.id && this.activePopup.anchorEl === anchorEl) {
      this.closePopup();
      return;
    }
    this.openPopup(group, anchorEl);
  }

  closePopup() {
    this.activePopup?.close();
    this.activePopup = null;
  }

  async exportGroup(groupId) {
    let stage = "starting the export";
    try {
      await this.performExportGroup(groupId, (value) => { stage = value; });
    } catch (error) {
      const message = GroupTabsPlugin.errorMessage(error);
      console.error("Group Tabs export failed", { stage, error });
      new Notice(`Group Tabs export failed while ${stage}: ${message}`, 10000);
    }
  }

  async exportHistoryEntry(entryId) {
    let stage = "starting the export";
    try {
      const entry = this.getHistoryEntry(entryId);
      if (!entry) throw new Error("The saved tab group no longer exists.");
      await this.performExportRecord(entry, this.getGroup(entryId) ? entryId : null, (value) => { stage = value; });
    } catch (error) {
      const message = GroupTabsPlugin.errorMessage(error);
      console.error("Group Tabs history export failed", { stage, error });
      new Notice(`Group Tabs export failed while ${stage}: ${message}`, 10000);
    }
  }

  async performExportGroup(groupId, setStage) {
    const group = this.getGroup(groupId);
    if (!group) throw new Error("The tab group no longer exists.");
    return this.performExportRecord(group, groupId, setStage);
  }

  async performExportRecord(group, liveGroupId, setStage) {
    const markdownMembers = group.members.filter((member) => member.path.toLowerCase().endsWith(".md"));
    const skippedNonMarkdown = group.members.length - markdownMembers.length;
    if (markdownMembers.length === 0) {
      new Notice("This group has no markdown files to export.");
      return;
    }

    setStage("checking group members");
    const entries = [];
    let skippedMissing = 0;
    let estimatedSourceBytes = 0;
    for (const member of markdownMembers) {
      const file = this.app.vault.getAbstractFileByPath(member.path);
      if (!(file instanceof TFile)) {
        skippedMissing += 1;
        continue;
      }
      entries.push({ member, file });
      estimatedSourceBytes += Number.isFinite(file.stat?.size) ? file.stat.size : 0;
    }
    if (entries.length === 0) throw new Error("No available markdown files could be exported.");

    if (estimatedSourceBytes >= LARGE_EXPORT_BYTES || entries.length >= 500) {
      setStage("waiting for large-export confirmation");
      const confirmed = await this.confirm(
        "Export large tab group",
        `Export ${entries.length} markdown files (approximately ${GroupTabsPlugin.formatBytes(estimatedSourceBytes)}). Skip ${skippedNonMarkdown} non-markdown and ${skippedMissing} missing files?`,
        "Export",
      );
      if (!confirmed) return;
    }

    setStage("reading markdown files");
    const progress = new ExportProgressModal(this.app, entries.length);
    progress.open();
    const sources = [];
    try {
      for (let index = 0; index < entries.length; index += 1) {
        const { member, file } = entries[index];
        if (progress.cancelled) {
          new Notice("Group export cancelled.");
          return;
        }
        progress.update(index + 1, member.path);
        try {
          const content = await this.readLiveMarkdown(liveGroupId, member.path, file);
          sources.push({ path: member.path, content });
        } catch (error) {
          skippedMissing += 1;
          console.error(`Group Tabs could not read ${member.path}`, error);
        }
        if (index % 20 === 0) await new Promise((resolve) => window.setTimeout(resolve, 0));
      }
    } finally {
      progress.close();
    }
    if (sources.length === 0) throw new Error("No markdown files could be read for export.");

    setStage("building the markdown document");
    const exportedAt = new Date();
    const output = GroupTabsPlugin.buildExportDocument(group.name, sources, skippedNonMarkdown, skippedMissing, exportedAt);
    const base = `${GroupTabsPlugin.sanitizeExportBase(group.name)}_${GroupTabsPlugin.formatTimestamp(exportedAt)}`;

    if (this.settings.exportDestination === "external") {
      const folder = this.settings.externalExportFolder;
      if (!folder) throw new Error("Choose a computer folder in Group Tabs settings first.");
      setStage(`writing the file to ${folder}`);
      const path = await this.writeExternalExport(folder, base, output);
      new Notice(`Exported ${sources.length} markdown files to ${path}.`, 10000);
      return;
    }

    const folder = this.settings.exportFolder;
    setStage(`creating the vault folder ${folder || "Vault root"}`);
    await this.ensureFolder(folder);
    const path = await this.availableExportPath(folder, base);
    setStage(`writing ${path}`);
    const created = await this.app.vault.create(path, output);
    setStage(`opening ${path}`);
    const leaf = this.app.workspace.getLeaf("tab");
    await leaf.openFile(created, { active: true });
    new Notice(`Exported ${sources.length} markdown files to ${path}.`, 10000);
  }

  async readLiveMarkdown(groupId, path, file) {
    const leaf = groupId ? this.getGroupLeaf(groupId) : null;
    if (leaf && this.getLeafPath(leaf) === path) {
      const view = leaf.view;
      if (view?.editor && typeof view.editor.getValue === "function") return view.editor.getValue();
      if (typeof view?.getViewData === "function") {
        const value = view.getViewData();
        if (typeof value === "string") return value;
      }
    }
    return this.app.vault.cachedRead(file);
  }

  async ensureFolder(folderPath) {
    if (!folderPath) return;
    const parts = folderPath.split("/").filter(Boolean);
    let current = "";
    for (const part of parts) {
      current = current ? `${current}/${part}` : part;
      if (!this.app.vault.getAbstractFileByPath(current)) await this.app.vault.createFolder(current);
    }
  }

  async availableExportPath(folder, base) {
    const prefix = folder ? `${folder}/` : "";
    let index = 1;
    let candidate = `${prefix}${base}.md`;
    while (this.app.vault.getAbstractFileByPath(candidate)) {
      index += 1;
      candidate = `${prefix}${base}-${index}.md`;
    }
    return candidate;
  }

  getElectronDialog() {
    try {
      const electron = require("electron");
      if (electron.dialog) return electron.dialog;
      if (electron.remote?.dialog) return electron.remote.dialog;
    } catch (_) {
      // Try the maintained remote bridge used by some Electron builds.
    }
    try {
      return require("@electron/remote").dialog;
    } catch (_) {
      return null;
    }
  }

  async browseExternalFolder() {
    const dialog = this.getElectronDialog();
    if (!dialog?.showOpenDialog) throw new Error("The desktop folder picker is unavailable in this Obsidian installation.");
    const result = await dialog.showOpenDialog({
      title: "Choose Group Tabs export folder",
      defaultPath: this.settings.externalExportFolder || undefined,
      properties: ["openDirectory", "createDirectory"],
    });
    if (result.canceled || !result.filePaths?.[0]) return null;
    return result.filePaths[0];
  }

  async writeExternalExport(folder, base, output) {
    const fs = require("node:fs/promises");
    const pathModule = require("node:path");
    const stat = await fs.stat(folder);
    if (!stat.isDirectory()) throw new Error("The selected export destination is not a folder.");
    let index = 1;
    while (true) {
      const suffix = index === 1 ? "" : `-${index}`;
      const candidate = pathModule.join(folder, `${base}${suffix}.md`);
      try {
        await fs.writeFile(candidate, output, { encoding: "utf8", flag: "wx" });
        return candidate;
      } catch (error) {
        if (error?.code === "EEXIST") {
          index += 1;
          continue;
        }
        throw error;
      }
    }
  }

  async restoreGroups() {
    if (this.isRestoring) return;
    this.isRestoring = true;
    try {
      const allLeaves = [];
      this.app.workspace.iterateAllLeaves((leaf) => allLeaves.push(leaf));
      const staleIds = new Set();
      for (const group of this.getCurrentWorkspaceGroups()) {
        let host = allLeaves.find((leaf) => this.getLeafGroupMarker(leaf) === group.id) ?? null;
        if (!host && group.leafId) host = allLeaves.find((leaf) => leaf.id === group.leafId) ?? null;
        if (!host) {
          staleIds.add(group.id);
          continue;
        }
        this.bindGroupLeaf(group.id, host);
        await this.stampGroupLeaf(group, host);
      }
      if (staleIds.size > 0) {
        this.settings.groups = this.settings.groups.filter((group) => !staleIds.has(group.id));
        await this.persist();
      }
    } finally {
      this.isRestoring = false;
      this.updateHistoryRibbon();
      this.refreshUI();
    }
  }

  handleLayoutChange() {
    this.updateHistoryRibbon();
    const workspaceId = this.currentWorkspaceId();
    if (this.lastWorkspaceId !== null && workspaceId !== this.lastWorkspaceId) {
      this.cleanupPresentation();
      this.lastWorkspaceId = workspaceId;
      void this.restoreGroups();
      return;
    }
    this.lastWorkspaceId = workspaceId;
    let changed = false;
    for (const [groupId, leaf] of [...this.groupLeaves]) {
      if (this.isLeafInWorkspace(leaf)) continue;
      this.restoreLeafDecoration(leaf);
      this.groupLeaves.delete(groupId);
      this.leafGroups.delete(leaf);
      this.groupParents.delete(groupId);
      if (this.getGroup(groupId)) {
        this.settings.groups = this.settings.groups.filter((group) => group.id !== groupId);
        changed = true;
      }
    }
    if (changed) void this.persist();
    this.scheduleRefresh();
  }

  handleRename(file, oldPath) {
    if (!(file instanceof TFile)) return;
    let changed = false;
    const updateCollection = (collection) => {
      for (const item of collection) {
        for (const member of item.members) {
          if (member.path === oldPath) {
            member.path = file.path;
            member.viewType = file.extension.toLowerCase() === "md" ? "markdown" : member.viewType;
            changed = true;
          }
        }
        if (item.activePath === oldPath) {
          item.activePath = file.path;
          changed = true;
        }
      }
    };
    updateCollection(this.settings.groups);
    updateCollection(this.settings.history);
    if (changed) {
      void this.persist();
      this.refreshHistoryViews();
      this.scheduleRefresh();
    }
  }

  handleDelete(path) {
    let changed = false;
    for (const group of [...this.settings.groups]) {
      const before = group.members.length;
      group.members = group.members.filter((member) => member.path !== path);
      if (group.members.length !== before) changed = true;
      if (group.members.length === 0) {
        void this.removeGroupRecord(group.id, true);
      } else if (group.activePath === path) {
        group.activePath = group.members[0].path;
        void this.activateMember(group.id, group.activePath);
      }
    }
    for (const entry of this.settings.history) {
      const before = entry.members.length;
      entry.members = entry.members.filter((member) => member.path !== path);
      if (entry.members.length !== before) changed = true;
      if (entry.activePath === path) entry.activePath = entry.members[0]?.path ?? "";
    }
    this.settings.history = this.settings.history.filter((entry) => entry.members.length > 0);
    if (changed) {
      new Notice("Group Tabs removed a deleted file from its saved groups.");
      void this.persist();
      this.refreshHistoryViews();
      this.scheduleRefresh();
    }
  }

  scheduleRefresh() {
    if (this.isUnloading) return;
    if (this.draggedLeaf || this.draggedGroupId || this.draggedMember || this.draggedFiles) {
      this.refreshAfterDrag = true;
      return;
    }
    if (this.refreshScheduled) return;
    this.refreshScheduled = true;
    window.requestAnimationFrame(() => {
      this.refreshScheduled = false;
      if (!this.isUnloading) this.refreshUI();
    });
  }

  refreshUI() {
    if (this.isUnloading) return;
    const current = new Set(this.getCurrentWorkspaceGroups().map((group) => group.id));
    for (const [groupId, leaf] of [...this.groupLeaves]) {
      if (!current.has(groupId) || !this.isLeafInWorkspace(leaf)) {
        this.unbindGroupLeaf(groupId, true);
        continue;
      }
      const group = this.getGroup(groupId);
      if (group) this.decorateGroupLeaf(group, leaf);
    }
    for (const doc of this.collectDocuments()) {
      for (const header of doc.querySelectorAll(`.${GROUP_HEADER_CLASS}`)) {
        const groupId = header.dataset.groupId;
        if (!groupId || !current.has(groupId)) {
          header.classList.remove(GROUP_HEADER_CLASS, DROP_TARGET_CLASS);
          delete header.dataset.groupId;
        }
      }
    }
  }

  collectDocuments() {
    const documents = new Set();
    if (typeof document !== "undefined") documents.add(document);
    this.app.workspace.iterateAllLeaves((leaf) => {
      const doc = this.getLeafHeader(leaf)?.ownerDocument;
      if (doc) documents.add(doc);
    });
    return documents;
  }

  cleanupPresentation(clearBindings = true) {
    this.closePopup();
    for (const [groupId] of [...this.groupLeaves]) this.unbindGroupLeaf(groupId, true);
    for (const doc of this.collectDocuments()) {
      for (const header of doc.querySelectorAll(`.${GROUP_HEADER_CLASS}, .${DROP_TARGET_CLASS}`)) {
        header.classList.remove(GROUP_HEADER_CLASS, DROP_TARGET_CLASS);
        delete header.dataset.groupId;
      }
    }
    if (clearBindings) {
      this.groupLeaves.clear();
      this.leafGroups.clear();
      this.groupParents.clear();
    }
  }

  onDragStart(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const navigationFiles = this.getDraggedNavigationFilesFromEvent(event);
    if (this.armDraggedNavigationFiles(navigationFiles, event, true)) return;

    const header = target.closest(".workspace-tab-header");
    if (!header) return;
    const leaf = this.findLeafByHeader(header);
    if (!leaf) return;
    const group = this.getGroupForLeaf(leaf);
    if (group) {
      this.draggedGroupId = group.id;
      this.draggedLeaf = null;
      event.dataTransfer?.setData("application/x-group-tabs-group", group.id);
      return;
    }
    if (!this.isLeafSupported(leaf)) return;
    this.draggedLeaf = leaf;
    this.draggedGroupId = null;
    this.draggedFiles = null;
  }

  claimPluginDragEvent(event, dropEffect = null) {
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation?.();
    if (dropEffect && event.dataTransfer) event.dataTransfer.dropEffect = dropEffect;
  }

  onDragOver(event) {
    if (!this.draggedLeaf && !this.draggedGroupId && !this.draggedMember && !this.draggedFiles) {
      this.armDraggedNavigationFiles(this.getDraggedNavigationFilesFromEvent(event));
    }
    const target = event.target instanceof Element ? event.target : null;
    if (!target || (!this.draggedLeaf && !this.draggedGroupId && !this.draggedMember && !this.draggedFiles)) return;
    const header = target.closest(".workspace-tab-header");
    const targetLeaf = header ? this.findLeafByHeader(header) : null;
    const targetGroup = targetLeaf ? this.getGroupForLeaf(targetLeaf) : null;

    if (this.draggedFiles) {
      if (!targetLeaf || (!targetGroup && !this.isLeafSupported(targetLeaf))) {
        this.clearHoverTarget();
        return;
      }
      this.claimPluginDragEvent(event, "copy");
      this.clearHoverTarget();
      this.dragHoverTarget = header;
      header.classList.add(DROP_TARGET_CLASS);
      this.dragArmed = true;
      return;
    }

    if (this.draggedMember) {
      if (target.closest(".group-tabs-popup-row")) return;
      const sourceLeaf = this.getGroupLeaf(this.draggedMember.groupId);
      const valid = targetLeaf && (!sourceLeaf?.parent || targetLeaf.parent === sourceLeaf.parent);
      if (!valid) {
        this.clearHoverTarget();
        return;
      }
      this.claimPluginDragEvent(event);
      this.clearHoverTarget();
      this.dragHoverTarget = header;
      header.classList.add(DROP_TARGET_CLASS);
      this.dragArmed = true;
      return;
    }

    if (!targetLeaf) {
      this.clearHoverTarget();
      return;
    }
    if (this.draggedGroupId) {
      const sourceLeaf = this.getGroupLeaf(this.draggedGroupId);
      if (!targetGroup || targetGroup.id === this.draggedGroupId || (sourceLeaf?.parent && targetLeaf.parent !== sourceLeaf.parent)) {
        this.clearHoverTarget();
        return;
      }
      this.claimPluginDragEvent(event);
      this.clearHoverTarget();
      this.dragHoverTarget = header;
      header.classList.add(DROP_TARGET_CLASS);
      this.dragArmed = true;
      return;
    }
    if (this.draggedLeaf) {
      if (targetLeaf === this.draggedLeaf || targetLeaf.parent !== this.draggedLeaf.parent || (!targetGroup && !this.isLeafSupported(targetLeaf))) {
        this.clearHoverTarget();
        return;
      }
      if (targetGroup) {
        this.claimPluginDragEvent(event);
        this.clearHoverTarget();
        this.dragHoverTarget = header;
        header.classList.add(DROP_TARGET_CLASS);
        this.dragArmed = true;
      } else {
        this.armHoverTarget(header);
        if (this.dragArmed) this.claimPluginDragEvent(event);
      }
    }
  }

  onDragLeave(event) {
    const related = event.relatedTarget instanceof Node ? event.relatedTarget : null;
    if (this.dragHoverTarget && related && this.dragHoverTarget.contains(related)) return;
    this.clearHoverTarget();
  }

  async onDrop(event) {
    if (!this.draggedLeaf && !this.draggedGroupId && !this.draggedMember && !this.draggedFiles) {
      this.armDraggedNavigationFiles(this.getDraggedNavigationFilesFromEvent(event));
    }
    const target = event.target instanceof Element ? event.target : null;
    if (this.draggedMember && target?.closest(".group-tabs-popup-row")) return;
    if (!target) {
      this.clearDragState();
      return;
    }
    const header = target.closest(".workspace-tab-header");
    const targetLeaf = header ? this.findLeafByHeader(header) : null;
    const targetGroup = targetLeaf ? this.getGroupForLeaf(targetLeaf) : null;
    const fileDrop = Boolean(this.draggedFiles?.length);
    if (fileDrop) {
      if (!targetLeaf || (!targetGroup && !this.isLeafSupported(targetLeaf))) {
        this.clearDragState();
        return;
      }
    } else if (!this.dragArmed) {
      this.clearDragState();
      return;
    }
    this.claimPluginDragEvent(event, fileDrop ? "copy" : null);

    if (this.draggedFiles && targetLeaf) {
      const files = this.draggedFiles;
      this.clearDragState();
      if (targetGroup) {
        await this.addFilesToGroup(targetGroup, files);
      } else if (this.isLeafSupported(targetLeaf)) {
        const paths = [this.getLeafPath(targetLeaf), ...files.map((file) => file.path)].filter(Boolean);
        const suggested = GroupTabsPlugin.commonParentName(paths);
        this.promptName("Name tab group", suggested, (name) => void this.createGroupFromLeafAndFiles(name, targetLeaf, files));
      }
      return;
    }

    if (this.draggedMember && targetLeaf) {
      const member = this.draggedMember;
      this.clearDragState();
      if (targetGroup) await this.moveMemberToGroup(member.groupId, targetGroup.id, member.path);
      else await this.detachMemberToTab(member.groupId, member.path, targetLeaf);
      return;
    }

    if (this.draggedGroupId && targetGroup) {
      const sourceId = this.draggedGroupId;
      this.clearDragState();
      await this.mergeGroups(sourceId, targetGroup.id);
      return;
    }

    if (this.draggedLeaf && targetLeaf) {
      const sourceLeaf = this.draggedLeaf;
      this.clearDragState();
      if (sourceLeaf === targetLeaf) return;
      if (targetGroup) {
        await this.addLeafToGroup(targetGroup, sourceLeaf);
      } else {
        const paths = [this.getLeafPath(targetLeaf), this.getLeafPath(sourceLeaf)].filter(Boolean);
        const suggested = GroupTabsPlugin.commonParentName(paths);
        this.promptName("Name tab group", suggested, (name) => void this.createGroupFromLeaves(name, [targetLeaf, sourceLeaf], targetLeaf));
      }
    }
  }

  async addFilesToGroup(group, files) {
    const supported = [];
    const seen = new Set(group.members.map((member) => member.path));
    let duplicates = 0;
    let skipped = 0;
    for (const file of files) {
      if (!this.isSupportedFile(file)) {
        skipped += 1;
        continue;
      }
      if (seen.has(file.path)) {
        duplicates += 1;
        continue;
      }
      seen.add(file.path);
      supported.push(file);
      group.members.push({ path: file.path, viewType: file.extension.toLowerCase() === "md" ? "markdown" : "file" });
    }
    const host = this.getGroupLeaf(group.id);
    if (host) {
      const added = new Set(supported.map((file) => file.path));
      this.detachOrdinaryLeavesByPaths(added, [host]);
    }
    if (supported.length > 0) this.touchGroup(group);
    await this.persist();
    this.refreshUI();
    const parts = [`Added ${supported.length} file${supported.length === 1 ? "" : "s"} to ${group.name}.`];
    if (skipped) parts.push(`Skipped ${skipped} unsupported.`);
    if (duplicates) parts.push(`Ignored ${duplicates} duplicate${duplicates === 1 ? "" : "s"}.`);
    new Notice(parts.join(" "));
  }

  async addLeafToGroup(group, leaf) {
    const path = this.getLeafPath(leaf);
    if (!path || !this.isLeafSupported(leaf)) return;
    const host = this.getGroupLeaf(group.id);
    if (host?.parent && leaf.parent !== host.parent) {
      new Notice("Tabs can only be added to a group in the same tab strip.");
      return;
    }
    if (!group.members.some((member) => member.path === path)) group.members.push({ path, viewType: this.getLeafViewType(leaf) });
    this.touchGroup(group);
    if (leaf !== host) leaf.detach();
    await this.persist();
    this.clearNativeDragPresentation();
    this.refreshUI();
  }

  isLeafSupported(leaf) {
    const path = this.getLeafPath(leaf);
    return Boolean(path && this.isSupportedFile(this.app.vault.getAbstractFileByPath(path)));
  }

  armHoverTarget(target) {
    if (this.dragHoverTarget === target) return;
    this.clearHoverTarget();
    this.dragHoverTarget = target;
    target.classList.add(DROP_TARGET_CLASS);
    this.dragHoverTimer = window.setTimeout(() => { this.dragArmed = true; }, DRAG_HOVER_MS);
  }

  clearHoverTarget() {
    if (this.dragHoverTimer) window.clearTimeout(this.dragHoverTimer);
    this.dragHoverTimer = null;
    this.dragArmed = false;
    this.dragHoverTarget?.classList.remove(DROP_TARGET_CLASS);
    this.dragHoverTarget = null;
  }

  clearNativeDragPresentation() {
    const clear = () => {
      for (const doc of this.collectDocuments()) {
        for (const element of doc.querySelectorAll(`.${DROP_TARGET_CLASS}`)) element.classList.remove(DROP_TARGET_CLASS);
        for (const element of doc.querySelectorAll(
          ".workspace-tab-header.is-being-dragged, .workspace-tab-header.is-dragging, "
          + ".workspace-tab-header-container.is-dragging, .workspace-tab-header-container-inner.is-dragging, "
          + ".workspace-tabs.is-dragging",
        )) element.classList.remove("is-being-dragged", "is-dragging");
        for (const artifact of doc.querySelectorAll(
          ".workspace-tab-header-drag-ghost, .workspace-tab-header-drop-indicator, "
          + ".workspace-tab-header-drop-indicator-before, .workspace-tab-header-drop-indicator-after",
        )) artifact.remove();
        for (const element of doc.querySelectorAll("[data-drop-target], [data-drag-target]")) {
          element.removeAttribute("data-drop-target");
          element.removeAttribute("data-drag-target");
        }
      }
    };
    clear();
    window.requestAnimationFrame?.(() => clear());
    window.setTimeout?.(() => clear(), 100);
  }

  clearDragState() {
    const refresh = this.refreshAfterDrag;
    this.refreshAfterDrag = false;
    this.clearHoverTarget();
    this.draggedLeaf = null;
    this.draggedGroupId = null;
    this.draggedMember = null;
    this.draggedFiles = null;
    this.pendingNavigationDragFiles = null;
    this.clearNativeDragPresentation();
    if (refresh) this.scheduleRefresh();
  }
}

class GroupTabsSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.replaceChildren();
    containerEl.createEl("h2", { text: "Group Tabs" });

    new Setting(containerEl)
      .setName("Allow only markdown files in groups (if disabled, export only includes markdown files)")
      .setDesc("Enabled by default. Disable to group other file types that Obsidian can open.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.allowOnlyMarkdown)
        .onChange(async (value) => {
          this.plugin.settings.allowOnlyMarkdown = value;
          await this.plugin.persist();
        }));

    new Setting(containerEl)
      .setName("Show history")
      .setDesc("Show the Recent tab groups ribbon icon and save recently changed groups.")
      .addToggle((toggle) => toggle
        .setValue(this.plugin.settings.showHistory)
        .onChange(async (value) => {
          this.plugin.settings.showHistory = value;
          this.plugin.updateHistoryRibbon();
          this.plugin.refreshHistoryViews();
          await this.plugin.persist();
          this.display();
        }));

    if (this.plugin.settings.showHistory) {
      new Setting(containerEl)
        .setName("History limit")
        .setDesc("Number of recent tab groups to keep, from 0 to 100.")
        .addSlider((slider) => slider
          .setLimits(0, 100, 1)
          .setDynamicTooltip()
          .setValue(this.plugin.settings.historyLimit)
          .onChange(async (value) => {
            this.plugin.settings.historyLimit = value;
            this.plugin.pruneHistory();
            await this.plugin.persist();
          }));
      new Setting(containerEl)
        .setName("Clear history")
        .setDesc("Remove all unpinned recent tab groups. Pinned groups are preserved.")
        .addButton((button) => button
          .setButtonText("Clear")
          .setWarning()
          .onClick(async () => {
            await this.plugin.clearUnpinnedHistory();
          }));
    }

    new Setting(containerEl)
      .setName("Export destination")
      .setDesc("Choose a folder inside the vault or anywhere on this computer.")
      .addDropdown((dropdown) => dropdown
        .addOption("vault", "Folder inside this vault")
        .addOption("external", "Folder on this computer")
        .setValue(this.plugin.settings.exportDestination)
        .onChange(async (value) => {
          this.plugin.settings.exportDestination = value === "external" ? "external" : "vault";
          await this.plugin.persist();
          this.display();
        }));

    if (this.plugin.settings.exportDestination === "external") {
      new Setting(containerEl)
        .setName("Computer export folder")
        .setDesc("External exports stay outside the vault and are not opened as Obsidian notes.")
        .addText((text) => text
          .setPlaceholder("Choose a folder")
          .setValue(this.plugin.settings.externalExportFolder)
          .onChange(async (value) => {
            this.plugin.settings.externalExportFolder = value.trim();
            await this.plugin.persist();
          }))
        .addButton((button) => button
          .setButtonText("Browse…")
          .onClick(async () => {
            try {
              const folder = await this.plugin.browseExternalFolder();
              if (!folder) return;
              this.plugin.settings.externalExportFolder = folder;
              await this.plugin.persist();
              this.display();
            } catch (error) {
              new Notice(`Could not browse for a folder: ${GroupTabsPlugin.errorMessage(error)}`, 10000);
            }
          }));
    } else {
      new Setting(containerEl)
        .setName("Vault export folder")
        .setDesc("Leave empty to export to the vault root.")
        .addText((text) => text
          .setPlaceholder(DEFAULT_EXPORT_FOLDER)
          .setValue(this.plugin.settings.exportFolder)
          .onChange(async (value) => {
            this.plugin.settings.exportFolder = value.trim().replace(/^\/+|\/+$/g, "");
            await this.plugin.persist();
          }))
        .addButton((button) => button
          .setButtonText("Browse…")
          .onClick(() => {
            new VaultFolderPickerModal(this.app, async (folder) => {
              this.plugin.settings.exportFolder = folder;
              await this.plugin.persist();
              this.display();
            }).open();
          }));
    }
  }
}

module.exports = GroupTabsPlugin;
module.exports.EmptyGroupView = EmptyGroupView;
module.exports.VERSION = VERSION;

/* nosourcemap */