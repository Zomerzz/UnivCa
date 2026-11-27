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
 * Handwriting -> LaTeX (Google Gemini, free tier)
 * Select a handwritten formula in an open drawing and run "Convert selected handwriting to LaTeX": the selection is
 * rendered black-on-white, sent to Gemini with a "return only LaTeX" prompt, and a typed LaTeX formula is placed where
 * the handwriting was, scaled to the same height. The handwriting is kept (invisible and locked) under the formula;
 * "Restore handwriting" on a selected formula brings it back and removes the formula.
 * The Gemini key lives in this plugin's data.json, which is git-ignored so obsidian-git never pushes it.
 */
const GEMINI_URL = (model) => `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
const OCR_PROMPT =
  "Transcribe the handwritten mathematics in this image into LaTeX. Return ONLY the LaTeX source: no $ or \\[ delimiters, " +
  "no markdown code fences, no explanation. Keep exactly what is written (do not solve or simplify). If there are " +
  "several lines, put them in \\begin{aligned} ... \\end{aligned} separated by \\\\. Italian words stay as \\text{...}.";
const DEFAULT_SETTINGS = { geminiKey: "", geminiModel: "gemini-flash-latest" };
const FALLBACK_MODEL = "gemini-flash-lite-latest";
const STABLE_MODEL = "gemini-2.5-flash";

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
    if (!this.settings.geminiKey) {
      new Notice("Add your Gemini API key first: Settings → Excalidraw Quick Export.", 8000);
      return;
    }
    const ea = this.activeEA();
    const sel = ea.getViewSelectedElements().filter((e) => !e.isDeleted && e.type !== "image");
    if (!sel.length) {
      new Notice("Select the handwritten formula first (lasso or drag a box around it).");
      return;
    }
    const notice = new Notice("1/3 Rendering the selection…", 0);
    const step = (t) => notice.setMessage(t);
    const timeout = (p, s, what) =>
      Promise.race([p, new Promise((_, rej) => setTimeout(() => rej(new Error(`${what} took more than ${s} s`)), s * 1000))]);
    try {
      const png = await timeout(this.renderForOCR(sel), 25, "rendering the selection");
      console.log("[excalidraw-quick-export] PNG bytes", png.length);
      step("2/3 Asking Gemini…");
      const latex = await timeout(this.gemini(png, step), 330, "Gemini");
      console.log("[excalidraw-quick-export] LaTeX", latex);
      if (!latex) throw new Error("Gemini found no formula in the selection");
      step("3/3 Placing the formula…");
      await timeout(this.placeFormula(sel, latex), 25, "placing the formula");
      new Notice(`LaTeX: ${latex}`, 6000);
    } catch (e) {
      console.error("[excalidraw-quick-export] OCR", e);
      await this.log(`convert failed: ${e && e.message ? e.message : e}`);
      new Notice(`Conversion failed: ${e && e.message ? e.message : e}`, 20000);
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
    // vector first (the same path the SVG export uses), then rasterised here: white background, 2x, max 2000 px
    const svg = await r.createSVG(undefined, false, { withBackground: true, withTheme: false }, undefined, "light", 16);
    if (!svg) throw new Error("could not render the selection");
    const w = parseFloat(svg.getAttribute("width")) || 800;
    const h = parseFloat(svg.getAttribute("height")) || 200;
    const scale = Math.min(2, 2000 / Math.max(w, h));
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(svg)], { type: "image/svg+xml" }));
    try {
      const img = await new Promise((ok, ko) => {
        const i = new Image();
        i.onload = () => ok(i);
        i.onerror = () => ko(new Error("could not rasterise the selection"));
        i.src = url;
      });
      const c = document.createElement("canvas");
      c.width = Math.ceil(w * scale);
      c.height = Math.ceil(h * scale);
      const ctx = c.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, c.width, c.height);
      ctx.drawImage(img, 0, 0, c.width, c.height);
      const blob = await new Promise((ok) => c.toBlob(ok, "image/png"));
      if (!blob) throw new Error("could not encode the selection");
      return new Uint8Array(await blob.arrayBuffer());
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  // debug log next to the plugin (status codes and errors only, never the key); git-ignored
  async log(line) {
    try {
      const p = `${this.manifest.dir}/debug.log`;
      const a = this.app.vault.adapter;
      const old = (await a.exists(p)) ? await a.read(p) : "";
      await a.write(p, (old + `${new Date().toISOString()} ${line}\n`).slice(-20000));
    } catch (e) {
      /* logging must never break the command */
    }
  }

  async gemini(pngBytes, onRetry) {
    let bin = "";
    for (let i = 0; i < pngBytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, pngBytes.subarray(i, i + 0x8000));
    const contents = [{ parts: [{ text: OCR_PROMPT }, { inline_data: { mime_type: "image/png", data: btoa(bin) } }] }];
    // transcription needs no "thinking": off = answers in seconds instead of minutes. A model that rejects the
    // option (400) is asked again without it, and remembered for the rest of this run.
    const thinkingRejected = new Set();
    const makeBody = (model) =>
      JSON.stringify({
        contents,
        generationConfig: Object.assign(
          { temperature: 0 },
          thinkingRejected.has(model) ? {} : { thinkingConfig: { thinkingBudget: 0 } }
        ),
      });
    const PER_TRY_S = 35;
    // Google's free tier answers 503 ("high demand") / 429 / hangs in spikes: retry with backoff, then other models.
    // A model that doesn't exist (404) or refuses the request (400) is skipped, not fatal.
    const main = this.settings.geminiModel || DEFAULT_SETTINGS.geminiModel;
    const attempts = [
      [main, 0],
      [main, 3],
      [FALLBACK_MODEL, 0],
      [STABLE_MODEL, 0],
      [main, 8],
      [FALLBACK_MODEL, 5],
      [STABLE_MODEL, 5],
    ];
    const skip = new Set();
    let res = null;
    let json = null;
    for (const [model, wait] of attempts) {
      if (skip.has(model)) continue;
      if (wait) {
        if (onRetry) onRetry(`Gemini busy, retrying in ${wait} s (${model})…`);
        await new Promise((r) => setTimeout(r, wait * 1000));
      }
      const t0 = Date.now();
      const call = () =>
        Promise.race([
          requestUrl({
            url: GEMINI_URL(model),
            method: "POST",
            // key in a header, never in the URL
            headers: { "x-goog-api-key": this.settings.geminiKey, "Content-Type": "application/json" },
            body: makeBody(model),
            throw: false,
          }),
          // a request that hangs counts as "busy": give up on it and go to the next attempt
          new Promise((r) => setTimeout(() => r({ status: 504, text: `no answer in ${PER_TRY_S} s`, json: null }), PER_TRY_S * 1000)),
        ]);
      res = await call();
      if (res.status === 400 && !thinkingRejected.has(model)) {
        thinkingRejected.add(model);
        res = await call();
      }
      json = null;
      try {
        json = res.json;
      } catch (e) {
        /* not JSON */
      }
      await this.log(
        `gemini ${model} png=${pngBytes.length}B: status=${res.status} in ${Date.now() - t0} ms body=${String(res.text || "")
          .slice(0, 400)
          .replace(/\s+/g, " ")}`
      );
      if (res.status === 200 && json) break;
      if ([401, 403].includes(res.status)) break; // bad key: no model will work
      if ([400, 404].includes(res.status)) skip.add(model); // this model can't do it: try the others
    }
    if (res.status !== 200 || !json) {
      const why = json && json.error ? json.error.message : "";
      throw new Error(`Gemini ${res.status}${why ? ": " + why.slice(0, 200) : ""}`);
    }
    const parts = (json.candidates && json.candidates[0] && json.candidates[0].content && json.candidates[0].content.parts) || [];
    let latex = parts.map((p) => p.text || "").join("").trim();
    latex = latex.replace(/^```[a-z]*\s*|\s*```$/gi, "").trim(); // stray code fences
    latex = latex.replace(/^\\\[|\\\]$/g, "").replace(/^\$\$?|\$\$?$/g, "").trim(); // stray delimiters
    return latex;
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
    containerEl.createEl("h3", { text: "Handwriting → LaTeX (Google Gemini)" });
    containerEl.createEl("p", {
      text: "Free key: aistudio.google.com → Get API key → Create API key. It is stored only in this vault's plugin data (git-ignored, never pushed).",
    });
    new Setting(containerEl)
      .setName("Gemini API key")
      .setDesc("Used to read handwritten formulas.")
      .addText((t) => {
        t.inputEl.type = "password";
        t.setPlaceholder("paste your key")
          .setValue(this.plugin.settings.geminiKey)
          .onChange(async (v) => {
            this.plugin.settings.geminiKey = v.trim();
            await this.plugin.saveData(this.plugin.settings);
          });
      });
    new Setting(containerEl)
      .setName("Gemini model")
      .setDesc("Default gemini-flash-latest (free tier, always the current Flash). Change only if Google retires the name.")
      .addText((t) =>
        t
          .setPlaceholder(DEFAULT_SETTINGS.geminiModel)
          .setValue(this.plugin.settings.geminiModel)
          .onChange(async (v) => {
            this.plugin.settings.geminiModel = v.trim() || DEFAULT_SETTINGS.geminiModel;
            await this.plugin.saveData(this.plugin.settings);
          })
      );
  }
}
