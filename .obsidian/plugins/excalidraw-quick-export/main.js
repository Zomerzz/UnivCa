/*
 * Excalidraw Quick Export
 * Right-click an Excalidraw drawing (or use the command palette while it is open) and export the WHOLE canvas as:
 *   - PDF : the whole canvas (no selection), full width on every page, cut top-to-bottom into A4-ratio pages
 *   - HTML: a standalone page with the drawing inlined as SVG (opens in any browser, zoomable, no Obsidian needed)
 *   - SVG : the vector image itself
 * SVG and HTML are saved next to the drawing; PDF asks where to save (defaults to the same folder).
 * Rendering is done by the Excalidraw plugin's own API (ExcalidrawAutomate.createSVG / createPDF), so the export looks
 * exactly like Excalidraw's own exports (fonts, LaTeX, embedded images).
 */
const { Plugin, Notice, TFile, normalizePath, PluginSettingTab, Setting, requestUrl } = require("obsidian");

/*
 * Handwriting -> LaTeX (SimpleTex)
 * Select a handwritten formula in an open drawing and run "Convert selected handwriting to LaTeX": the selection is
 * rendered black-on-white, sent to SimpleTex's formula OCR, and a typed LaTeX formula is placed where the handwriting
 * was, scaled to the same height. The handwriting is kept (invisible and locked) under the formula; "Restore
 * handwriting" on a selected formula brings it back and removes the formula.
 * The SimpleTex token lives in this plugin's data.json, which is git-ignored so obsidian-git never pushes it.
 */
const OCR_ENDPOINTS = {
  standard: "https://server.simpletex.cn/api/latex_ocr",
  turbo: "https://server.simpletex.cn/api/latex_ocr_turbo",
};
const DEFAULT_SETTINGS = { simpletexToken: "", ocrModel: "standard" };

const EXCALIDRAW_ID = "obsidian-excalidraw-plugin";
const FORMATS = [
  { fmt: "pdf", label: "PDF (whole canvas, pages top to bottom)", icon: "file-text" },
  { fmt: "html", label: "HTML (standalone page)", icon: "globe" },
  { fmt: "svg", label: "SVG", icon: "image" },
];
// Chromium cannot print a PDF page larger than ~200 inches; bigger drawings are scaled down to fit one page
const MAX_PAGE_PX = 14000;

module.exports = class ExcalidrawQuickExport extends Plugin {
  async onload() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
    this.addSettingTab(new QuickExportSettings(this.app, this));

    this.addCommand({
      id: "handwriting-to-latex",
      name: "Convert selected handwriting to LaTeX",
      checkCallback: (checking) => {
        if (!this.activeDrawingView()) return false;
        if (!checking) this.convertSelection();
        return true;
      },
    });
    this.addCommand({
      id: "restore-handwriting",
      name: "Restore handwriting of the selected LaTeX formula",
      checkCallback: (checking) => {
        if (!this.activeDrawingView()) return false;
        if (!checking) this.restoreSelection();
        return true;
      },
    });

    for (const { fmt, label } of FORMATS) {
      this.addCommand({
        id: `export-${fmt}`,
        name: `Export current drawing as ${label}`,
        checkCallback: (checking) => {
          const file = this.app.workspace.getActiveFile();
          if (!file || !this.isDrawing(file)) return false;
          if (!checking) this.exportFile(file, fmt);
          return true;
        },
      });
    }

    this.registerEvent(
      this.app.workspace.on("file-menu", (menu, file) => {
        if (!(file instanceof TFile) || !this.isDrawing(file)) return;
        menu.addSeparator();
        for (const { fmt, label, icon } of FORMATS) {
          menu.addItem((item) =>
            item.setTitle(`Export as ${label}`).setIcon(icon).onClick(() => this.exportFile(file, fmt))
          );
        }
      })
    );
  }

  excalidraw() {
    return this.app.plugins.plugins[EXCALIDRAW_ID] || null;
  }

  activeDrawingView() {
    const view = this.app.workspace.activeLeaf && this.app.workspace.activeLeaf.view;
    return view && view.getViewType && view.getViewType() === "excalidraw" ? view : null;
  }

  // ---------- handwriting -> LaTeX ----------

  activeEA() {
    const ea = this.api();
    ea.reset();
    ea.setView("active");
    return ea;
  }

  async convertSelection() {
    if (!this.settings.simpletexToken) {
      new Notice("Add your SimpleTex token first: Settings → Excalidraw Quick Export.", 8000);
      return;
    }
    const ea = this.activeEA();
    const sel = ea.getViewSelectedElements().filter((e) => !e.isDeleted && e.type !== "image");
    if (!sel.length) {
      new Notice("Select the handwritten formula first (lasso or drag a box around it).");
      return;
    }
    const notice = new Notice("Reading the handwriting…", 0);
    try {
      const png = await this.renderForOCR(sel);
      const latex = await this.simpletex(png);
      if (!latex) throw new Error("SimpleTex found no formula in the selection");
      await this.placeFormula(sel, latex);
      new Notice(`LaTeX: ${latex}`, 6000);
    } catch (e) {
      console.error("[excalidraw-quick-export] OCR", e);
      new Notice(`Conversion failed: ${e && e.message ? e.message : e}`, 8000);
    } finally {
      notice.hide();
    }
  }

  async renderForOCR(sel) {
    // a copy of the selection, every stroke black, on white: coloured ink and dark theme confuse the OCR
    const r = this.activeEA();
    r.copyViewElementsToEAforEditing(sel);
    for (const el of r.getElements()) {
      el.strokeColor = "#000000";
      el.backgroundColor = "transparent";
      el.opacity = 100;
    }
    r.canvas.viewBackgroundColor = "#FFFFFF";
    let png = await r.createPNG(undefined, 2, { withBackground: true, withTheme: false, isMask: false }, undefined, "light", 16);
    if (typeof png === "string") png = await (await fetch(png)).blob();
    if (!png || !png.arrayBuffer) throw new Error("could not render the selection");
    return new Uint8Array(await png.arrayBuffer());
  }

  async simpletex(pngBytes) {
    const boundary = "----zqe" + Date.now().toString(16);
    const enc = new TextEncoder();
    const head = enc.encode(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="formula.png"\r\nContent-Type: image/png\r\n\r\n`
    );
    const tail = enc.encode(`\r\n--${boundary}--\r\n`);
    const body = new Uint8Array(head.length + pngBytes.length + tail.length);
    body.set(head, 0);
    body.set(pngBytes, head.length);
    body.set(tail, head.length + pngBytes.length);
    const res = await requestUrl({
      url: OCR_ENDPOINTS[this.settings.ocrModel] || OCR_ENDPOINTS.standard,
      method: "POST",
      headers: { token: this.settings.simpletexToken, "Content-Type": `multipart/form-data; boundary=${boundary}` },
      body: body.buffer,
      throw: false,
    });
    let json = null;
    try {
      json = res.json;
    } catch (e) {
      /* not JSON */
    }
    if (res.status !== 200 || !json || json.status === false) {
      const why = json && (json.err_info?.err_msg || json.message || json.msg || JSON.stringify(json).slice(0, 160));
      throw new Error(`SimpleTex ${res.status}${why ? ": " + why : ""}`);
    }
    const latex = json.res?.latex ?? json.res?.info ?? json.latex ?? "";
    return String(latex).trim().replace(/^\$\$?|\$\$?$/g, "").trim();
  }

  async placeFormula(sel, latex) {
    const ea = this.activeEA();
    const bb = ea.getBoundingBox(sel);
    const id = await ea.addLaTex(bb.topX, bb.topY, latex);
    if (!id) throw new Error("Excalidraw could not render this LaTeX: " + latex);
    const el = ea.getElement(id);
    const f = Math.min(4, Math.max(0.25, bb.height / (el.height || bb.height)));
    el.width *= f;
    el.height *= f;
    el.customData = Object.assign({}, el.customData, { zHandwriting: sel.map((e) => e.id) });
    await ea.addElementsToView(false, true, true);

    // keep the handwriting, invisible and locked, so "Restore handwriting" can bring it back
    const hide = this.activeEA();
    hide.copyViewElementsToEAforEditing(sel);
    for (const h of hide.getElements()) {
      h.opacity = 0;
      h.locked = true;
      h.customData = Object.assign({}, h.customData, { zHiddenBy: id });
    }
    await hide.addElementsToView(false, true);
    ea.selectElementsInView([id]);
  }

  async restoreSelection() {
    const ea = this.activeEA();
    const formulas = ea.getViewSelectedElements().filter((e) => e.customData && e.customData.zHandwriting);
    if (!formulas.length) {
      new Notice("Select a formula made by “Convert selected handwriting to LaTeX”.");
      return;
    }
    const ids = new Set(formulas.map((f) => f.id));
    const hidden = ea.getViewElements().filter((e) => e.customData && ids.has(e.customData.zHiddenBy));
    const fix = this.activeEA();
    fix.copyViewElementsToEAforEditing(hidden);
    for (const h of fix.getElements()) {
      h.opacity = 100;
      h.locked = false;
      if (h.customData) delete h.customData.zHiddenBy;
    }
    await fix.addElementsToView(false, true);
    ea.deleteViewElements(formulas);
    new Notice(`Handwriting restored (${hidden.length} strokes).`);
  }

  isDrawing(file) {
    const ex = this.excalidraw();
    if (!ex) return false;
    try {
      return typeof ex.isExcalidrawFile === "function" ? ex.isExcalidrawFile(file) : file.path.endsWith(".excalidraw.md");
    } catch (e) {
      return file.path.endsWith(".excalidraw.md") || file.extension === "excalidraw";
    }
  }

  api() {
    const ea = window.ExcalidrawAutomate;
    if (ea && typeof ea.getAPI === "function") return ea.getAPI();
    const ex = this.excalidraw();
    if (ex && ex.ea && typeof ex.ea.getAPI === "function") return ex.ea.getAPI();
    throw new Error("Excalidraw plugin is not enabled");
  }

  baseName(file) {
    // "lesson.excalidraw.md" -> "lesson"
    return file.name.replace(/\.excalidraw\.md$/i, "").replace(/\.(excalidraw|md)$/i, "");
  }

  outPath(file, ext) {
    const dir = file.parent && file.parent.path !== "/" ? file.parent.path + "/" : "";
    return normalizePath(`${dir}${this.baseName(file)}.${ext}`);
  }

  async renderSVG(file) {
    const ea = this.api();
    ea.reset();
    // whole scene of the file (not the selection), light theme, white background, fonts embedded
    const svg = await ea.createSVG(file.path, true, { withBackground: true, withTheme: false }, undefined, "light", 20);
    if (!svg) throw new Error("Excalidraw returned no image");
    if (!svg.getAttribute("xmlns")) svg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    return { ea, svg };
  }

  async exportFile(file, fmt) {
    const notice = new Notice(`Exporting ${this.baseName(file)} as ${fmt.toUpperCase()}…`, 0);
    try {
      const { ea, svg } = await this.renderSVG(file);
      if (fmt === "svg") {
        const path = this.outPath(file, "svg");
        await this.app.vault.adapter.write(path, new XMLSerializer().serializeToString(svg));
        new Notice(`Saved ${path}`);
      } else if (fmt === "html") {
        const path = this.outPath(file, "html");
        await this.app.vault.adapter.write(path, this.html(this.baseName(file), svg));
        new Notice(`Saved ${path}`);
      } else {
        await this.pdf(ea, file, svg);
      }
    } catch (e) {
      console.error("[excalidraw-quick-export]", e);
      new Notice(`Export failed: ${e && e.message ? e.message : e}`, 8000);
    } finally {
      notice.hide();
    }
  }

  async pdf(ea, file, svg) {
    if (typeof ea.createPDF !== "function") throw new Error("this Excalidraw version has no PDF export (update Excalidraw)");
    const w = parseFloat(svg.getAttribute("width")) || 1000;
    const h = parseFloat(svg.getAttribute("height")) || 1000;
    // full width on every page (scaled down only if wider than a PDF page can be); tall drawings are cut
    // into pages stacked vertically, each with the A4 portrait ratio (height = width x 1.414)
    const s = Math.min(1, MAX_PAGE_PX / w);
    const pageW = Math.ceil(w * s);
    const pageH = Math.min(MAX_PAGE_PX, Math.ceil(pageW * 1.414));
    const pages = Math.ceil((h * s) / pageH);
    const base = this.app.vault.adapter.getBasePath ? this.app.vault.adapter.getBasePath() : "";
    const filename = base ? `${base}/${this.outPath(file, "pdf")}`.replace(/\//g, require("path").sep) : this.outPath(file, "pdf");
    new Notice(`PDF: ${pages} page${pages === 1 ? "" : "s"}, split top to bottom`);
    await ea.createPDF({
      SVG: [svg],
      // fixed zoom (no fit-to-page): one column, as many rows (pages) as the height needs, no margins
      scale: { fitToPage: 0, zoom: s },
      pageProps: {
        dimensions: { width: pageW, height: pageH },
        margin: { left: 0, right: 0, top: 0, bottom: 0 },
        // top-left: the drawing starts at the top of page 1 (centre would pad the first page with white)
        alignment: "top-left",
        backgroundColor: "#ffffff",
      },
      filename,
    });
  }

  html(title, svg) {
    const clone = svg.cloneNode(true);
    const w = clone.getAttribute("width");
    const h = clone.getAttribute("height");
    if (!clone.getAttribute("viewBox") && w && h) clone.setAttribute("viewBox", `0 0 ${parseFloat(w)} ${parseFloat(h)}`);
    clone.removeAttribute("width");
    clone.removeAttribute("height");
    const esc = (t) => t.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
    return `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<style>
  html, body { margin: 0; background: #ffffff; }
  main { max-width: ${parseFloat(w) || 1600}px; margin: 0 auto; padding: 16px; box-sizing: border-box; }
  svg { width: 100%; height: auto; display: block; }
</style>
</head>
<body>
<main>
${new XMLSerializer().serializeToString(clone)}
</main>
</body>
</html>
`;
  }
};

class QuickExportSettings extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display() {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.createEl("h3", { text: "Handwriting → LaTeX (SimpleTex)" });
    containerEl.createEl("p", {
      text: "Get a free token at simpletex.cn → user centre → API / UAT token. It is stored only in this vault's plugin data (git-ignored).",
    });
    new Setting(containerEl)
      .setName("SimpleTex token")
      .setDesc("Used to read handwritten formulas.")
      .addText((t) => {
        t.inputEl.type = "password";
        t.setPlaceholder("paste your token")
          .setValue(this.plugin.settings.simpletexToken)
          .onChange(async (v) => {
            this.plugin.settings.simpletexToken = v.trim();
            await this.plugin.saveData(this.plugin.settings);
          });
      });
    new Setting(containerEl)
      .setName("Recognition model")
      .setDesc("Standard is more accurate on handwriting; Turbo is faster.")
      .addDropdown((d) =>
        d
          .addOption("standard", "Standard")
          .addOption("turbo", "Turbo")
          .setValue(this.plugin.settings.ocrModel)
          .onChange(async (v) => {
            this.plugin.settings.ocrModel = v;
            await this.plugin.saveData(this.plugin.settings);
          })
      );
  }
}
