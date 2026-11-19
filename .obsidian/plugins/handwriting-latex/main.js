const { Plugin, Modal, Notice, PluginSettingTab, Setting, requestUrl } = require('obsidian');

const DEFAULT_SETTINGS = {
  apiProvider: "simpletex",
  apiKey: "",
  apiEndpoint: "",
  customPrompt: "Recognize the handwritten mathematical formula in this image and return ONLY the LaTeX code, without any explanation or markdown formatting.",
  mathMode: "inline",
  strokeColor: "#000000",
  strokeWidth: 3,
  canvasWidth: 1200,
  canvasHeight: 600,
  showGrid: true,
  customResponseField: "text",
  customApiKeyHeader: "X-API-Key",
  customImageFieldName: "image",
  mathpixAppId: "",
  openaiModel: "gpt-4o",
  openaiDetail: "high",
  maxHistorySize: 30,
  customProviders: [],
  customFormFields: [],
  customPlaceholders: [],
  tightCropPadding: 8,
  imageEnhancement: "auto"
};

const PRESET_TEMPLATES = [
  {
    name: "OpenAI GPT-4o (Custom)",
    method: "POST",
    url: "https://api.openai.com/v1/chat/completions",
    headers: [
      { key: "Authorization", value: "Bearer {{apiKey}}" },
      { key: "Content-Type", value: "application/json" }
    ],
    bodyType: "json",
    bodyTemplate: JSON.stringify({
      model: "gpt-4o",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "{{prompt}}" },
          { type: "image_url", image_url: { url: "{{image}}", detail: "high" } }
        ]
      }],
      max_tokens: 2048
    }, null, 2),
    responsePath: "choices.0.message.content",
    responseType: "json"
  },
  {
    name: "OpenAI o1/o3/o4 (Custom)",
    method: "POST",
    url: "https://api.openai.com/v1/chat/completions",
    headers: [
      { key: "Authorization", value: "Bearer {{apiKey}}" },
      { key: "Content-Type", value: "application/json" }
    ],
    bodyType: "json",
    bodyTemplate: JSON.stringify({
      model: "o3",
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "{{prompt}}" },
          { type: "image_url", image_url: { url: "{{image}}", detail: "high" } }
        ]
      }],
      max_completion_tokens: 2048
    }, null, 2),
    responsePath: "choices.0.message.content",
    responseType: "json"
  },
  {
    name: "Anthropic Claude (Custom)",
    method: "POST",
    url: "https://api.anthropic.com/v1/messages",
    headers: [
      { key: "x-api-key", value: "{{apiKey}}" },
      { key: "Content-Type", value: "application/json" },
      { key: "anthropic-version", value: "2023-06-01" }
    ],
    bodyType: "json",
    bodyTemplate: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      messages: [{
        role: "user",
        content: [
          { type: "text", text: "{{prompt}}" },
          { type: "image", source: { type: "base64", media_type: "image/png", data: "{{image_base64}}" } }
        ]
      }]
    }, null, 2),
    responsePath: "content.0.text",
    responseType: "json"
  },
  {
    name: "Google Gemini (Custom)",
    method: "POST",
    url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={{apiKey}}",
    headers: [
      { key: "Content-Type", value: "application/json" }
    ],
    bodyType: "json",
    bodyTemplate: JSON.stringify({
      contents: [{
        parts: [
          { text: "{{prompt}}" },
          { inline_data: { mime_type: "image/png", data: "{{image_base64}}" } }
        ]
      }]
    }, null, 2),
    responsePath: "candidates.0.content.parts.0.text",
    responseType: "json"
  },
  {
    name: "SimpleTex-style (Custom Form)",
    method: "POST",
    url: "https://server.simpletex.cn/api/latex_ocr",
    headers: [
      { key: "token", value: "{{apiKey}}" }
    ],
    bodyType: "form-data",
    formFieldName: "file",
    responsePath: "res.latex",
    responseType: "json"
  }
];

class HandwritingLatexPlugin extends Plugin {
  async onload() {
    await this.loadSettings();
    this.history = [];
    this.historyIndex = -1;

    this.addCommand({
      id: "open-handwriting-canvas",
      name: "Open handwriting canvas",
      editorCallback: (editor) => {
        new HandwritingModal(this.app, this, this.settings, editor).open();
      },
    });

    this.addRibbonIcon("pencil", "Handwriting to LaTeX", () => {
      const activeView = this.app.workspace.getActiveViewOfType(require('obsidian').MarkdownView);
      if (activeView) {
        new HandwritingModal(this.app, this, this.settings, activeView.editor).open();
      } else {
        new Notice("Please open a markdown file first");
      }
    });

    this.addSettingTab(new HandwritingSettingTab(this.app, this));
  }

  onunload() {}

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}

class HandwritingModal extends Modal {
  constructor(app, plugin, settings, editor) {
    super(app);
    this.plugin = plugin;
    this.settings = settings;
    this.editor = editor;
    this._openCursor = null;

    // ---- world / camera state (infinite canvas, tldraw/excalidraw style) ----
    // Strokes are stored in WORLD coordinates. The canvas backing store is only
    // as large as the visible viewport (CSS px * dpr). screen = world * scale + offset.
    this.strokes = [];
    this.currentStroke = [];
    this.offsetX = 0;
    this.offsetY = 0;
    this.scale = 1.0;
    this.minScale = 0.1;
    this.maxScale = 8.0;

    this.mode = 'pen'; // pen | eraser | hand | select | lasso
    this.isDrawing = false;
    this.isPanning = false;
    this.pinchState = null;
    this.activePointers = new Map();
    this.panStart = null;
    this.panStartOffset = null;

    // Canvas selections (rectangles or lassos, in world coordinates)
    this.selections = [];
    this.draftSelection = null;
    this._selectedStrokes = new Set();

    this.showGrid = settings.showGrid !== false;
    this.mathMode = settings.mathMode || "inline";

    // Result slots (multiple concurrent recognition jobs)
    this.resultSlots = new Map();
    this.jobCounter = 0;

    // Camera / cropper
    this.currentStream = null;
    this.currentFacingMode = "environment";
    this.cropperOverlayVisible = false;
    this.cropperSelectionData = null;
    this.cropperImageScale = 1;
    this.cropperImageOffsetX = 0;
    this.cropperImageOffsetY = 0;
    this.cropperBaseCanvas = null;
    this.cropperEnhance = settings.imageEnhancement || "none";
    this._cropperIgnoreNextLoad = false;
    this._cropperClearSelectionOnLoad = true;

    // Toolbar / fullscreen
    this.toolbarCollapsed = false;
    this.isFullscreen = false;
    this.fullscreenExitBtn = null;

    // Result panel drag
    this.resultExpanded = false;
    this.resultUserHeight = null;
  }

  onOpen() {
    const contentEl = this.contentEl;
    contentEl.empty();
    contentEl.addClass("handwriting-modal");
    contentEl.addClass("handwriting-modal-fullscreen");

    // Make sure the fullscreen CSS is applied to the real Obsidian modal
    // elements. (contentEl is `.modal-content`, so descendant selectors from
    // contentEl can never match `.modal-container` / `.modal`.)
    const modalEl = contentEl.closest?.(".modal") || contentEl.parentElement;
    const containerEl = contentEl.closest?.(".modal-container") || modalEl?.parentElement;
    const addModalClass = (el, cls) => {
      if (!el) return;
      if (el.addClass) el.addClass(cls);
      else if (el.classList) el.classList.add(cls);
    };
    addModalClass(modalEl, "handwriting-modal-fullscreen-el");
    addModalClass(containerEl, "handwriting-modal-fullscreen-container");
    this.modalEl = modalEl;
    this.modalContainerEl = containerEl;

    // Remember where the user's cursor was before the modal opened. Mobile
    // editors sometimes report the wrong cursor while a modal is open.
    try { this._openCursor = this.editor.getCursor(); } catch (e) { this._openCursor = null; }

    this.buildHeader(contentEl);
    this.buildBody(contentEl);
    this.buildCameraOverlay(contentEl);
    this.buildCropperOverlay(contentEl);

    // Hidden file input for album import
    this.albumInput = contentEl.createEl("input", {
      type: "file",
      attr: { accept: "image/*", style: "display:none;" }
    });
    this.albumInput.addEventListener("change", (e) => this.handleFileSelect(e));

    this.bindWindowGestureListeners();

    this.updateModeUI();
    this.updateHistoryUI();

    // Initial render once DOM layout is known
    requestAnimationFrame(() => {
      this.resizeCanvases();
    });

    this._resizeObserver = new ResizeObserver(() => {
      this.resizeCanvases();
    });
    this._resizeObserver.observe(this.canvasShell);
    if (this.cropperWrapper) this._resizeObserver.observe(this.cropperWrapper);
  }

  // ======================================================================
  // UI construction
  // ======================================================================
  buildHeader(contentEl) {
    const header = contentEl.createDiv({ cls: "handwriting-header" });
    this.header = header;

    const headerLeft = header.createDiv({ cls: "header-left" });
    headerLeft.createEl("h2", { text: "✍️ Handwriting" });

    const mediaActions = headerLeft.createDiv({ cls: "header-media-actions" });
    const cameraBtn = mediaActions.createEl("button", { text: "📷", cls: "header-icon-btn", attr: { "aria-label": "Camera" } });
    cameraBtn.addEventListener("click", () => this.openCamera());
    const albumBtn = mediaActions.createEl("button", { text: "🖼️", cls: "header-icon-btn", attr: { "aria-label": "Album" } });
    albumBtn.addEventListener("click", () => this.openAlbum());

    const headerActions = header.createDiv({ cls: "header-actions" });
    const recognizeBtn = headerActions.createEl("button", { text: "🔍 Recognize", cls: "mod-cta header-action-btn" });
    recognizeBtn.addEventListener("click", () => this.recognizeFormula());
    const insertBtn = headerActions.createEl("button", { text: "✅ Insert", cls: "mod-cta header-action-btn" });
    insertBtn.addEventListener("click", () => this.insertAndClose());
  }

  buildBody(contentEl) {
    const body = contentEl.createDiv({ cls: "handwriting-body" });
    this.body = body;

    // ---- Canvas area (infinite viewport) ----
    const canvasArea = body.createDiv({ cls: "canvas-area" });
    this.canvasArea = canvasArea;
    this.canvasShell = canvasArea.createDiv({ cls: "canvas-shell" });

    this.sceneCanvas = this.canvasShell.createEl("canvas", { cls: "canvas-layer canvas-layer-scene" });
    this.highlightCanvas = this.canvasShell.createEl("canvas", { cls: "canvas-layer canvas-layer-highlight" });
    this.activeCanvas = this.canvasShell.createEl("canvas", { cls: "canvas-layer canvas-layer-active" });
    this.overlayCanvas = this.canvasShell.createEl("canvas", { cls: "canvas-layer canvas-layer-overlay" });

    this.ctx = this.sceneCanvas.getContext("2d");
    this.highlightCtx = this.highlightCanvas.getContext("2d");
    this.activeCtx = this.activeCanvas.getContext("2d");
    this.overlayCtx = this.overlayCanvas.getContext("2d");

    this.buildToolbar(this.canvasShell);
    this.bindCanvasEvents(this.canvasShell);

    // ---- Result panel ----
    const resultPanel = body.createDiv({ cls: "result-panel" });
    this.buildResultPanel(resultPanel);

    // Footer
    const footer = contentEl.createDiv({ cls: "handwriting-footer" });
    footer.innerHTML = `
      <span>🖊️ Single finger: draw</span>
      <span>✋ Two fingers: pan & zoom</span>
      <span>▭/◯: select regions to recognize</span>
    `;
  }

  buildToolbar(shell) {
    const toolbarContainer = shell.createDiv({ cls: "toolbar-container" });
    this.toolbarContainer = toolbarContainer;

    const toggleBtn = toolbarContainer.createEl("button", {
      text: "◀",
      cls: "toolbar-toggle-btn",
      attr: { "aria-label": "Collapse toolbar" }
    });
    toggleBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.toggleToolbar();
    });

    const floatToolbar = toolbarContainer.createDiv({ cls: "floating-toolbar" });
    this.floatToolbar = floatToolbar;

    const modeGroup = floatToolbar.createDiv({ cls: "toolbar-group" });
    this.penBtn = modeGroup.createEl("button", { text: "✏️", cls: "toolbar-btn active", attr: { "aria-label": "Pen" } });
    this.penBtn.addEventListener("click", (e) => { e.stopPropagation(); this.setMode('pen'); });
    this.eraserBtn = modeGroup.createEl("button", { text: "🧹", cls: "toolbar-btn", attr: { "aria-label": "Eraser" } });
    this.eraserBtn.addEventListener("click", (e) => { e.stopPropagation(); this.setMode('eraser'); });
    this.handBtn = modeGroup.createEl("button", { text: "✋", cls: "toolbar-btn", attr: { "aria-label": "Pan" } });
    this.handBtn.addEventListener("click", (e) => { e.stopPropagation(); this.setMode('hand'); });
    this.selectBtn = modeGroup.createEl("button", { text: "▭", cls: "toolbar-btn", attr: { "aria-label": "Rect select" } });
    this.selectBtn.addEventListener("click", (e) => { e.stopPropagation(); this.setMode('select'); });
    this.lassoBtn = modeGroup.createEl("button", { text: "◯", cls: "toolbar-btn", attr: { "aria-label": "Lasso select" } });
    this.lassoBtn.addEventListener("click", (e) => { e.stopPropagation(); this.setMode('lasso'); });
    this.polygonBtn = modeGroup.createEl("button", { text: "🔷", cls: "toolbar-btn", attr: { "aria-label": "Polygon select" } });
    this.polygonBtn.addEventListener("click", (e) => { e.stopPropagation(); this.setMode('polygon'); });

    const actionGroup = floatToolbar.createDiv({ cls: "toolbar-group" });
    const undoBtn = actionGroup.createEl("button", { text: "↩️", cls: "toolbar-btn", attr: { "aria-label": "Undo stroke" } });
    undoBtn.addEventListener("click", (e) => { e.stopPropagation(); this.undoStroke(); });
    const clearBtn = actionGroup.createEl("button", { text: "🗑️", cls: "toolbar-btn", attr: { "aria-label": "Clear canvas" } });
    clearBtn.addEventListener("click", (e) => { e.stopPropagation(); this.clearCanvas(); });
    const clearSelBtn = actionGroup.createEl("button", { text: "❎", cls: "toolbar-btn", attr: { "aria-label": "Clear selections" } });
    clearSelBtn.addEventListener("click", (e) => { e.stopPropagation(); this.clearSelections(); });
    const rotateLeftBtn = actionGroup.createEl("button", { text: "↺", cls: "toolbar-btn", attr: { "aria-label": "Rotate left" } });
    rotateLeftBtn.addEventListener("click", (e) => { e.stopPropagation(); this.rotateCanvas(false); });
    const rotateRightBtn = actionGroup.createEl("button", { text: "↻", cls: "toolbar-btn", attr: { "aria-label": "Rotate right" } });
    rotateRightBtn.addEventListener("click", (e) => { e.stopPropagation(); this.rotateCanvas(true); });

    const viewGroup = floatToolbar.createDiv({ cls: "toolbar-group" });
    const zoomOutBtn = viewGroup.createEl("button", { text: "➖", cls: "toolbar-btn", attr: { "aria-label": "Zoom out" } });
    zoomOutBtn.addEventListener("click", (e) => { e.stopPropagation(); this.zoomAtCenter(0.8); });
    const zoomInBtn = viewGroup.createEl("button", { text: "➕", cls: "toolbar-btn", attr: { "aria-label": "Zoom in" } });
    zoomInBtn.addEventListener("click", (e) => { e.stopPropagation(); this.zoomAtCenter(1.25); });
    const fitBtn = viewGroup.createEl("button", { text: "⊘", cls: "toolbar-btn", attr: { "aria-label": "Fit view" } });
    fitBtn.addEventListener("click", (e) => { e.stopPropagation(); this.fitViewToStrokes(); });
    const resetBtn = viewGroup.createEl("button", { text: "🏠", cls: "toolbar-btn", attr: { "aria-label": "Reset view" } });
    resetBtn.addEventListener("click", (e) => { e.stopPropagation(); this.resetView(); });
    const gridBtn = viewGroup.createEl("button", { text: "⊞", cls: "toolbar-btn" + (this.showGrid ? " active" : ""), attr: { "aria-label": "Toggle grid" } });
    gridBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      this.showGrid = !this.showGrid;
      gridBtn.toggleClass("active", this.showGrid);
      this.renderScene();
    });
    const fullscreenBtn = viewGroup.createEl("button", { text: "⛶", cls: "toolbar-btn", attr: { "aria-label": "Fullscreen canvas" } });
    fullscreenBtn.addEventListener("click", (e) => { e.stopPropagation(); this.toggleFullscreen(); });
  }

  buildResultPanel(resultPanel) {
    const resultHandle = resultPanel.createDiv({ cls: "result-handle" });
    resultHandle.innerHTML = `<span class="handle-bar"></span><span class="handle-label">LaTeX Result</span>`;
    resultHandle.addEventListener("click", () => {
      if (resultHandle.hasAttribute("data-dragged")) {
        resultHandle.removeAttribute("data-dragged");
        return;
      }
      this.toggleResultPanel();
    });
    this.bindResultPanelDrag(resultHandle, resultPanel);

    const resultContent = resultPanel.createDiv({ cls: "result-content" });
    this.resultContent = resultContent;

    this.statusEl = resultContent.createDiv({ cls: "status-text" });
    this.statusEl.setText("Draw a formula and tap 'Recognize'");

    const mathModeRow = resultContent.createDiv({ cls: "math-mode-row" });
    mathModeRow.createEl("span", { text: "Insert as: ", cls: "math-mode-label" });
    this.inlineMathBtn = mathModeRow.createEl("button", { text: "Inline ($)", cls: "math-mode-btn" + (this.mathMode === "inline" ? " active" : "") });
    this.displayMathBtn = mathModeRow.createEl("button", { text: "Display ($$)", cls: "math-mode-btn" + (this.mathMode === "display" ? " active" : "") });
    this.rawMathBtn = mathModeRow.createEl("button", { text: "Raw (no $)", cls: "math-mode-btn" + (this.mathMode === "raw" ? " active" : "") });

    const setMathMode = (mode) => {
      this.mathMode = mode;
      this.inlineMathBtn.toggleClass("active", mode === "inline");
      this.displayMathBtn.toggleClass("active", mode === "display");
      this.rawMathBtn.toggleClass("active", mode === "raw");
    };
    this.inlineMathBtn.addEventListener("click", () => setMathMode("inline"));
    this.displayMathBtn.addEventListener("click", () => setMathMode("display"));
    this.rawMathBtn.addEventListener("click", () => setMathMode("raw"));

    const historyRow = resultContent.createDiv({ cls: "history-row" });
    this.prevHistoryBtn = historyRow.createEl("button", { text: "←", cls: "history-nav-btn disabled", attr: { "aria-label": "Previous result" } });
    this.prevHistoryBtn.addEventListener("click", () => this.navigateHistory(-1));
    this.historyCounter = historyRow.createEl("span", { text: "0/0", cls: "history-counter" });
    this.nextHistoryBtn = historyRow.createEl("button", { text: "→", cls: "history-nav-btn disabled", attr: { "aria-label": "Next result" } });
    this.nextHistoryBtn.addEventListener("click", () => this.navigateHistory(1));

    resultContent.createEl("h3", { text: "Preview:" });
    this.resultEl = resultContent.createDiv({ cls: "latex-preview" });
    this.resultEl.setText("(No result yet)");
    this.resultEl.setAttr("data-latex", "");

    resultContent.createEl("h3", { text: "Results:" });
    this.resultsList = resultContent.createDiv({ cls: "results-list" });
  }

  buildCameraOverlay(contentEl) {
    this.cameraOverlay = contentEl.createDiv({ cls: "camera-overlay" });
    this.cameraOverlay.style.display = "none";

    const cameraHeader = this.cameraOverlay.createDiv({ cls: "camera-header" });
    cameraHeader.createEl("h3", { text: "📷 Take Photo" });
    const cameraActions = cameraHeader.createDiv({ cls: "camera-actions" });
    const switchBtn = cameraActions.createEl("button", { text: "🔄", cls: "camera-icon-btn", attr: { "aria-label": "Switch camera" } });
    switchBtn.addEventListener("click", () => this.switchCamera());
    const closeCameraBtn = cameraActions.createEl("button", { text: "✕", cls: "camera-icon-btn", attr: { "aria-label": "Close" } });
    closeCameraBtn.addEventListener("click", () => this.closeCamera());

    const cameraBody = this.cameraOverlay.createDiv({ cls: "camera-body" });
    this.videoEl = cameraBody.createEl("video", { cls: "camera-video" });
    this.videoEl.setAttribute("autoplay", "");
    this.videoEl.setAttribute("playsinline", "");

    const cameraFooter = this.cameraOverlay.createDiv({ cls: "camera-footer" });
    const captureBtn = cameraFooter.createEl("button", { text: "⚪", cls: "camera-capture-btn", attr: { "aria-label": "Capture" } });
    captureBtn.addEventListener("click", () => this.capturePhoto());
  }

  buildCropperOverlay(contentEl) {
    this.cropperOverlay = contentEl.createDiv({ cls: "cropper-overlay" });
    this.cropperOverlay.style.display = "none";

    const cropperHeader = this.cropperOverlay.createDiv({ cls: "cropper-header" });
    cropperHeader.createEl("h3", { text: "✂️ Crop Formula" });

    const cropperActions = cropperHeader.createDiv({ cls: "cropper-actions" });
    const rotateLeft = cropperActions.createEl("button", { text: "↺", cls: "cropper-action-btn", attr: { "aria-label": "Rotate left" } });
    rotateLeft.addEventListener("click", () => this.rotateCropperImage(false));
    const rotateRight = cropperActions.createEl("button", { text: "↻", cls: "cropper-action-btn", attr: { "aria-label": "Rotate right" } });
    rotateRight.addEventListener("click", () => this.rotateCropperImage(true));

    this.cropperEnhanceSelect = cropperActions.createEl("select", { cls: "cropper-enhance-select" });
    const enhanceModes = [
      { value: "none", label: "Original" },
      { value: "auto", label: "Auto enhance" },
      { value: "grayscale", label: "Grayscale" },
      { value: "sharpen", label: "Sharpen" },
      { value: "binarize", label: "Binarize (OCR)" }
    ];
    for (const m of enhanceModes) {
      const opt = this.cropperEnhanceSelect.createEl("option", { text: m.label });
      opt.value = m.value;
      if (m.value === this.cropperEnhance) opt.selected = true;
    }
    this.cropperEnhanceSelect.addEventListener("change", () => this.setCropperEnhance(this.cropperEnhanceSelect.value));

    const selectAll = cropperActions.createEl("button", { text: "Select All", cls: "cropper-action-btn" });
    selectAll.addEventListener("click", () => this.selectAllCropper());
    const clearSel = cropperActions.createEl("button", { text: "Clear", cls: "cropper-action-btn mod-warning" });
    clearSel.addEventListener("click", () => this.clearCropperSelection());
    const cancel = cropperActions.createEl("button", { text: "Cancel", cls: "cropper-action-btn mod-warning" });
    cancel.addEventListener("click", () => this.hideCropper());
    const recognize = cropperActions.createEl("button", { text: "🔍 Recognize", cls: "cropper-action-btn mod-cta" });
    recognize.addEventListener("click", () => this.confirmCropAndRecognize());

    const cropperBody = this.cropperOverlay.createDiv({ cls: "cropper-body" });
    this.cropperWrapper = cropperBody.createDiv({ cls: "cropper-wrapper" });
    this.cropperImage = this.cropperWrapper.createEl("img", { cls: "cropper-image" });

    this.cropperMaskTop = this.cropperWrapper.createDiv({ cls: "cropper-mask cropper-mask-top" });
    this.cropperMaskBottom = this.cropperWrapper.createDiv({ cls: "cropper-mask cropper-mask-bottom" });
    this.cropperMaskLeft = this.cropperWrapper.createDiv({ cls: "cropper-mask cropper-mask-left" });
    this.cropperMaskRight = this.cropperWrapper.createDiv({ cls: "cropper-mask cropper-mask-right" });

    this.cropperSelection = this.cropperWrapper.createDiv({ cls: "cropper-selection" });
    this.cropperSelection.style.display = "none";
    const handleNames = ['nw', 'n', 'ne', 'w', 'e', 'sw', 's', 'se'];
    for (const h of handleNames) {
      this.cropperSelection.createDiv({ cls: `cropper-handle cropper-handle-${h}`, attr: { 'data-handle': h } });
    }

    const cropperFooter = this.cropperOverlay.createDiv({ cls: "cropper-footer" });
    this.cropperInfoEl = cropperFooter.createEl("span", { cls: "cropper-info" });
    const cropperHint = cropperFooter.createEl("span", { cls: "cropper-hint" });
    cropperHint.textContent = "👆 Drag to select • 🤏 Pinch to zoom • ✋ Drag inside selection to move";

    this.cropperImage.addEventListener("load", () => {
      if (this._cropperIgnoreNextLoad) {
        this._cropperIgnoreNextLoad = false;
        requestAnimationFrame(() => {
          this.initCropperView();
          if (this._cropperClearSelectionOnLoad) {
            this._cropperClearSelectionOnLoad = false;
            this.cropperSelectionData = null;
            this.cropperSelection.style.display = "none";
            this.updateCropperMask();
          }
        });
        return;
      }
      this.initCropperFromCurrentImage();
    });
    this.bindCropperEvents();
  }

  // ======================================================================
  // Camera
  // ======================================================================
  async openCamera() {
    try {
      this.currentFacingMode = "environment";
      await this.startCamera();
      this.body.style.display = "none";
      this.header.style.display = "none";
      const footer = this.contentEl.querySelector(".handwriting-footer");
      if (footer) footer.style.display = "none";
      this.cameraOverlay.style.display = "flex";
      this.statusEl.setText("Camera active");
    } catch (err) {
      new Notice("Camera error: " + err.message);
      console.error(err);
    }
  }

  async startCamera() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(t => t.stop());
    }
    const constraints = {
      video: {
        facingMode: this.currentFacingMode || "environment",
        width: { ideal: 1920 },
        height: { ideal: 1080 }
      },
      audio: false
    };
    this.currentStream = await navigator.mediaDevices.getUserMedia(constraints);
    this.videoEl.srcObject = this.currentStream;
    await this.videoEl.play();
  }

  switchCamera() {
    this.currentFacingMode = this.currentFacingMode === "environment" ? "user" : "environment";
    this.startCamera();
  }

  capturePhoto() {
    if (!this.videoEl.videoWidth) {
      new Notice("Camera not ready yet");
      return;
    }
    const canvas = document.createElement("canvas");
    canvas.width = this.videoEl.videoWidth;
    canvas.height = this.videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(this.videoEl, 0, 0);
    const dataUrl = canvas.toDataURL("image/png");
    this.closeCamera();
    this.showCropper(dataUrl);
  }

  closeCamera() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(t => t.stop());
      this.currentStream = null;
    }
    this.cameraOverlay.style.display = "none";
    this.body.style.display = "flex";
    this.header.style.display = "flex";
    const footer = this.contentEl.querySelector(".handwriting-footer");
    if (footer) footer.style.display = "";
  }

  openAlbum() {
    if (this.albumInput) this.albumInput.click();
  }

  handleFileSelect(e) {
    const file = e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      new Notice("Please select an image file");
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      this.showCropper(event.target.result);
    };
    reader.onerror = () => {
      new Notice("Failed to read image");
    };
    reader.readAsDataURL(file);
  }

  // ======================================================================
  // Toolbar / fullscreen
  // ======================================================================
  setMode(mode) {
    this.mode = mode;
    this.isPanning = false;
    this.isDrawing = false;
    if (this.currentStroke.length > 0) this.endStroke();
    this.draftSelection = null;
    this.updateModeUI();
    this.canvasShell.style.cursor = mode === 'hand' ? "grab" : (mode === 'eraser' ? "pointer" : "crosshair");
    const modeNames = { pen: 'Pen', eraser: 'Eraser', hand: 'Hand (pan)', select: 'Rect select', lasso: 'Lasso select', polygon: 'Polygon select' };
    this.statusEl.setText(`Mode: ${modeNames[mode] || mode}`);
  }

  updateModeUI() {
    if (!this.penBtn) return;
    this.penBtn.toggleClass("active", this.mode === 'pen');
    this.eraserBtn.toggleClass("active", this.mode === 'eraser');
    this.handBtn.toggleClass("active", this.mode === 'hand');
    this.selectBtn.toggleClass("active", this.mode === 'select');
    this.lassoBtn.toggleClass("active", this.mode === 'lasso');
    if (this.polygonBtn) this.polygonBtn.toggleClass("active", this.mode === 'polygon');
  }

  toggleToolbar() {
    this.toolbarCollapsed = !this.toolbarCollapsed;
    const container = this.toolbarContainer;
    if (container) container.classList.toggle("collapsed", this.toolbarCollapsed);
    const toggleBtn = container?.querySelector(".toolbar-toggle-btn");
    if (toggleBtn) {
      toggleBtn.textContent = this.toolbarCollapsed ? "▶" : "◀";
      toggleBtn.setAttr("aria-label", this.toolbarCollapsed ? "Expand toolbar" : "Collapse toolbar");
    }
  }

  toggleFullscreen() {
    this.isFullscreen ? this.exitFullscreen() : this.enterFullscreen();
  }

  enterFullscreen() {
    if (this.isFullscreen) return;
    this.isFullscreen = true;
    this.canvasShell.classList.add("canvas-shell-fullscreen");
    this.exitFullscreenBtn = document.createElement("button");
    this.exitFullscreenBtn.textContent = "Exit Fullscreen";
    this.exitFullscreenBtn.className = "handwriting-fullscreen-exit";
    this.exitFullscreenBtn.style.cssText = `position:fixed;top:16px;right:16px;padding:12px 20px;font-size:16px;background:var(--interactive-accent,#7c3aed);color:white;border:none;border-radius:8px;cursor:pointer;z-index:100000;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-weight:600;`;
    this.exitFullscreenBtn.addEventListener("click", () => this.exitFullscreen());
    this.canvasShell.appendChild(this.exitFullscreenBtn);
    requestAnimationFrame(() => this.resizeCanvases());
  }

  exitFullscreen() {
    if (!this.isFullscreen) return;
    this.isFullscreen = false;
    this.canvasShell.classList.remove("canvas-shell-fullscreen");
    if (this.exitFullscreenBtn) {
      this.exitFullscreenBtn.remove();
      this.exitFullscreenBtn = null;
    }
    requestAnimationFrame(() => this.resizeCanvases());
  }

  // ======================================================================
  // Canvas viewport / camera (infinite canvas)
  // ======================================================================
  screenToWorld(clientX, clientY) {
    const rect = this.sceneCanvas.getBoundingClientRect();
    const cssX = clientX - rect.left;
    const cssY = clientY - rect.top;
    return this.cssToWorld(cssX, cssY);
  }

  cssToWorld(cssX, cssY) {
    return {
      x: (cssX - this.offsetX) / this.scale,
      y: (cssY - this.offsetY) / this.scale,
    };
  }

  worldToCss(worldX, worldY) {
    return {
      x: worldX * this.scale + this.offsetX,
      y: worldY * this.scale + this.offsetY,
    };
  }

  resizeCanvases() {
    const shell = this.canvasShell;
    if (!shell) return;
    const rect = shell.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));
    const dpr = Math.min(2.5, Math.max(1, window.devicePixelRatio || 1));
    this.viewW = w;
    this.viewH = h;
    this.dpr = dpr;

    const canvases = [this.sceneCanvas, this.highlightCanvas, this.activeCanvas, this.overlayCanvas];
    for (const canvas of canvases) {
      if (!canvas) continue;
      const bw = Math.round(w * dpr);
      const bh = Math.round(h * dpr);
      if (canvas.width !== bw || canvas.height !== bh) {
        canvas.width = bw;
        canvas.height = bh;
      }
    }
    this.renderScene();
    this.renderOverlay();
    if (this.isDrawing) this.renderActiveStroke();
  }

  getVisibleWorldRect() {
    const w = this.viewW || 1;
    const h = this.viewH || 1;
    const margin = 120;
    return {
      minX: (-this.offsetX - margin) / this.scale,
      minY: (-this.offsetY - margin) / this.scale,
      maxX: (w - this.offsetX + margin) / this.scale,
      maxY: (h - this.offsetY + margin) / this.scale,
    };
  }

  applyCameraTransform(ctx) {
    ctx.setTransform(
      this.dpr * this.scale,
      0,
      0,
      this.dpr * this.scale,
      this.dpr * this.offsetX,
      this.dpr * this.offsetY
    );
  }

  renderScene() {
    const ctx = this.ctx;
    if (!ctx) return;
    const bw = this.sceneCanvas.width;
    const bh = this.sceneCanvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, bw, bh);

    if (this.showGrid) this.drawGrid(ctx);

    const visible = this.getVisibleWorldRect();
    this.applyCameraTransform(ctx);
    this.setupWorldStrokeStyle(ctx);
    for (const stroke of this.strokes) {
      if (!this.strokeVisible(stroke, visible)) continue;
      this.drawStrokePath(ctx, stroke);
    }
    // While actively drawing, the current stroke lives on the active layer
    // (redrawn incrementally) so it stays responsive.
    if (!this.isDrawing && this.currentStroke.length > 0) {
      this.drawStrokePath(ctx, this.currentStroke);
    }
  }

  setupWorldStrokeStyle(ctx) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.settings.strokeColor || "#000000";
    ctx.lineWidth = this.settings.strokeWidth || 3;
  }

  strokeBounds(stroke) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of stroke) {
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    }
    return { minX, minY, maxX, maxY };
  }

  strokeVisible(stroke, visible) {
    const b = this.strokeBounds(stroke);
    return b.maxX >= visible.minX && b.minX <= visible.maxX &&
           b.maxY >= visible.minY && b.minY <= visible.maxY;
  }

  drawStrokePath(ctx, stroke) {
    if (stroke.length === 0) return;
    if (stroke.length === 1) {
      const p = stroke[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, (this.settings.strokeWidth || 3) / 2, 0, Math.PI * 2);
      ctx.fillStyle = this.settings.strokeColor || "#000000";
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }

  drawGrid(ctx) {
    const visible = this.getVisibleWorldRect();
    let step = 50;
    while (step * this.scale < 24) step *= 2;
    while (step * this.scale > 160) step /= 2;
    if (step < 5) step = 5;

    const startX = Math.floor(visible.minX / step) * step;
    const startY = Math.floor(visible.minY / step) * step;

    ctx.save();
    this.applyCameraTransform(ctx);
    ctx.strokeStyle = "rgba(190, 190, 190, 0.35)";
    ctx.lineWidth = 1 / this.scale;
    ctx.beginPath();
    for (let x = startX; x <= visible.maxX; x += step) {
      ctx.moveTo(x, visible.minY);
      ctx.lineTo(x, visible.maxY);
    }
    for (let y = startY; y <= visible.maxY; y += step) {
      ctx.moveTo(visible.minX, y);
      ctx.lineTo(visible.maxX, y);
    }
    ctx.stroke();
    ctx.restore();
  }

  getSelectionAccentColor() {
    const c = getComputedStyle(document.documentElement).getPropertyValue('--interactive-accent');
    return c || "#7c3aed";
  }

  updateSelectedStrokes() {
    this._selectedStrokes.clear();
    if (this.selections.length === 0) return;
    for (const sel of this.selections) {
      for (const stroke of this.strokesForSelection(sel)) {
        this._selectedStrokes.add(stroke);
      }
    }
  }

  drawHighlightStroke(ctx, stroke) {
    if (stroke.length === 0) return;
    if (stroke.length === 1) {
      const p = stroke[0];
      ctx.beginPath();
      ctx.arc(p.x, p.y, ((this.settings.strokeWidth || 3) + 4) / 2, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.beginPath();
    ctx.moveTo(stroke[0].x, stroke[0].y);
    for (let i = 1; i < stroke.length; i++) {
      ctx.lineTo(stroke[i].x, stroke[i].y);
    }
    ctx.stroke();
  }

  renderHighlight() {
    const ctx = this.highlightCtx;
    if (!ctx || !this.dpr) return;
    const bw = this.highlightCanvas.width;
    const bh = this.highlightCanvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    if (this._selectedStrokes.size === 0) return;

    ctx.setTransform(
      this.dpr * this.scale,
      0,
      0,
      this.dpr * this.scale,
      this.dpr * this.offsetX,
      this.dpr * this.offsetY
    );
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = this.getSelectionAccentColor();
    ctx.fillStyle = ctx.strokeStyle;
    ctx.lineWidth = (this.settings.strokeWidth || 3) + 4;
    ctx.globalAlpha = 0.28;
    const visible = this.getVisibleWorldRect();
    for (const stroke of this._selectedStrokes) {
      if (!this.strokeVisible(stroke, visible)) continue;
      this.drawHighlightStroke(ctx, stroke);
    }
    ctx.globalAlpha = 1;
  }

  renderOverlay() {
    this.renderHighlight();
    const ctx = this.overlayCtx;
    if (!ctx || !this.dpr) return;
    const bw = this.overlayCanvas.width;
    const bh = this.overlayCanvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    if (this.mode !== 'select' && this.mode !== 'lasso' && this.mode !== 'polygon' && this.selections.length === 0 && !this.draftSelection) return;

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.strokeStyle = this.getSelectionAccentColor();
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.fillStyle = "rgba(124, 58, 237, 0.08)";

    const drawRect = (s) => {
      const tl = this.worldToCss(s.x, s.y);
      const br = this.worldToCss(s.x + s.width, s.y + s.height);
      const x = Math.min(tl.x, br.x);
      const y = Math.min(tl.y, br.y);
      const w = Math.abs(br.x - tl.x);
      const h = Math.abs(br.y - tl.y);
      ctx.fillStyle = "rgba(124, 58, 237, 0.08)";
      ctx.fillRect(x, y, w, h);
      ctx.strokeRect(x, y, w, h);
    };

    const drawPolygonShape = (s, isDraft) => {
      if (!s.points || s.points.length === 0) return;
      const pts = s.points.map(p => this.worldToCss(p.x, p.y));
      if (pts.length === 1) {
        ctx.fillStyle = this.getSelectionAccentColor();
        ctx.beginPath();
        ctx.arc(pts[0].x, pts[0].y, 5, 0, Math.PI * 2);
        ctx.fill();
        if (s.previewPoint) {
          const prev = this.worldToCss(s.previewPoint.x, s.previewPoint.y);
          ctx.beginPath();
          ctx.moveTo(pts[0].x, pts[0].y);
          ctx.lineTo(prev.x, prev.y);
          ctx.stroke();
        }
        return;
      }

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);

      if (s.previewPoint) {
        // During a tap-to-add gesture, show a live preview segment from the
        // last placed vertex to the finger position.
        const prev = this.worldToCss(s.previewPoint.x, s.previewPoint.y);
        ctx.lineTo(prev.x, prev.y);
        ctx.stroke();
      } else if (!isDraft) {
        // A finalized polygon is closed and lightly filled.
        ctx.closePath();
        ctx.fillStyle = "rgba(124, 58, 237, 0.08)";
        ctx.fill();
        ctx.stroke();
      } else {
        // A draft polygon is an open polyline until the user taps the start point.
        ctx.stroke();
      }

      // Emphasize the start point so the user knows where to close the polygon.
      const start = this.worldToCss(pts[0].x, pts[0].y);
      ctx.fillStyle = this.getSelectionAccentColor();
      ctx.beginPath();
      ctx.arc(start.x, start.y, 5, 0, Math.PI * 2);
      ctx.fill();
    };

    const drawLasso = (s) => {
      if (!s.points || s.points.length < 2) return;
      const pts = s.points.map(p => this.worldToCss(p.x, p.y));
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.closePath();
      ctx.fillStyle = "rgba(124, 58, 237, 0.08)";
      ctx.fill();
      ctx.stroke();
    };

    for (const s of this.selections) {
      if (s.type === 'rect') drawRect(s);
      else if (s.type === 'lasso') drawLasso(s);
      else if (s.type === 'polygon') drawPolygonShape(s, false);
    }
    if (this.draftSelection) {
      if (this.draftSelection.type === 'rect') drawRect(this.draftSelection);
      else if (this.draftSelection.type === 'lasso') drawLasso(this.draftSelection);
      else if (this.draftSelection.type === 'polygon') drawPolygonShape(this.draftSelection, true);
    }
    ctx.setLineDash([]);
  }

  zoomAtCenter(factor) {
    const cx = (this.viewW || 1) / 2;
    const cy = (this.viewH || 1) / 2;
    this.zoomAtCss(cx, cy, factor);
  }

  zoomAtCss(cssX, cssY, factor) {
    const world = this.cssToWorld(cssX, cssY);
    const newScale = Math.max(this.minScale, Math.min(this.maxScale, this.scale * factor));
    this.scale = newScale;
    this.offsetX = cssX - world.x * newScale;
    this.offsetY = cssY - world.y * newScale;
    this.renderScene();
    this.renderOverlay();
    this.statusEl.setText(`Zoom: ${Math.round(this.scale * 100)}%`);
  }

  resetView() {
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.renderScene();
    this.renderOverlay();
    this.statusEl.setText("View reset");
  }

  fitViewToStrokes() {
    if (this.strokes.length === 0 && this.currentStroke.length === 0) {
      this.resetView();
      return;
    }
    const b = this.getStrokesBoundingBox([...this.strokes, ...(this.currentStroke.length ? [this.currentStroke] : [])]);
    const padding = 80;
    const minX = b.minX - padding;
    const minY = b.minY - padding;
    const maxX = b.maxX + padding;
    const maxY = b.maxY + padding;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const viewW = this.viewW || this.canvasShell.clientWidth || 400;
    const viewH = this.viewH || this.canvasShell.clientHeight || 300;
    this.scale = Math.max(this.minScale, Math.min(this.maxScale, Math.min(viewW / contentW, viewH / contentH)));
    this.offsetX = (viewW - contentW * this.scale) / 2 - minX * this.scale;
    this.offsetY = (viewH - contentH * this.scale) / 2 - minY * this.scale;
    this.renderScene();
    this.renderOverlay();
    this.statusEl.setText("Fit to content");
  }

  getStrokesBoundingBox(strokes) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const s of strokes) {
      if (!s || s.length === 0) continue;
      const b = this.strokeBounds(s);
      if (b.minX < minX) minX = b.minX;
      if (b.minY < minY) minY = b.minY;
      if (b.maxX > maxX) maxX = b.maxX;
      if (b.maxY > maxY) maxY = b.maxY;
    }
    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0 };
    return { minX, minY, maxX, maxY };
  }

  rotateCanvas(clockwise) {
    if (this.isDrawing) this.endStroke();
    if (this.strokes.length === 0 && this.currentStroke.length === 0) {
      new Notice("Nothing to rotate");
      return;
    }
    const all = [...this.strokes, ...(this.currentStroke.length ? [this.currentStroke] : [])];
    const b = this.getStrokesBoundingBox(all);
    const cx = (b.minX + b.maxX) / 2;
    const cy = (b.minY + b.maxY) / 2;

    const transformPoint = (p) => {
      // Canvas y-axis points down; positive rotation is visually clockwise.
      if (clockwise) return { x: cx - (p.y - cy), y: cy + (p.x - cx) };
      return { x: cx + (p.y - cy), y: cy - (p.x - cx) };
    };

    this.strokes = this.strokes.map(stroke => stroke.map(transformPoint));
    if (this.currentStroke.length > 0) {
      this.currentStroke = this.currentStroke.map(transformPoint);
    }
    // Keep the content visually centered after rotation even when the
    // rotated point cloud has a slightly different bounding box.
    const newB = this.getStrokesBoundingBox(this.strokes);
    const cx2 = (newB.minX + newB.maxX) / 2;
    const cy2 = (newB.minY + newB.maxY) / 2;
    this.offsetX += (cx - cx2) * this.scale;
    this.offsetY += (cy - cy2) * this.scale;

    // Keep selections aligned with the rotated content
    this.selections = this.selections.map(sel => {
      if (sel.type === 'rect') {
        const p1 = transformPoint({ x: sel.x, y: sel.y });
        const p2 = transformPoint({ x: sel.x + sel.width, y: sel.y + sel.height });
        return {
          type: 'rect',
          x: Math.min(p1.x, p2.x),
          y: Math.min(p1.y, p2.y),
          width: Math.abs(p2.x - p1.x),
          height: Math.abs(p2.y - p1.y)
        };
      }
      return { type: sel.type || 'lasso', points: sel.points.map(transformPoint) };
    });
    if (this.draftSelection) this.draftSelection = null;

    this.updateSelectedStrokes();
    this.renderScene();
    this.renderOverlay();
    const dir = clockwise ? 'clockwise' : 'counter-clockwise';
    this.statusEl.setText(`Rotated ${dir}`);
    new Notice(`Rotated 90° ${dir}`);
  }

  // ======================================================================
  // Stroke drawing / erasing / undo
  // ======================================================================
  clearActiveLayer() {
    const ctx = this.activeCtx;
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.activeCanvas.width, this.activeCanvas.height);
  }

  startStroke(worldX, worldY) {
    this.isDrawing = true;
    this.currentStroke = [{ x: worldX, y: worldY }];
    this.renderActiveStroke();
  }

  renderActiveStroke() {
    const ctx = this.activeCtx;
    if (!ctx) return;
    const bw = this.activeCanvas.width;
    const bh = this.activeCanvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, bw, bh);
    if (this.currentStroke.length === 0) return;
    this.applyCameraTransform(ctx);
    this.setupWorldStrokeStyle(ctx);
    this.drawStrokePath(ctx, this.currentStroke);
  }

  continueStroke(worldX, worldY) {
    if (!this.isDrawing) return;
    const last = this.currentStroke[this.currentStroke.length - 1];
    const minDist = 0.75 / this.scale;
    if (Math.hypot(worldX - last.x, worldY - last.y) < minDist) return;
    this.currentStroke.push({ x: worldX, y: worldY });
    this.renderActiveStroke();
  }

  endStroke() {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    if (this.currentStroke.length > 0) {
      this.strokes.push([...this.currentStroke]);
    }
    this.currentStroke = [];
    this.clearActiveLayer();
    this.updateSelectedStrokes();
    this.renderScene();
    this.renderOverlay();
  }

  eraseAt(worldPos) {
    const threshold = Math.max(10, (this.settings.strokeWidth || 3) * 4) / this.scale;
    let changed = false;
    for (let i = this.strokes.length - 1; i >= 0; i--) {
      const stroke = this.strokes[i];
      for (const p of stroke) {
        if (Math.hypot(p.x - worldPos.x, p.y - worldPos.y) < threshold) {
          this.strokes.splice(i, 1);
          changed = true;
          break;
        }
      }
    }
    if (changed) {
      this.updateSelectedStrokes();
      this.renderScene();
      this.renderOverlay();
      this.statusEl.setText(`Erased! ${this.strokes.length} strokes left`);
    }
  }

  undoStroke() {
    if (this.strokes.length === 0) {
      new Notice("Nothing to undo");
      return;
    }
    this.strokes.pop();
    this.updateSelectedStrokes();
    this.renderScene();
    this.renderOverlay();
    this.statusEl.setText(`Undo: ${this.strokes.length} strokes left`);
  }

  clearCanvas() {
    if (this.isDrawing) this.endStroke();
    this.strokes = [];
    this.currentStroke = [];
    this.selections = [];
    this.draftSelection = null;
    this.scale = 1.0;
    this.offsetX = 0;
    this.offsetY = 0;
    this.updateSelectedStrokes();
    this.renderScene();
    this.renderOverlay();
    this.resultEl.setText("(No result yet)");
    this.resultEl.setAttr("data-latex", "");
    this.statusEl.setText("Canvas cleared");
    new Notice("Canvas cleared");
  }

  // ======================================================================
  // Canvas selections (rect + lasso)
  // ======================================================================
  clearSelections() {
    this.selections = [];
    this.draftSelection = null;
    this.updateSelectedStrokes();
    this.renderOverlay();
    this.statusEl.setText(this.selections.length ? `${this.selections.length} selection(s)` : "Selections cleared");
  }

  startDraftSelection(type, worldPos) {
    if (type === 'rect') {
      this.draftSelection = { type: 'rect', x: worldPos.x, y: worldPos.y, width: 0, height: 0 };
    } else {
      this.draftSelection = { type: 'lasso', points: [worldPos] };
    }
    this.renderOverlay();
  }

  updateDraftSelection(worldPos) {
    if (!this.draftSelection) return;
    if (this.draftSelection.type === 'rect') {
      const s = this.draftSelection;
      s.width = worldPos.x - s.x;
      s.height = worldPos.y - s.y;
    } else {
      const pts = this.draftSelection.points;
      const last = pts[pts.length - 1];
      const minDist = 1.2 / this.scale;
      if (Math.hypot(worldPos.x - last.x, worldPos.y - last.y) >= minDist) {
        pts.push(worldPos);
      }
    }
    this.renderOverlay();
  }

  finalizeDraftSelection() {
    const draft = this.draftSelection;
    this.draftSelection = null;
    if (!draft) return;
    if (draft.type === 'rect') {
      const x = draft.width < 0 ? draft.x + draft.width : draft.x;
      const y = draft.height < 0 ? draft.y + draft.height : draft.y;
      const width = Math.abs(draft.width);
      const height = Math.abs(draft.height);
      if (width * this.scale > 8 && height * this.scale > 8) {
        this.selections.push({ type: 'rect', x, y, width, height });
      }
    } else if (draft.type === 'lasso' || draft.type === 'polygon') {
      const pts = draft.points;
      if (pts.length >= 3) {
        const b = this.getStrokesBoundingBox([pts]);
        if ((b.maxX - b.minX) * this.scale > 8 && (b.maxY - b.minY) * this.scale > 8) {
          this.selections.push({ type: draft.type, points: pts });
        }
      }
    }
    this.updateSelectedStrokes();
    this.renderOverlay();
    this.statusEl.setText(this.selections.length ? `${this.selections.length} selection(s) ready` : "Draw or select");
  }

  handlePolygonTap(world) {
    let draft = this.draftSelection;
    if (!draft || draft.type !== 'polygon') {
      this.draftSelection = { type: 'polygon', points: [{ x: world.x, y: world.y }], previewPoint: null };
      this.renderOverlay();
      this.statusEl.setText("Polygon: tap more points, tap the first point to close");
      return;
    }

    draft.previewPoint = null;
    const pts = draft.points;
    const closeDist = 20 / this.scale;
    if (pts.length >= 3 && Math.hypot(world.x - pts[0].x, world.y - pts[0].y) < closeDist) {
      this.draftSelection = null;
      const b = this.getStrokesBoundingBox([pts]);
      if ((b.maxX - b.minX) * this.scale > 8 && (b.maxY - b.minY) * this.scale > 8) {
        this.selections.push({ type: 'polygon', points: pts });
        this.updateSelectedStrokes();
      }
      this.renderOverlay();
      this.statusEl.setText(this.selections.length ? `${this.selections.length} selection(s) ready` : "Draw or select");
    } else {
      pts.push({ x: world.x, y: world.y });
      this.renderOverlay();
      this.statusEl.setText(`Polygon: ${pts.length} points, tap the first point to close`);
    }
  }

  pointInPolygon(x, y, points) {
    let inside = false;
    for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
      const xi = points[i].x, yi = points[i].y;
      const xj = points[j].x, yj = points[j].y;
      if ((yi > y) !== (yj > y) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }
    return inside;
  }

  pointInRect(x, y, r) {
    return x >= r.minX && x <= r.maxX && y >= r.minY && y <= r.maxY;
  }

  orientation(ax, ay, bx, by, cx, cy) {
    const val = (by - ay) * (cx - bx) - (bx - ax) * (cy - by);
    if (Math.abs(val) < 1e-9) return 0;
    return val > 0 ? 1 : 2;
  }

  onSegment(ax, ay, bx, by, cx, cy) {
    return bx <= Math.max(ax, cx) && bx >= Math.min(ax, cx) &&
           by <= Math.max(ay, cy) && by >= Math.min(ay, cy);
  }

  segmentIntersectsSegment(a, b, c, d) {
    const o1 = this.orientation(a.x, a.y, b.x, b.y, c.x, c.y);
    const o2 = this.orientation(a.x, a.y, b.x, b.y, d.x, d.y);
    const o3 = this.orientation(c.x, c.y, d.x, d.y, a.x, a.y);
    const o4 = this.orientation(c.x, c.y, d.x, d.y, b.x, b.y);

    if (o1 !== o2 && o3 !== o4) return true;
    if (o1 === 0 && this.onSegment(a.x, a.y, c.x, c.y, b.x, b.y)) return true;
    if (o2 === 0 && this.onSegment(a.x, a.y, d.x, d.y, b.x, b.y)) return true;
    if (o3 === 0 && this.onSegment(c.x, c.y, a.x, a.y, d.x, d.y)) return true;
    if (o4 === 0 && this.onSegment(c.x, c.y, b.x, b.y, d.x, d.y)) return true;
    return false;
  }

  strokeIntersectsRect(stroke, r) {
    for (let i = 0; i < stroke.length; i++) {
      const p = stroke[i];
      if (this.pointInRect(p.x, p.y, r)) return true;
      if (i > 0) {
        const prev = stroke[i - 1];
        const edges = [
          [{ x: r.minX, y: r.minY }, { x: r.maxX, y: r.minY }],
          [{ x: r.maxX, y: r.minY }, { x: r.maxX, y: r.maxY }],
          [{ x: r.maxX, y: r.maxY }, { x: r.minX, y: r.maxY }],
          [{ x: r.minX, y: r.maxY }, { x: r.minX, y: r.minY }]
        ];
        for (const e of edges) {
          if (this.segmentIntersectsSegment(prev, p, e[0], e[1])) return true;
        }
      }
    }
    return false;
  }

  strokeIntersectsPolygon(stroke, points) {
    for (let i = 0; i < stroke.length; i++) {
      const p = stroke[i];
      if (this.pointInPolygon(p.x, p.y, points)) return true;
      if (i > 0) {
        const prev = stroke[i - 1];
        for (let j = 0, k = points.length - 1; j < points.length; k = j++) {
          if (this.segmentIntersectsSegment(prev, p, points[j], points[k])) return true;
        }
      }
    }
    return false;
  }

  strokesForSelection(sel) {
    const result = [];
    const rect = this.selectionBounds(sel);
    for (const stroke of this.strokes) {
      const b = this.strokeBounds(stroke);
      if (b.maxX < rect.minX || b.minX > rect.maxX || b.maxY < rect.minY || b.minY > rect.maxY) continue;
      if (sel.type === 'rect') {
        if (this.strokeIntersectsRect(stroke, rect)) result.push(stroke);
      } else {
        if (this.strokeIntersectsPolygon(stroke, sel.points)) result.push(stroke);
      }
    }
    return result;
  }

  selectionBounds(sel) {
    if (sel.type === 'rect') {
      return { minX: sel.x, minY: sel.y, maxX: sel.x + sel.width, maxY: sel.y + sel.height };
    }
    return this.getStrokesBoundingBox([sel.points]);
  }

  // ======================================================================
  // Image export (tight auto-crop, white background, selection clipping)
  // ======================================================================
  renderStrokesToDataUrl(strokes, worldBounds, clipSel) {
    if (!strokes || strokes.length === 0) return null;
    const b = worldBounds || this.getStrokesBoundingBox(strokes);
    const pad = (this.settings.tightCropPadding ?? 8) + (this.settings.strokeWidth || 3);
    const minX = b.minX - pad;
    const minY = b.minY - pad;
    const width = Math.max(1, Math.ceil(b.maxX - b.minX + pad * 2));
    const height = Math.max(1, Math.ceil(b.maxY - b.minY + pad * 2));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.translate(-minX, -minY);

    if (clipSel) {
      ctx.beginPath();
      if (clipSel.type === 'rect') {
        ctx.rect(clipSel.x, clipSel.y, clipSel.width, clipSel.height);
      } else {
        const pts = clipSel.points;
        ctx.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
        ctx.closePath();
      }
      ctx.clip();
    }

    this.setupWorldStrokeStyle(ctx);
    for (const stroke of strokes) {
      this.drawStrokePath(ctx, stroke);
    }
    ctx.restore();

    return canvas.toDataURL("image/png");
  }

  getFullCanvasImage() {
    if (this.strokes.length === 0 && this.currentStroke.length === 0) return null;
    const strokes = [...this.strokes];
    if (this.currentStroke.length > 0) strokes.push(this.currentStroke);
    return this.renderStrokesToDataUrl(strokes, null, null);
  }

  getSelectionImage(sel) {
    const strokes = this.strokesForSelection(sel);
    if (strokes.length === 0) return null;
    // Strokes are treated as whole objects: if a stroke intersects the
    // selection it is included in full, even the parts outside the circle.
    // The output image is tight-cropped to the selected strokes' bounds.
    const b = this.getStrokesBoundingBox(strokes);
    return this.renderStrokesToDataUrl(strokes, b, null);
  }

  // ======================================================================
  // Canvas snapshot / restore (for recognition history undo/redo)
  // ======================================================================
  snapshotCanvas() {
    return {
      strokes: this.strokes.map(stroke => stroke.map(p => ({ x: p.x, y: p.y }))),
      selections: this.selections.map(sel => {
        if (sel.type === 'rect') return { type: 'rect', x: sel.x, y: sel.y, width: sel.width, height: sel.height };
        return { type: sel.type || 'lasso', points: sel.points.map(p => ({ x: p.x, y: p.y })) };
      }),
      scale: this.scale,
      offsetX: this.offsetX,
      offsetY: this.offsetY
    };
  }

  restoreCanvasSnapshot(snapshot) {
    if (!snapshot) return;
    this.strokes = (snapshot.strokes || []).map(stroke => stroke.map(p => ({ x: p.x, y: p.y })));
    this.currentStroke = [];
    this.isDrawing = false;
    this.draftSelection = null;
    this.clearActiveLayer();
    this.selections = (snapshot.selections || []).map(sel => {
      if (sel.type === 'rect') return { type: 'rect', x: sel.x, y: sel.y, width: sel.width, height: sel.height };
      return { type: sel.type || 'lasso', points: (sel.points || []).map(p => ({ x: p.x, y: p.y })) };
    });
    if (typeof snapshot.scale === 'number') this.scale = snapshot.scale;
    if (typeof snapshot.offsetX === 'number') this.offsetX = snapshot.offsetX;
    if (typeof snapshot.offsetY === 'number') this.offsetY = snapshot.offsetY;
    this.updateSelectedStrokes();
    this.renderScene();
    this.renderOverlay();
  }

  // ======================================================================
  // Pointer gestures (mouse + touch + pen, pinch zoom/pan)
  // ======================================================================
  bindCanvasEvents(shell) {
    this._shellPointerDown = (e) => this.onCanvasPointerDown(e);
    this._shellPointerMove = (e) => this.onCanvasPointerMove(e);
    this._shellPointerUp = (e) => this.onCanvasPointerUp(e);

    shell.addEventListener("pointerdown", this._shellPointerDown);
    shell.addEventListener("pointermove", this._shellPointerMove);
    shell.addEventListener("pointerup", this._shellPointerUp);
    shell.addEventListener("pointercancel", this._shellPointerUp);

    this._shellWheel = (e) => {
      e.preventDefault();
      const rect = shell.getBoundingClientRect();
      const cssX = e.clientX - rect.left;
      const cssY = e.clientY - rect.top;
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      this.zoomAtCss(cssX, cssY, factor);
    };
    shell.addEventListener("wheel", this._shellWheel, { passive: false });
  }

  bindWindowGestureListeners() {
    this._windowPointerMove = (e) => {
      if (this.activePointers.has(e.pointerId)) this.onCanvasPointerMove(e);
    };
    this._windowPointerUp = (e) => {
      if (this.activePointers.has(e.pointerId)) this.onCanvasPointerUp(e);
    };
    window.addEventListener("pointermove", this._windowPointerMove);
    window.addEventListener("pointerup", this._windowPointerUp);
    window.addEventListener("pointercancel", this._windowPointerUp);
  }

  isToolbarEvent(e) {
    return !!(e.target && e.target.closest && e.target.closest('.toolbar-container, .handwriting-fullscreen-exit'));
  }

  onCanvasPointerDown(e) {
    if (this.isToolbarEvent(e)) return;
    const shell = this.canvasShell;
    const rect = shell.getBoundingClientRect();
    const clientX = e.clientX, clientY = e.clientY;
    const css = { x: clientX - rect.left, y: clientY - rect.top };

    this.activePointers.set(e.pointerId, { clientX, clientY, css });

    if (this.activePointers.size === 1) {
      const world = this.cssToWorld(css.x, css.y);
      if (this.mode === 'pen') {
        this.startStroke(world.x, world.y);
        this._gesture = 'draw';
      } else if (this.mode === 'eraser') {
        this.eraseAt(world);
        this._gesture = 'erase';
      } else if (this.mode === 'hand') {
        this.isPanning = true;
        this._gesture = 'pan';
        this.panStart = { x: css.x, y: css.y };
        this.panStartOffset = { x: this.offsetX, y: this.offsetY };
        shell.style.cursor = "grabbing";
      } else if (this.mode === 'select' || this.mode === 'lasso') {
        this.startDraftSelection(this.mode === 'select' ? 'rect' : 'lasso', world);
        this._gesture = this.mode === 'select' ? 'select-rect' : 'select-lasso';
      } else if (this.mode === 'polygon') {
        this._gesture = 'polygon';
        this.polygonDownPos = { x: css.x, y: css.y };
        this.polygonDragMoved = false;
      }
    } else if (this.activePointers.size === 2) {
      // Two fingers: stop drawing and begin pinch/pan
      if (this.isDrawing) this.endStroke();
      if (this.draftSelection) {
        this.draftSelection = null;
        this.renderOverlay();
      }
      this.isPanning = true;
      this._gesture = 'pinch';
      const pts = Array.from(this.activePointers.values());
      const p1 = pts[0], p2 = pts[1];
      const c1 = { x: p1.clientX - rect.left, y: p1.clientY - rect.top };
      const c2 = { x: p2.clientX - rect.left, y: p2.clientY - rect.top };
      const startCenter = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
      const startDistance = Math.hypot(c1.x - c2.x, c1.y - c2.y);
      this.pinchState = {
        startDistance: Math.max(10, startDistance),
        startScale: this.scale,
        startCenter,
        startOffset: { x: this.offsetX, y: this.offsetY },
        worldAnchor: { x: (startCenter.x - this.offsetX) / this.scale, y: (startCenter.y - this.offsetY) / this.scale }
      };
    }
    e.preventDefault();
  }

  onCanvasPointerMove(e) {
    if (!this.activePointers.has(e.pointerId)) return;
    if (this.isToolbarEvent(e)) return;
    const shell = this.canvasShell;
    const rect = shell.getBoundingClientRect();
    const css = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const ptr = this.activePointers.get(e.pointerId);
    ptr.clientX = e.clientX;
    ptr.clientY = e.clientY;
    ptr.css = css;

    if (this.activePointers.size >= 2 && this._gesture === 'pinch' && this.pinchState) {
      const pts = Array.from(this.activePointers.values());
      const p1 = pts[0], p2 = pts[1];
      const c1 = { x: p1.clientX - rect.left, y: p1.clientY - rect.top };
      const c2 = { x: p2.clientX - rect.left, y: p2.clientY - rect.top };
      const distance = Math.hypot(c1.x - c2.x, c1.y - c2.y);
      const center = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
      const ps = this.pinchState;
      const newScale = Math.max(this.minScale, Math.min(this.maxScale, ps.startScale * (distance / ps.startDistance)));
      this.scale = newScale;
      this.offsetX = center.x - ps.worldAnchor.x * newScale;
      this.offsetY = center.y - ps.worldAnchor.y * newScale;
      this.renderScene();
      this.renderOverlay();
      return;
    }

    if (this.activePointers.size !== 1) return;
    const world = this.cssToWorld(css.x, css.y);

    if (this._gesture === 'draw') {
      this.continueStroke(world.x, world.y);
    } else if (this._gesture === 'erase') {
      if (e.pointerType === 'mouse' && !(e.buttons & 1)) return;
      this.eraseAt(world);
    } else if (this._gesture === 'pan') {
      this.offsetX = this.panStartOffset.x + (css.x - this.panStart.x);
      this.offsetY = this.panStartOffset.y + (css.y - this.panStart.y);
      this.renderScene();
      this.renderOverlay();
    } else if (this._gesture === 'select-rect' || this._gesture === 'select-lasso') {
      this.updateDraftSelection(world);
    } else if (this._gesture === 'polygon') {
      if (this.polygonDownPos) {
        const dragDist = Math.hypot(css.x - this.polygonDownPos.x, css.y - this.polygonDownPos.y);
        if (dragDist > 4) this.polygonDragMoved = true;
      }
      if (this.draftSelection && this.draftSelection.type === 'polygon') {
        this.draftSelection.previewPoint = world;
        this.renderOverlay();
      }
    }
  }

  onCanvasPointerUp(e) {
    if (!this.activePointers.has(e.pointerId)) return;
    this.activePointers.delete(e.pointerId);

    if (this._gesture === 'draw') {
      this.endStroke();
    } else if (this._gesture === 'select-rect' || this._gesture === 'select-lasso') {
      this.finalizeDraftSelection();
    } else if (this._gesture === 'polygon') {
      if (!this.polygonDragMoved) {
        const rect = this.canvasShell.getBoundingClientRect();
        const css = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        this.handlePolygonTap(this.cssToWorld(css.x, css.y));
      } else if (this.draftSelection) {
        this.draftSelection.previewPoint = null;
        this.renderOverlay();
      }
    } else if (this._gesture === 'pan' || this._gesture === 'pinch') {
      this.isPanning = false;
      this.pinchState = null;
      this.canvasShell.style.cursor = this.mode === 'hand' ? "grab" : "crosshair";
    } else if (this._gesture === 'erase') {
      // no-op
    }

    if (this.activePointers.size === 0) {
      this._gesture = null;
      this.isPanning = false;
      this.pinchState = null;
      this.canvasShell.style.cursor = this.mode === 'hand' ? "grab" : (this.mode === 'eraser' ? "pointer" : "crosshair");
    } else if (this.activePointers.size === 1 && this._gesture === 'pinch') {
      // Dropping from two fingers to one: end gesture, do not draw by accident.
      this._gesture = null;
      this.isPanning = false;
      this.pinchState = null;
    }
  }

  // ======================================================================
  // Result panel / slots / history
  // ======================================================================
  toggleResultPanel() {
    const panel = this.contentEl.querySelector(".result-panel");
    if (!panel) return;
    this.resultExpanded = !this.resultExpanded;
    panel.toggleClass("expanded", this.resultExpanded);
    if (this.resultExpanded) {
      if (this.resultUserHeight && this.resultUserHeight > 60) {
        panel.style.maxHeight = this.resultUserHeight + "px";
      } else {
        panel.style.maxHeight = "";
      }
    } else {
      panel.style.maxHeight = "";
    }
  }

  bindResultPanelDrag(handle, panel) {
    let isDragging = false;
    let dragStartY = 0;
    let dragStartHeight = 0;
    let hasMoved = false;
    let pendingDragY = null;
    const DRAG_THRESHOLD = 5;

    const onStart = (clientY) => {
      isDragging = true;
      hasMoved = false;
      dragStartY = clientY;
      const rect = panel.getBoundingClientRect();
      dragStartHeight = rect.height;
      handle.style.cursor = "grabbing";
      panel.style.transition = "none";
    };
    const onMove = (clientY) => {
      if (!isDragging) return;
      const dy = dragStartY - clientY;
      if (Math.abs(dy) > DRAG_THRESHOLD) hasMoved = true;
      if (!hasMoved) return;
      const newHeight = Math.max(36, Math.min(window.innerHeight * 0.85, dragStartHeight + dy));
      panel.style.maxHeight = newHeight + "px";
      if (newHeight > 60) {
        panel.classList.add("expanded");
        this.resultExpanded = true;
      } else {
        panel.classList.remove("expanded");
        this.resultExpanded = false;
      }
    };
    const onEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      handle.style.cursor = "";
      requestAnimationFrame(() => { panel.style.transition = ""; });
      if (hasMoved) {
        handle.setAttribute("data-dragged", "true");
        const rect = panel.getBoundingClientRect();
        this.resultUserHeight = rect.height;
      }
    };

    const onMouseMove = (e) => {
      if (isDragging) { e.preventDefault(); onMove(e.clientY); }
    };
    const onTouchMove = (e) => {
      if (pendingDragY !== null && e.touches.length === 1) {
        const dy = pendingDragY - e.touches[0].clientY;
        if (Math.abs(dy) > DRAG_THRESHOLD) {
          if (!isDragging) {
            e.preventDefault();
            onStart(pendingDragY);
            pendingDragY = null;
          }
        }
      }
      if (isDragging && e.touches.length === 1) {
        e.preventDefault();
        onMove(e.touches[0].clientY);
      }
    };
    const onTouchEnd = (e) => {
      pendingDragY = null;
      onEnd();
    };

    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      onStart(e.clientY);
    });
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("mouseup", onEnd);

    handle.addEventListener("touchstart", (e) => {
      if (e.touches.length === 1) {
        pendingDragY = e.touches[0].clientY;
        dragStartY = e.touches[0].clientY;
        hasMoved = false;
      }
    }, { passive: true });
    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    document.addEventListener("touchcancel", onTouchEnd);

    this._cleanupResultPanelDrag = () => {
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("mouseup", onEnd);
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
      document.removeEventListener("touchcancel", onTouchEnd);
    };
  }

  createResultSlot(label) {
    const id = "job" + (++this.jobCounter) + "_" + Date.now().toString(36);
    const card = this.resultsList.createDiv({ cls: "result-slot" });
    card.setAttr("data-job-id", id);

    const header = card.createDiv({ cls: "result-slot-header" });
    const labelEl = header.createEl("span", { text: label, cls: "result-slot-label" });
    const statusEl = header.createEl("span", { text: "Queued…", cls: "result-slot-status" });

    const body = card.createDiv({ cls: "result-slot-body" });
    const latexEl = body.createEl("code", { text: "", cls: "result-slot-latex" });

    const actions = card.createDiv({ cls: "result-slot-actions" });
    const insertBtn = actions.createEl("button", { text: "✅ Insert", cls: "result-slot-btn", attr: { disabled: "true" } });
    insertBtn.addEventListener("click", () => {
      const latex = latexEl.getAttr("data-latex");
      if (latex) this.insertLatex(latex);
    });

    const slot = { id, label, card, labelEl, statusEl, latexEl, insertBtn };
    this.resultSlots.set(id, slot);
    this.resultsList.scrollTop = this.resultsList.scrollHeight;
    return id;
  }

  setResultSlotStatus(id, text) {
    const slot = this.resultSlots.get(id);
    if (!slot) return;
    slot.statusEl.setText(text);
    slot.card.toggleClass("is-error", text.toLowerCase().startsWith("error"));
  }

  setResultSlotResult(id, latex) {
    const slot = this.resultSlots.get(id);
    if (!slot) return;
    slot.latexEl.setText(latex || "(empty)");
    slot.latexEl.setAttr("data-latex", latex || "");
    slot.card.toggleClass("is-error", false);
    slot.statusEl.setText(latex ? "Done ✓" : "Empty result");
    if (latex) {
      slot.insertBtn.removeAttribute("disabled");
      slot.card.toggleClass("is-done", true);
    } else {
      slot.card.toggleClass("is-error", true);
    }
    this.resultsList.scrollTop = this.resultsList.scrollHeight;
  }

  loadResultIntoPreview(latex) {
    this.resultEl.setText(latex || "(No result yet)");
    this.resultEl.setAttr("data-latex", latex || "");
    if (window.innerWidth <= 768) {
      const panel = this.contentEl.querySelector(".result-panel");
      if (panel) {
        panel.classList.add("expanded");
        this.resultExpanded = true;
      }
    }
  }

  updateHistoryUI() {
    const idx = this.plugin.historyIndex;
    const len = this.plugin.history.length;
    if (this.prevHistoryBtn) this.prevHistoryBtn.toggleClass("disabled", idx <= 0);
    if (this.nextHistoryBtn) this.nextHistoryBtn.toggleClass("disabled", idx >= len - 1);
    if (this.historyCounter) this.historyCounter.setText(len > 0 ? `${idx + 1}/${len}` : "0/0");
  }

  navigateHistory(delta) {
    const newIndex = this.plugin.historyIndex + delta;
    if (newIndex < 0 || newIndex >= this.plugin.history.length) return;
    this.plugin.historyIndex = newIndex;
    const entry = this.plugin.history[newIndex];
    if (entry && entry.canvasSnapshot) {
      this.restoreCanvasSnapshot(entry.canvasSnapshot);
    }
    const latex = entry ? entry.latex : "";
    this.loadResultIntoPreview(latex || "(No result yet)");
    this.statusEl.setText(`History: ${newIndex + 1}/${this.plugin.history.length}`);
    this.updateHistoryUI();
  }

  saveToHistory(entry) {
    if (!entry || !entry.latex) return;
    const maxSize = this.settings.maxHistorySize ?? 30;
    if (maxSize === 0) return;
    if (this.plugin.historyIndex < this.plugin.history.length - 1) {
      this.plugin.history = this.plugin.history.slice(0, this.plugin.historyIndex + 1);
    }
    this.plugin.history.push(entry);
    if (this.plugin.history.length > maxSize) {
      this.plugin.history.shift();
    }
    this.plugin.historyIndex = this.plugin.history.length - 1;
    this.updateHistoryUI();
  }

  insertLatex(latex) {
    if (!latex) {
      new Notice("No LaTeX to insert. Please recognize first.");
      return;
    }
    if (!this.editor) {
      new Notice("No editor available to insert into.");
      return;
    }
    let textToInsert;
    if (this.mathMode === "inline") {
      textToInsert = "$" + latex + "$";
    } else if (this.mathMode === "display") {
      textToInsert = "$$" + latex + "$$";
    } else {
      textToInsert = latex;
    }
    // On mobile the underlying editor may lose focus while the modal is
    // open, so prefer the cursor captured when the modal was opened.
    let cursor = this._openCursor;
    if (!cursor) {
      try { cursor = this.editor.getCursor(); } catch (e) { cursor = { line: 0, ch: 0 }; }
    }

    this.editor.replaceRange(textToInsert, cursor);
    let newCursor;
    try {
      newCursor = this.editor.offsetToPos(cursor, textToInsert.length);
    } catch (e) {
      newCursor = null;
    }
    if (!newCursor) newCursor = { line: cursor.line, ch: cursor.ch + textToInsert.length };
    this.editor.setCursor(newCursor);

    // Keep the inserted position visible instead of letting the mobile
    // markdown view jump back to the top after the modal closes.
    try { this.editor.scrollIntoView({ from: newCursor, to: newCursor }, true); } catch (e) {}
    new Notice("LaTeX inserted!");
    this.close();

    setTimeout(() => {
      try {
        this.editor.scrollIntoView({ from: newCursor, to: newCursor }, true);
      } catch (e) {}
    }, 60);
  }

  insertAndClose() {
    const latex = this.resultEl.getAttr("data-latex");
    this.insertLatex(latex);
  }

  // ======================================================================
  // Recognition orchestration (concurrent jobs)
  // ======================================================================
  recognizeFormula() {
    if (this.isDrawing) this.endStroke();
    if (this.strokes.length === 0 && this.currentStroke.length === 0) {
      new Notice("Please draw something first!");
      return;
    }

    // Capture one canvas snapshot for this recognition round (shared by all jobs).
    const snapshot = this.snapshotCanvas();
    const validSelections = this.selections.filter(sel => {
      if (sel.type === 'rect') return sel.width > 0 && sel.height > 0;
      return sel.points && sel.points.length >= 3;
    });

    if (validSelections.length === 0) {
      const dataUrl = this.getFullCanvasImage();
      if (!dataUrl) {
        new Notice("Nothing to recognize");
        return;
      }
      this.startCanvasRecognitionJob(dataUrl, snapshot, null, "Canvas");
      this.statusEl.setText("Recognition started…");
      return;
    }

    // Each selection is recognized independently and concurrently.
    let started = 0;
    for (let i = 0; i < validSelections.length; i++) {
      const sel = validSelections[i];
      const dataUrl = this.getSelectionImage(sel);
      if (!dataUrl) continue;
      this.startCanvasRecognitionJob(dataUrl, snapshot, sel, `Canvas S${started + 1}`);
      started++;
    }
    if (started === 0) {
      new Notice("Selected regions contain no strokes");
      this.statusEl.setText("No strokes in selection");
    } else {
      this.statusEl.setText(`${started} recognition job(s) started`);
    }
  }

  startCanvasRecognitionJob(dataUrl, snapshot, selection, label) {
    const slotId = this.createResultSlot(label);
    this.setResultSlotStatus(slotId, "Recognizing…");
    const run = async () => {
      try {
        const imageBase64 = dataUrl.split(",")[1];
        this.setResultSlotStatus(slotId, "Uploading…");
        let latex = await this.dispatchRecognize(imageBase64);
        latex = this.cleanLatex(typeof latex === "string" ? latex : "");
        this.setResultSlotResult(slotId, latex);
        this.loadResultIntoPreview(latex);
        this.saveToHistory({
          latex,
          canvasSnapshot: snapshot,
          source: "canvas",
          selection: selection ? { type: selection.type, x: selection.x, y: selection.y, width: selection.width, height: selection.height, points: selection.points } : null,
          time: Date.now()
        });
        this.statusEl.setText("Recognition complete!");
      } catch (error) {
        this.setResultSlotStatus(slotId, "Error: " + error.message);
        this.statusEl.setText("Error: " + error.message);
        new Notice("Recognition failed: " + error.message);
        console.error(error);
      }
    };
    run();
  }

  async recognizeImage(base64DataUrl) {
    // Used by the crop overlay / album flow.
    const snapshot = this.snapshotCanvas();
    const slotId = this.createResultSlot("Image");
    this.setResultSlotStatus(slotId, "Recognizing…");
    this.statusEl.setText("Recognizing image…");
    try {
      const imageBase64 = base64DataUrl.split(",")[1];
      this.setResultSlotStatus(slotId, "Uploading…");
      let latex = await this.dispatchRecognize(imageBase64);
      latex = this.cleanLatex(typeof latex === "string" ? latex : "");
      this.setResultSlotResult(slotId, latex);
      this.loadResultIntoPreview(latex);
      this.saveToHistory({
        latex,
        canvasSnapshot: snapshot,
        source: "image",
        selection: null,
        time: Date.now()
      });
      this.statusEl.setText("Image recognition complete!");
    } catch (error) {
      this.setResultSlotStatus(slotId, "Error: " + error.message);
      this.statusEl.setText("Error: " + error.message);
      new Notice("Image recognition failed: " + error.message);
      console.error(error);
    }
  }

  // ======================================================================
  // Cropper overlay (rotate, enhance, auto tight crop)
  // ======================================================================
  showCropper(dataUrl) {
    this.cropperEnhance = this.settings.imageEnhancement || "none";
    if (this.cropperEnhanceSelect) this.cropperEnhanceSelect.value = this.cropperEnhance;
    this.cropperSelectionData = null;
    this.cropperSelection.style.display = "none";
    this.cropperBaseCanvas = null;
    this._cropperIgnoreNextLoad = false;
    this._cropperClearSelectionOnLoad = true;
    this.cropperImage.src = dataUrl;
    this.cropperOverlay.style.display = "flex";
    this.body.style.display = "none";
    this.header.style.display = "none";
    const footer = this.contentEl.querySelector(".handwriting-footer");
    if (footer) footer.style.display = "none";
    this.cropperOverlayVisible = true;
  }

  initCropperFromCurrentImage() {
    const img = this.cropperImage;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    if (!imgW || !imgH) {
      requestAnimationFrame(() => this.initCropperFromCurrentImage());
      return;
    }
    // Downscale very large photos before the crop window. Formula OCR does
    // not need 4000px+ originals, and this keeps filters/masks/rotation fast
    // on phones. Crop/recognition then use this optimized working image.
    const MAX_DIM = 1600;
    const scaleDown = Math.min(1, MAX_DIM / Math.max(imgW, imgH));
    const base = document.createElement("canvas");
    base.width = Math.max(1, Math.round(imgW * scaleDown));
    base.height = Math.max(1, Math.round(imgH * scaleDown));
    const baseCtx = base.getContext("2d");
    baseCtx.drawImage(img, 0, 0, base.width, base.height);
    this.cropperBaseCanvas = base;
    this.syncCropperDisplay();
  }

  syncCropperDisplay() {
    if (!this.cropperBaseCanvas) return;
    const base = this.cropperBaseCanvas;
    const out = document.createElement("canvas");
    out.width = base.width;
    out.height = base.height;
    const ctx = out.getContext("2d");
    ctx.drawImage(base, 0, 0);

    if (this.cropperEnhance && this.cropperEnhance !== 'none') {
      const enhanced = this.applyImageEnhancement(out, this.cropperEnhance);
      this._cropperIgnoreNextLoad = true;
      this.cropperImage.src = enhanced.toDataURL("image/png");
    } else {
      this._cropperIgnoreNextLoad = true;
      this.cropperImage.src = out.toDataURL("image/png");
    }
  }

  setCropperEnhance(mode) {
    this.cropperEnhance = mode;
    this.syncCropperDisplay();
  }

  rotateCropperImage(clockwise) {
    if (!this.cropperBaseCanvas) return;
    const src = this.cropperBaseCanvas;
    const out = document.createElement("canvas");
    out.width = src.height;
    out.height = src.width;
    const ctx = out.getContext("2d");
    ctx.translate(out.width / 2, out.height / 2);
    ctx.rotate(clockwise ? Math.PI / 2 : -Math.PI / 2);
    ctx.drawImage(src, -src.width / 2, -src.height / 2);
    this.cropperBaseCanvas = out;
    this.cropperSelectionData = null;
    this.cropperSelection.style.display = "none";
    this._cropperClearSelectionOnLoad = true;
    this.syncCropperDisplay();
  }

  hideCropper() {
    this.cropperOverlayVisible = false;
    this.cropperOverlay.style.display = "none";
    this.body.style.display = "flex";
    this.header.style.display = "flex";
    const footer = this.contentEl.querySelector(".handwriting-footer");
    if (footer) footer.style.display = "";
  }

  initCropperView() {
    const wrapper = this.cropperWrapper;
    const img = this.cropperImage;
    const imgW = img.naturalWidth;
    const imgH = img.naturalHeight;
    if (!imgW || !imgH || !wrapper) {
      requestAnimationFrame(() => this.initCropperView());
      return;
    }
    const wrapW = wrapper.clientWidth;
    const wrapH = wrapper.clientHeight;
    if (!wrapW || !wrapH) {
      requestAnimationFrame(() => this.initCropperView());
      return;
    }
    img.style.width = imgW + "px";
    img.style.height = imgH + "px";
    const scaleX = wrapW / imgW;
    const scaleY = wrapH / imgH;
    this.cropperImageScale = Math.min(scaleX, scaleY, 1);
    const displayW = imgW * this.cropperImageScale;
    const displayH = imgH * this.cropperImageScale;
    this.cropperImageOffsetX = (wrapW - displayW) / 2;
    this.cropperImageOffsetY = (wrapH - displayH) / 2;
    this.applyCropperTransform();
  }

  applyCropperTransform() {
    this.cropperImage.style.transform = `translate(${this.cropperImageOffsetX}px, ${this.cropperImageOffsetY}px) scale(${this.cropperImageScale})`;
    this.cropperImage.style.transformOrigin = "0 0";
    this.updateSelectionDisplay();
    this.updateCropperMask();
  }

  scheduleCropperTransform() {
    if (this._cropperRafPending) return;
    this._cropperRafPending = true;
    requestAnimationFrame(() => {
      this._cropperRafPending = false;
      if (!this.cropperOverlayVisible) return;
      this.applyCropperTransform();
    });
  }

  screenToImagePixel(screenX, screenY) {
    const rect = this.cropperWrapper.getBoundingClientRect();
    const x = screenX - rect.left;
    const y = screenY - rect.top;
    return {
      x: (x - this.cropperImageOffsetX) / this.cropperImageScale,
      y: (y - this.cropperImageOffsetY) / this.cropperImageScale
    };
  }

  imagePixelToScreen(imgX, imgY) {
    return {
      x: imgX * this.cropperImageScale + this.cropperImageOffsetX,
      y: imgY * this.cropperImageScale + this.cropperImageOffsetY
    };
  }

  updateSelectionDisplay() {
    if (!this.cropperSelectionData) {
      this.cropperSelection.style.display = "none";
      return;
    }
    const { x, y, width, height } = this.cropperSelectionData;
    const topLeft = this.imagePixelToScreen(x, y);
    const bottomRight = this.imagePixelToScreen(x + width, y + height);
    this.cropperSelection.style.left = topLeft.x + "px";
    this.cropperSelection.style.top = topLeft.y + "px";
    this.cropperSelection.style.width = Math.max(0, bottomRight.x - topLeft.x) + "px";
    this.cropperSelection.style.height = Math.max(0, bottomRight.y - topLeft.y) + "px";
    this.cropperSelection.style.display = "block";
    if (this.cropperInfoEl) {
      this.cropperInfoEl.textContent = `${Math.round(width)}×${Math.round(height)} px`;
    }
  }

  updateCropperMask() {
    const wrapper = this.cropperWrapper;
    const wrapW = wrapper.clientWidth;
    const wrapH = wrapper.clientHeight;
    if (!wrapW || !wrapH) return;

    if (!this.cropperSelectionData || this.cropperSelection.style.display === "none") {
      this.cropperMaskTop.style.display = "block";
      this.cropperMaskTop.style.left = "0px"; this.cropperMaskTop.style.top = "0px";
      this.cropperMaskTop.style.width = wrapW + "px"; this.cropperMaskTop.style.height = wrapH + "px";
      this.cropperMaskBottom.style.display = "none";
      this.cropperMaskLeft.style.display = "none";
      this.cropperMaskRight.style.display = "none";
      return;
    }

    const sel = this.cropperSelectionData;
    const tl = this.imagePixelToScreen(sel.x, sel.y);
    const br = this.imagePixelToScreen(sel.x + sel.width, sel.y + sel.height);
    const left = Math.max(0, tl.x);
    const top = Math.max(0, tl.y);
    const right = Math.min(wrapW, br.x);
    const bottom = Math.min(wrapH, br.y);
    const width = Math.max(0, right - left);
    const height = Math.max(0, bottom - top);

    if (width <= 0 || height <= 0) {
      this.cropperMaskTop.style.display = "block";
      this.cropperMaskTop.style.left = "0px"; this.cropperMaskTop.style.top = "0px";
      this.cropperMaskTop.style.width = wrapW + "px"; this.cropperMaskTop.style.height = wrapH + "px";
      this.cropperMaskBottom.style.display = "none";
      this.cropperMaskLeft.style.display = "none";
      this.cropperMaskRight.style.display = "none";
      return;
    }

    this.cropperMaskTop.style.display = "block";
    this.cropperMaskTop.style.left = "0px"; this.cropperMaskTop.style.top = "0px";
    this.cropperMaskTop.style.width = wrapW + "px"; this.cropperMaskTop.style.height = top + "px";

    this.cropperMaskBottom.style.display = "block";
    this.cropperMaskBottom.style.left = "0px"; this.cropperMaskBottom.style.top = bottom + "px";
    this.cropperMaskBottom.style.width = wrapW + "px"; this.cropperMaskBottom.style.height = (wrapH - bottom) + "px";

    this.cropperMaskLeft.style.display = "block";
    this.cropperMaskLeft.style.left = "0px"; this.cropperMaskLeft.style.top = top + "px";
    this.cropperMaskLeft.style.width = left + "px"; this.cropperMaskLeft.style.height = height + "px";

    this.cropperMaskRight.style.display = "block";
    this.cropperMaskRight.style.left = right + "px"; this.cropperMaskRight.style.top = top + "px";
    this.cropperMaskRight.style.width = (wrapW - right) + "px"; this.cropperMaskRight.style.height = height + "px";
  }

  selectAllCropper() {
    if (!this.cropperImage.naturalWidth) return;
    this.cropperSelectionData = {
      x: 0,
      y: 0,
      width: this.cropperImage.naturalWidth,
      height: this.cropperImage.naturalHeight
    };
    this.updateSelectionDisplay();
    this.updateCropperMask();
  }

  clearCropperSelection() {
    this.cropperSelectionData = null;
    this.cropperSelection.style.display = "none";
    this.updateCropperMask();
    if (this.cropperInfoEl) this.cropperInfoEl.textContent = "";
  }

  bindCropperEvents() {
    const wrapper = this.cropperWrapper;
    let isDragging = false;
    let dragMode = null; // 'resize' | 'move' | 'select' | 'pinch'
    let resizeHandle = null;
    let startPos = null;
    let startImagePos = null;
    let startSelection = null;
    let selectStartPos = null;
    let selectStartImagePos = null;
    let hasMovedEnough = false;
    let touchStartDistance = 0;
    let touchStartScale = 1;
    let touchStartOffset = null;
    const activeTouches = new Map();

    const getPos = (e) => {
      const rect = wrapper.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top, clientX, clientY };
    };

    const getHandleAt = (screenX, screenY) => {
      if (!this.cropperSelectionData) return null;
      const sel = this.cropperSelectionData;
      const tl = this.imagePixelToScreen(sel.x, sel.y);
      const br = this.imagePixelToScreen(sel.x + sel.width, sel.y + sel.height);
      const handleSize = window.innerWidth <= 768 ? 44 : 20;
      const half = handleSize / 2;
      const handles = [
        { name: 'nw', x: tl.x, y: tl.y },
        { name: 'ne', x: br.x, y: tl.y },
        { name: 'sw', x: tl.x, y: br.y },
        { name: 'se', x: br.x, y: br.y },
        { name: 'n', x: (tl.x + br.x) / 2, y: tl.y },
        { name: 's', x: (tl.x + br.x) / 2, y: br.y },
        { name: 'w', x: tl.x, y: (tl.y + br.y) / 2 },
        { name: 'e', x: br.x, y: (tl.y + br.y) / 2 },
      ];
      for (const h of handles) {
        if (Math.abs(screenX - h.x) < half && Math.abs(screenY - h.y) < half) return h.name;
      }
      return null;
    };

    const isInsideSelection = (screenX, screenY) => {
      if (!this.cropperSelectionData) return false;
      const sel = this.cropperSelectionData;
      const tl = this.imagePixelToScreen(sel.x, sel.y);
      const br = this.imagePixelToScreen(sel.x + sel.width, sel.y + sel.height);
      return screenX >= tl.x && screenX <= br.x && screenY >= tl.y && screenY <= br.y;
    };

    const onStart = (e) => {
      if (e.type === 'touchstart') {
        for (let i = 0; i < e.touches.length; i++) {
          activeTouches.set(e.touches[i].identifier, { x: e.touches[i].clientX, y: e.touches[i].clientY });
        }
      }
      if (e.touches && e.touches.length === 2) {
        e.preventDefault();
        isDragging = true;
        dragMode = 'pinch';
        const t1 = e.touches[0], t2 = e.touches[1];
        touchStartDistance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        touchStartScale = this.cropperImageScale;
        touchStartOffset = { x: this.cropperImageOffsetX, y: this.cropperImageOffsetY };
        return;
      }

      const pos = getPos(e);
      const handle = getHandleAt(pos.x, pos.y);
      if (handle) {
        e.preventDefault();
        e.stopPropagation();
        isDragging = true;
        dragMode = 'resize';
        resizeHandle = handle;
        startPos = pos;
        startSelection = { ...this.cropperSelectionData };
        return;
      }
      if (isInsideSelection(pos.x, pos.y)) {
        e.preventDefault();
        isDragging = true;
        dragMode = 'move';
        startPos = pos;
        startSelection = { ...this.cropperSelectionData };
        startImagePos = this.screenToImagePixel(pos.clientX, pos.clientY);
        wrapper.style.cursor = "move";
        return;
      }
      e.preventDefault();
      isDragging = true;
      dragMode = 'select';
      selectStartPos = { x: pos.x, y: pos.y, clientX: pos.clientX, clientY: pos.clientY };
      selectStartImagePos = this.screenToImagePixel(pos.clientX, pos.clientY);
      hasMovedEnough = false;
      if (this.cropperSelectionData) {
        this.cropperSelectionData = null;
        this.cropperSelection.style.display = "none";
        this.updateCropperMask();
      }
    };

    const onMove = (e) => {
      if (!isDragging) return;
      if (e.type === 'touchmove') {
        for (let i = 0; i < e.touches.length; i++) {
          activeTouches.set(e.touches[i].identifier, { x: e.touches[i].clientX, y: e.touches[i].clientY });
        }
      }
      if (dragMode === 'pinch' && e.touches && e.touches.length === 2) {
        e.preventDefault();
        const t1 = e.touches[0], t2 = e.touches[1];
        const distance = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
        if (touchStartDistance > 0) {
          this.cropperImageScale = Math.max(0.1, Math.min(5, touchStartScale * (distance / touchStartDistance)));
        }
        const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
        const rect = wrapper.getBoundingClientRect();
        const centerX = center.x - rect.left;
        const centerY = center.y - rect.top;
        const worldCenterX = (centerX - touchStartOffset.x) / touchStartScale;
        const worldCenterY = (centerY - touchStartOffset.y) / touchStartScale;
        this.cropperImageOffsetX = centerX - worldCenterX * this.cropperImageScale;
        this.cropperImageOffsetY = centerY - worldCenterY * this.cropperImageScale;
        this.scheduleCropperTransform();
        return;
      }
      if (dragMode === 'pinch') return;

      e.preventDefault();
      const pos = getPos(e);
      const currentImagePos = this.screenToImagePixel(pos.clientX, pos.clientY);

      if (dragMode === 'select') {
        const dx = pos.x - selectStartPos.x;
        const dy = pos.y - selectStartPos.y;
        if (Math.hypot(dx, dy) > 5) {
          const x = Math.min(selectStartImagePos.x, currentImagePos.x);
          const y = Math.min(selectStartImagePos.y, currentImagePos.y);
          const width = Math.abs(currentImagePos.x - selectStartImagePos.x);
          const height = Math.abs(currentImagePos.y - selectStartImagePos.y);
          this.cropperSelectionData = { x, y, width, height };
          this.cropperSelection.style.display = "block";
          hasMovedEnough = true;
          this.scheduleCropperTransform();
        }
        return;
      }

      if (dragMode === 'move') {
        const dx = currentImagePos.x - startImagePos.x;
        const dy = currentImagePos.y - startImagePos.y;
        this.cropperSelectionData = {
          x: startSelection.x + dx,
          y: startSelection.y + dy,
          width: startSelection.width,
          height: startSelection.height
        };
        this.scheduleCropperTransform();
      } else if (dragMode === 'resize' && resizeHandle) {
        let { x, y, width, height } = startSelection;
        switch (resizeHandle) {
          case 'nw':
            x = Math.min(currentImagePos.x, startSelection.x + startSelection.width);
            y = Math.min(currentImagePos.y, startSelection.y + startSelection.height);
            width = Math.abs(startSelection.x + startSelection.width - currentImagePos.x);
            height = Math.abs(startSelection.y + startSelection.height - currentImagePos.y);
            break;
          case 'ne':
            x = startSelection.x;
            y = Math.min(currentImagePos.y, startSelection.y + startSelection.height);
            width = Math.abs(currentImagePos.x - startSelection.x);
            height = Math.abs(startSelection.y + startSelection.height - currentImagePos.y);
            break;
          case 'sw':
            x = Math.min(currentImagePos.x, startSelection.x + startSelection.width);
            y = startSelection.y;
            width = Math.abs(startSelection.x + startSelection.width - currentImagePos.x);
            height = Math.abs(currentImagePos.y - startSelection.y);
            break;
          case 'se':
            x = startSelection.x;
            y = startSelection.y;
            width = Math.abs(currentImagePos.x - startSelection.x);
            height = Math.abs(currentImagePos.y - startSelection.y);
            break;
          case 'n':
            y = Math.min(currentImagePos.y, startSelection.y + startSelection.height);
            height = Math.abs(startSelection.y + startSelection.height - currentImagePos.y);
            break;
          case 's':
            height = Math.abs(currentImagePos.y - startSelection.y);
            break;
          case 'w':
            x = Math.min(currentImagePos.x, startSelection.x + startSelection.width);
            width = Math.abs(startSelection.x + startSelection.width - currentImagePos.x);
            break;
          case 'e':
            width = Math.abs(currentImagePos.x - startSelection.x);
            break;
        }
        this.cropperSelectionData = { x, y, width, height };
        this.scheduleCropperTransform();
      }
    };

    const onEnd = (e) => {
      if (e.type === 'touchend' || e.type === 'touchcancel') {
        for (let i = 0; i < e.changedTouches.length; i++) {
          activeTouches.delete(e.changedTouches[i].identifier);
        }
        if (activeTouches.size > 0) return;
      }
      isDragging = false;
      if (dragMode === 'select') {
        if (!hasMovedEnough || !this.cropperSelectionData || this.cropperSelectionData.width < 5 || this.cropperSelectionData.height < 5) {
          this.cropperSelectionData = null;
          this.cropperSelection.style.display = "none";
          this.updateCropperMask();
        }
      }
      dragMode = null;
      resizeHandle = null;
      wrapper.style.cursor = "";
      activeTouches.clear();
    };

    wrapper.addEventListener("mousedown", onStart);
    wrapper.addEventListener("mousemove", onMove);
    wrapper.addEventListener("mouseup", onEnd);
    wrapper.addEventListener("mouseleave", onEnd);
    wrapper.addEventListener("touchstart", onStart, { passive: false });
    wrapper.addEventListener("touchmove", onMove, { passive: false });
    wrapper.addEventListener("touchend", onEnd);
    wrapper.addEventListener("touchcancel", onEnd);

    wrapper.addEventListener("wheel", (e) => {
      e.preventDefault();
      const factor = e.deltaY > 0 ? 0.9 : 1.1;
      const rect = wrapper.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      const worldX = (mouseX - this.cropperImageOffsetX) / this.cropperImageScale;
      const worldY = (mouseY - this.cropperImageOffsetY) / this.cropperImageScale;
      this.cropperImageScale = Math.max(0.1, Math.min(5, this.cropperImageScale * factor));
      this.cropperImageOffsetX = mouseX - worldX * this.cropperImageScale;
      this.cropperImageOffsetY = mouseY - worldY * this.cropperImageScale;
      this.scheduleCropperTransform();
    }, { passive: false });
  }

  confirmCropAndRecognize() {
    if (!this.cropperImage || !this.cropperImage.naturalWidth) {
      new Notice("Image not ready");
      return;
    }
    const imgW = this.cropperImage.naturalWidth;
    const imgH = this.cropperImage.naturalHeight;
    let sourceX = 0, sourceY = 0, sourceW = imgW, sourceH = imgH;

    if (this.cropperSelectionData) {
      const sel = this.cropperSelectionData;
      sourceX = Math.max(0, Math.round(sel.x));
      sourceY = Math.max(0, Math.round(sel.y));
      sourceW = Math.min(imgW - sourceX, Math.round(sel.width));
      sourceH = Math.min(imgH - sourceY, Math.round(sel.height));
    }

    if (sourceW <= 0 || sourceH <= 0) {
      new Notice("Invalid selection");
      return;
    }

    // Crop from the displayed (possibly enhanced/rotated) image.
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = sourceW;
    tempCanvas.height = sourceH;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(this.cropperImage, sourceX, sourceY, sourceW, sourceH, 0, 0, sourceW, sourceH);

    // Automatic tight crop (remove blank margins) before sending.
    const tight = this.tightCropCanvas(tempCanvas, (this.settings.tightCropPadding ?? 8));
    const finalCanvas = tight || tempCanvas;
    const dataUrl = finalCanvas.toDataURL("image/png");

    this.hideCropper();
    this.recognizeImage(dataUrl);
  }

  // ======================================================================
  // Image processing helpers
  // ======================================================================
  tightCropCanvas(canvas, padding = 8) {
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    if (!w || !h) return null;
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, w, h);
    } catch (e) {
      return null;
    }
    const data = imageData.data;
    const tolerance = 248;
    let minX = w, minY = h, maxX = -1, maxY = -1;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
        if (a > 0 && !(r >= tolerance && g >= tolerance && b >= tolerance)) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    if (maxX < minX || maxY < minY) return null;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(w - 1, maxX + padding);
    maxY = Math.min(h - 1, maxY + padding);

    const cropW = maxX - minX + 1;
    const cropH = maxY - minY + 1;
    const out = document.createElement("canvas");
    out.width = cropW;
    out.height = cropH;
    const outCtx = out.getContext("2d");
    outCtx.fillStyle = "#ffffff";
    outCtx.fillRect(0, 0, cropW, cropH);
    outCtx.drawImage(canvas, minX, minY, cropW, cropH, 0, 0, cropW, cropH);
    return out;
  }

  applyImageEnhancement(canvas, mode) {
    const w = canvas.width;
    const h = canvas.height;
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    const outCtx = out.getContext("2d");
    let srcCtx;
    try {
      srcCtx = canvas.getContext("2d");
    } catch (e) {
      return canvas;
    }
    let imageData;
    try {
      imageData = srcCtx.getImageData(0, 0, w, h);
    } catch (e) {
      return canvas;
    }
    const data = imageData.data;

    if (mode === 'grayscale' || mode === 'auto' || mode === 'binarize') {
      for (let i = 0; i < data.length; i += 4) {
        const gray = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
        data[i] = data[i + 1] = data[i + 2] = gray;
      }
    }

    if (mode === 'auto') {
      // Auto contrast stretch on grayscale luminance.
      let min = 255, max = 0;
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i];
        if (v < min) min = v;
        if (v > max) max = v;
      }
      if (max > min) {
        const range = max - min;
        for (let i = 0; i < data.length; i += 4) {
          const v = Math.round(((data[i] - min) / range) * 255);
          data[i] = data[i + 1] = data[i + 2] = v;
        }
      }
      outCtx.putImageData(imageData, 0, 0);
      // Light sharpen after contrast stretch (3x3 kernel).
      return this.applySharpenCanvas(out);
    }

    if (mode === 'sharpen') {
      return this.applySharpenCanvas(canvas);
    }

    if (mode === 'binarize') {
      // Otsu threshold on grayscale.
      const histogram = new Array(256).fill(0);
      for (let i = 0; i < data.length; i += 4) histogram[data[i]]++;
      const total = w * h;
      let sum = 0;
      for (let i = 0; i < 256; i++) sum += i * histogram[i];
      let sumB = 0, wB = 0, maxVar = 0, threshold = 128;
      for (let t = 0; t < 256; t++) {
        wB += histogram[t];
        if (wB === 0) continue;
        const wF = total - wB;
        if (wF === 0) break;
        sumB += t * histogram[t];
        const mB = sumB / wB;
        const mF = (sum - sumB) / wF;
        const varianceBetween = wB * wF * (mB - mF) * (mB - mF);
        if (varianceBetween > maxVar) {
          maxVar = varianceBetween;
          threshold = t;
        }
      }
      const thresholdValue = Math.max(110, Math.min(220, threshold));
      for (let i = 0; i < data.length; i += 4) {
        const v = data[i] > thresholdValue ? 255 : 0;
        data[i] = data[i + 1] = data[i + 2] = v;
      }
    }

    outCtx.putImageData(imageData, 0, 0);
    return out;
  }

  applySharpenCanvas(canvas) {
    const w = canvas.width;
    const h = canvas.height;
    const ctx = canvas.getContext("2d");
    let imageData;
    try {
      imageData = ctx.getImageData(0, 0, w, h);
    } catch (e) {
      return canvas;
    }
    const src = new Uint8ClampedArray(imageData.data);
    const outData = new Uint8ClampedArray(src.length);
    const kernel = [0, -1, 0, -1, 5, -1, 0, -1, 0];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = (y * w + x) * 4;
        for (let c = 0; c < 3; c++) {
          let acc = 0;
          for (let ky = -1; ky <= 1; ky++) {
            for (let kx = -1; kx <= 1; kx++) {
              const px = Math.min(w - 1, Math.max(0, x + kx));
              const py = Math.min(h - 1, Math.max(0, y + ky));
              const pidx = (py * w + px) * 4 + c;
              acc += src[pidx] * kernel[(ky + 1) * 3 + (kx + 1)];
            }
          }
          outData[idx + c] = Math.max(0, Math.min(255, acc));
        }
        outData[idx + 3] = src[idx + 3];
      }
    }
    const out = document.createElement("canvas");
    out.width = w;
    out.height = h;
    out.getContext("2d").putImageData(new ImageData(outData, w, h), 0, 0);
    return out;
  }

  onClose() {
    if (this.currentStream) {
      this.currentStream.getTracks().forEach(t => t.stop());
      this.currentStream = null;
    }
    if (this._resizeObserver) {
      this._resizeObserver.disconnect();
      this._resizeObserver = null;
    }
    if (this._shellPointerDown) this.canvasShell?.removeEventListener("pointerdown", this._shellPointerDown);
    if (this._shellPointerMove) this.canvasShell?.removeEventListener("pointermove", this._shellPointerMove);
    if (this._shellPointerUp) this.canvasShell?.removeEventListener("pointerup", this._shellPointerUp);
    if (this._shellPointerUp) this.canvasShell?.removeEventListener("pointercancel", this._shellPointerUp);
    if (this._shellWheel) this.canvasShell?.removeEventListener("wheel", this._shellWheel);
    if (this._windowPointerMove) window.removeEventListener("pointermove", this._windowPointerMove);
    if (this._windowPointerUp) window.removeEventListener("pointerup", this._windowPointerUp);
    if (this._windowPointerUp) window.removeEventListener("pointercancel", this._windowPointerUp);
    if (this.isFullscreen) this.exitFullscreen();
    if (this._cleanupResultPanelDrag) {
      this._cleanupResultPanelDrag();
      this._cleanupResultPanelDrag = null;
    }
    this.cropperBaseCanvas = null;
    this.cropperSelectionData = null;
    this.contentEl.empty();
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
    document.body.style.overflow = "";
  }

  async dispatchRecognize(imageBase64) {
    switch (this.settings.apiProvider) {
      case "mathpix": return await this.callMathpix(imageBase64);
      case "simpletex": return await this.callSimpletex(imageBase64);
      case "openai": return await this.callOpenAI(imageBase64);
      case "custom": return await this.callCustomAPI(imageBase64);
      case "custom-form": return await this.callCustomFormAPI(imageBase64);
      default:
        if (this.getCustomProviderConfig(this.settings.apiProvider)) {
          return await this.callCustomProvider(imageBase64);
        }
        throw new Error("Unknown API provider: " + this.settings.apiProvider);
    }
  }


  // ==================== API 辅助方法 ====================
  isReasoningModel(model) {
    return /^o\d/.test(model) || model.includes("o1") || model.includes("o3") || model.includes("o4");
  }

  getEffectiveDetail(model, detail) {
    // OpenAI 官方文档：detail: "original" 仅在 gpt-5.4 及未来模型上可用
    // gpt-4o, gpt-4.1, gpt-4o-mini, o-series (except o4-mini) 不支持 original
    if (detail === "original") {
      const supportedOriginalModels = ["gpt-5.4", "gpt-5.5"];
      const isSupported = supportedOriginalModels.some(m => model.startsWith(m));
      if (!isSupported) {
        console.warn(`detail "original" is not supported for model "${model}". Falling back to "high".`);
        return "high";
      }
    }
    return detail;
  }

  parseApiError(response, prefix) {
    let errorMsg = response.text || "Unknown error";
    try {
      const errData = JSON.parse(response.text);
      errorMsg = errData.error?.message || errData.error?.description || errData.message || errData.detail || response.text;
    } catch (e) {
      // 不是 JSON，保持原样
    }
    return new Error(prefix + " (HTTP " + response.status + "): " + errorMsg);
  }

  async callMathpix(imageBase64) {
    if (!this.settings.mathpixAppId) {
      throw new Error("Mathpix App ID is required. Please set it in plugin settings.");
    }
    if (!this.settings.apiKey) {
      throw new Error("Mathpix App Key is required. Please set it in plugin settings.");
    }
    const response = await requestUrl({
      url: "https://api.mathpix.com/v3/text",
      method: "POST",
      headers: {
        "app_id": this.settings.mathpixAppId,
        "app_key": this.settings.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        src: "data:image/png;base64," + imageBase64,
        formats: ["text", "latex_styled"],
        math_inline_delimiters: ["$", "$"],
        rm_spaces: true,
      }),
    });
    if (response.status !== 200) throw this.parseApiError(response, "Mathpix API error");
    const data = response.json;
    return data.latex_styled || data.text || "";
  }

  async callSimpletex(imageBase64) {
    const blob = this.base64ToBlob(imageBase64);
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const boundary = "----FormBoundary" + Math.random().toString(36).substring(2);
    const encoder = new TextEncoder();
    const appendString = (buffer, str) => {
      const encoded = encoder.encode(str + "\r\n");
      const newBuffer = new Uint8Array(buffer.length + encoded.length);
      newBuffer.set(buffer);
      newBuffer.set(encoded, buffer.length);
      return newBuffer;
    };
    const appendBytes = (buffer, bytes) => {
      const newBuffer = new Uint8Array(buffer.length + bytes.length);
      newBuffer.set(buffer);
      newBuffer.set(bytes, buffer.length);
      return newBuffer;
    };
    let body = new Uint8Array(0);
    body = appendString(body, "--" + boundary);
    body = appendString(body, 'Content-Disposition: form-data; name="file"; filename="formula.png"');
    body = appendString(body, "Content-Type: image/png");
    body = appendString(body, "");
    const fileBytes = new Uint8Array(arrayBuffer);
    body = appendBytes(body, fileBytes);
    body = appendString(body, "");
    body = appendString(body, "--" + boundary + "--");
    const response = await requestUrl({
      url: "https://server.simpletex.cn/api/latex_ocr",
      method: "POST",
      headers: {
        "Content-Type": "multipart/form-data; boundary=" + boundary,
        "token": this.settings.apiKey,
      },
      body: body.buffer,
    });
    if (response.status !== 200) throw this.parseApiError(response, "SimpleTex API error");
    const data = response.json;
    if (!data.status) throw new Error("SimpleTex API returned error: " + JSON.stringify(data));
    return data.res?.latex || "";
  }

  async callOpenAI(imageBase64) {
    const model = this.settings.openaiModel || "gpt-4o";
    const detail = this.getEffectiveDetail(model, this.settings.openaiDetail || "high");

    const requestBody = {
      model: model,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: this.settings.customPrompt },
            { type: "image_url", image_url: { url: "data:image/png;base64," + imageBase64, detail: detail } },
          ],
        },
      ],
      max_completion_tokens: 2048,
    };

    // 推理模型 (o1, o3, o4 系列) 不支持 temperature 参数
    if (!this.isReasoningModel(model)) {
      requestBody.temperature = 0.1;
    }

    const response = await requestUrl({
      url: this.settings.apiEndpoint || "https://api.openai.com/v1/chat/completions",
      method: "POST",
      headers: {
        "Authorization": "Bearer " + this.settings.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    if (response.status !== 200) throw this.parseApiError(response, "OpenAI API error");
    const data = response.json;
    const message = data.choices?.[0]?.message;
    if (message?.refusal) {
      throw new Error("OpenAI model refused: " + message.refusal);
    }
    return message?.content || "";
  }

  async callCustomAPI(imageBase64) {
    const response = await requestUrl({
      url: this.settings.apiEndpoint,
      method: "POST",
      headers: {
        "Authorization": "Bearer " + this.settings.apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: "data:image/png;base64," + imageBase64,
        prompt: this.settings.customPrompt,
      }),
    });
    if (response.status !== 200) throw this.parseApiError(response, "Custom API error");
    const data = response.json;
    const customField = this.settings.customResponseField;
    return (customField && data[customField]) || data.latex || data.result || data.text || "";
  }

  async callCustomFormAPI(imageBase64) {
    const blob = this.base64ToBlob(imageBase64);
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const boundary = "----FormBoundary" + Math.random().toString(36).substring(2);
    const encoder = new TextEncoder();
    const appendString = (buffer, str) => {
      const encoded = encoder.encode(str + "\r\n");
      const newBuffer = new Uint8Array(buffer.length + encoded.length);
      newBuffer.set(buffer);
      newBuffer.set(encoded, buffer.length);
      return newBuffer;
    };
    const appendBytes = (buffer, bytes) => {
      const newBuffer = new Uint8Array(buffer.length + bytes.length);
      newBuffer.set(buffer);
      newBuffer.set(bytes, buffer.length);
      return newBuffer;
    };
    let body = new Uint8Array(0);

    // Append additional form fields before the image (legacy custom-form mode)
    const formFields = this.settings.customFormFields || [];
    if (formFields && Array.isArray(formFields)) {
      for (const field of formFields) {
        if (field.name) {
          let fieldValue = field.value || '';
          fieldValue = this.resolvePlaceholders(fieldValue, imageBase64);
          body = appendString(body, "--" + boundary);
          body = appendString(body, 'Content-Disposition: form-data; name="' + field.name + '"');
          body = appendString(body, "");
          body = appendString(body, fieldValue);
        }
      }
    }

    body = appendString(body, "--" + boundary);
    body = appendString(body, 'Content-Disposition: form-data; name="' + this.settings.customImageFieldName + '"; filename="formula.png"');
    body = appendString(body, "Content-Type: image/png");
    body = appendString(body, "");
    const fileBytes = new Uint8Array(arrayBuffer);
    body = appendBytes(body, fileBytes);
    body = appendString(body, "");
    body = appendString(body, "--" + boundary + "--");

    const headers = {
      "Content-Type": "multipart/form-data; boundary=" + boundary,
    };
    if (this.settings.customApiKeyHeader) {
      headers[this.settings.customApiKeyHeader] = this.settings.apiKey;
    }

    const response = await requestUrl({
      url: this.settings.apiEndpoint,
      method: "POST",
      headers: headers,
      body: body.buffer,
    });
    if (response.status !== 200) throw this.parseApiError(response, "Custom Form API error");
    const data = response.json;
    return data[this.settings.customResponseField] || "";
  }

  // ==================== Custom Provider API ====================
  getCustomProviderConfig(providerId) {
    const providers = this.settings.customProviders || [];
    return providers.find(p => p.id === providerId);
  }

  resolvePlaceholders(str, imageBase64) {
    // Built-in placeholders
    const now = new Date();
    const builtins = {
      image_base64: imageBase64 || '',
      image: 'data:image/png;base64,' + (imageBase64 || ''),
      prompt: this.settings.customPrompt || '',
      apiKey: this.settings.apiKey || '',
      timestamp: String(Math.floor(now.getTime() / 1000)),
      datetime: now.toISOString(),
      date: now.toISOString().slice(0, 10),
      time: now.toTimeString().slice(0, 8),
      random: Math.random().toString(16).slice(2, 10),
    };

    let result = str;
    // Replace built-in placeholders using split/join (avoids regex escaping issues)
    for (const [key, val] of Object.entries(builtins)) {
      result = result.split('{{' + key + '}}').join(val);
    }

    // Replace custom placeholders defined in settings
    const customPlaceholders = this.settings.customPlaceholders || [];
    for (const ph of customPlaceholders) {
      if (ph.name) {
        result = result.split('{{' + ph.name + '}}').join(ph.value || '');
      }
    }

    return result;
  }

  // Safe JSON template resolution: parses template as JSON, recursively
  // walks the structure, replaces placeholders in string values, and
  // re-serializes via JSON.stringify. This prevents JSON injection when
  // placeholder values contain quotes, backslashes, or control characters.
  resolveJSONTemplate(template, imageBase64) {
    let obj;
    try {
      obj = JSON.parse(template);
    } catch (e) {
      console.warn('Body template is not valid JSON, falling back to string substitution:', e);
      return this.resolvePlaceholders(template, imageBase64);
    }
    const walk = (node) => {
      if (typeof node === 'string') {
        return this.resolvePlaceholders(node, imageBase64);
      }
      if (Array.isArray(node)) {
        return node.map(walk);
      }
      if (typeof node === 'object' && node !== null) {
        const result = {};
        for (const [k, v] of Object.entries(node)) {
          result[k] = walk(v);
        }
        return result;
      }
      return node;
    };
    const resolved = walk(obj);
    return JSON.stringify(resolved);
  }

  // Kept for backward compatibility — delegates to resolvePlaceholders
  substituteTemplate(template, imageBase64) {
    return this.resolvePlaceholders(template, imageBase64);
  }
resolvePath(obj, path) {
    path = path.replace(/^\$\./, '');
    const parts = path.split('.');
    let current = obj;
    for (const part of parts) {
      if (current == null) return '';
      const arrayMatch = part.match(/^(.+?)\[(\d+)\]$/);
      if (arrayMatch) {
        current = current[arrayMatch[1]];
        if (current == null) return '';
        current = current[parseInt(arrayMatch[2])];
      } else {
        if (Array.isArray(current) && /^\d+$/.test(part)) {
          current = current[parseInt(part)];
        } else {
          current = current[part];
        }
      }
    }
    return current != null ? String(current) : '';
  }

  async buildFormDataBody(imageBase64, fieldName, boundary, formFields) {
    const blob = this.base64ToBlob(imageBase64);
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    const encoder = new TextEncoder();
    const appendString = (buffer, str) => {
      const encoded = encoder.encode(str + "\r\n");
      const newBuf = new Uint8Array(buffer.length + encoded.length);
      newBuf.set(buffer);
      newBuf.set(encoded, buffer.length);
      return newBuf;
    };
    const appendBytes = (buffer, bytes) => {
      const newBuf = new Uint8Array(buffer.length + bytes.length);
      newBuf.set(buffer);
      newBuf.set(bytes, buffer.length);
      return newBuf;
    };
    let body = new Uint8Array(0);

    // Append additional form fields first (before the image)
    if (formFields && Array.isArray(formFields)) {
      for (const field of formFields) {
        if (field.name) {
          let fieldValue = field.value || '';
          fieldValue = this.resolvePlaceholders(fieldValue, imageBase64);
          body = appendString(body, "--" + boundary);
          body = appendString(body, 'Content-Disposition: form-data; name="' + field.name + '"');
          body = appendString(body, "");
          body = appendString(body, fieldValue);
        }
      }
    }

    body = appendString(body, "--" + boundary);
    body = appendString(body, 'Content-Disposition: form-data; name="' + fieldName + '"; filename="formula.png"');
    body = appendString(body, "Content-Type: image/png");
    body = appendString(body, "");
    const fileBytes = new Uint8Array(arrayBuffer);
    body = appendBytes(body, fileBytes);
    body = appendString(body, "");
    body = appendString(body, "--" + boundary + "--");
    return body;
  }

  async callCustomProvider(imageBase64) {
    const config = this.getCustomProviderConfig(this.settings.apiProvider);
    if (!config) throw new Error("Custom provider configuration not found: " + this.settings.apiProvider);

    let url = config.url || '';
    url = this.resolvePlaceholders(url, imageBase64);

    const headers = {};
    const configHeaders = config.headers || [];
    for (const h of configHeaders) {
      if (h.key) {
        let value = h.value || '';
        value = this.resolvePlaceholders(value, imageBase64);
        headers[h.key] = value;
      }
    }

    const hasContentType = Object.keys(headers).some(k => k.toLowerCase() === 'content-type');
    if (!hasContentType) {
      if (config.bodyType === 'json') {
        headers['Content-Type'] = 'application/json';
      }
    }

    let body = undefined;
    const method = config.method || 'POST';

    if (method === 'GET' || method === 'DELETE') {
      // No body
    } else if (config.bodyType === 'json') {
      const template = config.bodyTemplate || '{}';
      body = this.resolveJSONTemplate(template, imageBase64);
    } else if (config.bodyType === 'raw') {
      body = this.substituteTemplate(config.bodyTemplate || '', imageBase64);
    } else if (config.bodyType === 'form-data') {
      const boundary = "----FormBoundary" + Math.random().toString(36).substring(2);
      // Merge formFields array with key-value pairs extracted from bodyTemplate (if present)
      let mergedFormFields = config.formFields ? [...config.formFields] : [];
      if (config.bodyTemplate) {
        try {
          const templateFields = JSON.parse(config.bodyTemplate);
          for (const [key, value] of Object.entries(templateFields)) {
            const imageFieldName = config.formFieldName || 'image';
            if (!mergedFormFields.some(f => f.name === key) && key !== imageFieldName) {
              const strValue = (typeof value === 'object' && value !== null)
                ? JSON.stringify(value)
                : String(value);
              mergedFormFields.push({ name: key, value: strValue });
            }
          }
        } catch (e) {
          console.warn('Form-data bodyTemplate is not valid JSON, using formFields only:', e);
        }
      }
      const formBody = await this.buildFormDataBody(imageBase64, config.formFieldName || 'image', boundary, mergedFormFields);
      const hasFormContentType = Object.keys(headers).some(k => k.toLowerCase() === 'content-type');
      if (!hasFormContentType) {
        headers['Content-Type'] = 'multipart/form-data; boundary=' + boundary;
      }
      body = formBody.buffer;
    }

    const requestOptions = {
      url: url,
      method: method,
      headers: headers,
    };
    if (body !== undefined) {
      requestOptions.body = body;
    }

    const response = await requestUrl(requestOptions);

    if (response.status < 200 || response.status >= 300) {
      let errorMsg = response.text || ("HTTP " + response.status);
      if (config.errorPath && response.json) {
        try {
          const errData = response.json;
          const extracted = this.resolvePath(errData, config.errorPath);
          if (extracted) errorMsg = extracted;
        } catch (e) {}
      } else {
        try {
          const errData = JSON.parse(response.text);
          errorMsg = errData.error?.message || errData.error?.description || errData.message || errData.detail || response.text;
        } catch (e) {}
      }
      throw new Error("Custom API error (HTTP " + response.status + "): " + errorMsg);
    }

    if (config.responseType === 'regex') {
      const regex = new RegExp(config.responseRegex || '(.*)', 's');
      const match = (response.text || '').match(regex);
      return match ? (match[1] !== undefined ? match[1] : match[0]) : '';
    } else {
      const data = response.json;
      return this.resolvePath(data, config.responsePath || '');
    }
  }
  base64ToBlob(base64, mimeType = "image/png") {
    const byteString = atob(base64);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeType });
  }

  cleanLatex(latex) {
    latex = latex.replace(/```latex/g, "").replace(/```/g, "").trim();
    let changed = true;
    while (changed) {
      changed = false;
      const trimmed = latex.trim();
      if (trimmed.startsWith("$$") && trimmed.endsWith("$$") && trimmed.length > 4) {
        latex = trimmed.slice(2, -2).trim();
        changed = true;
      } else if (trimmed.startsWith("$") && trimmed.endsWith("$") && trimmed.length > 2) {
        latex = trimmed.slice(1, -1).trim();
        changed = true;
      } else if (trimmed.startsWith("\\(") && trimmed.endsWith("\\)") && trimmed.length > 4) {
        latex = trimmed.slice(2, -2).trim();
        changed = true;
      } else if (trimmed.startsWith("\\[") && trimmed.endsWith("\\]") && trimmed.length > 4) {
        latex = trimmed.slice(2, -2).trim();
        changed = true;
      } else {
        latex = trimmed;
      }
    }
    return latex;
  }

}
class HandwritingSettingTab extends PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
    this._expandedProviders = new Set();
  }

  display() {
    const containerEl = this.containerEl;
    containerEl.empty();
    containerEl.createEl("h2", { text: "Handwriting to LaTeX Settings" });

    // ========== API Provider dropdown (built-in + custom) ==========
    const providerOptions = {
      "simpletex": "SimpleTex (Recommended)",
      "mathpix": "Mathpix",
      "openai": "OpenAI GPT-4o Vision",
    };
    providerOptions["custom"] = "Custom API (JSON) [Legacy]";
    providerOptions["custom-form"] = "Custom API (Multipart Form) [Legacy]";
    const customProviders = this.plugin.settings.customProviders || [];
    for (const cp of customProviders) {
      providerOptions[cp.id] = "\uD83D\uDD27 " + cp.name;
    }

    new Setting(containerEl)
      .setName("API Provider")
      .setDesc("Choose which service to use for formula recognition. Custom providers are listed with \uD83D\uDD27 prefix.")
      .addDropdown((dropdown) => {
        for (const [key, label] of Object.entries(providerOptions)) {
          dropdown.addOption(key, label);
        }
        dropdown.setValue(this.plugin.settings.apiProvider);
        dropdown.onChange(async (value) => {
          this.plugin.settings.apiProvider = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    new Setting(containerEl)
      .setName("API Key")
      .setDesc("For SimpleTex: use UAT token. For Mathpix: App Key. For OpenAI: API key. For custom providers, this populates the {{apiKey}} placeholder.")
      .addText((text) => text.setPlaceholder("sk-...").setValue(this.plugin.settings.apiKey)
        .onChange(async (value) => { this.plugin.settings.apiKey = value; await this.plugin.saveSettings(); })
      );

    if (this.plugin.settings.apiProvider === "mathpix") {
      new Setting(containerEl)
        .setName("Mathpix App ID")
        .setDesc("Your Mathpix App ID (required for Mathpix). Get it from https://mathpix.com/")
        .addText((text) => text.setPlaceholder("your_app_id").setValue(this.plugin.settings.mathpixAppId)
          .onChange(async (value) => { this.plugin.settings.mathpixAppId = value; await this.plugin.saveSettings(); })
        );
    }

    if (this.plugin.settings.apiProvider === "custom" || this.plugin.settings.apiProvider === "openai" || this.plugin.settings.apiProvider === "custom-form") {
      new Setting(containerEl)
        .setName("API Endpoint")
        .setDesc("Custom API endpoint URL (optional for OpenAI)")
        .addText((text) => text.setPlaceholder("https://api.example.com/recognize").setValue(this.plugin.settings.apiEndpoint)
          .onChange(async (value) => { this.plugin.settings.apiEndpoint = value; await this.plugin.saveSettings(); })
        );
    }

    if (this.plugin.settings.apiProvider === "openai") {
      new Setting(containerEl)
        .setName("OpenAI Model")
        .setDesc("Model name for OpenAI vision API (e.g. gpt-4o, gpt-4o-mini, gpt-4.1)")
        .addText((text) => text.setPlaceholder("gpt-4o").setValue(this.plugin.settings.openaiModel)
          .onChange(async (value) => { this.plugin.settings.openaiModel = value; await this.plugin.saveSettings(); })
        );

      new Setting(containerEl)
        .setName("Vision Detail Level")
        .setDesc("Image detail level: low (faster/cheaper), high (better accuracy), auto (default). NOTE: original requires gpt-5.4+ and will auto-fallback to high on older models.")
        .addDropdown((dropdown) => dropdown
          .addOption("low", "low")
          .addOption("high", "high")
          .addOption("auto", "auto")
          .addOption("original", "original (GPT-5.4+)")
          .setValue(this.plugin.settings.openaiDetail || "high")
          .onChange(async (value) => { this.plugin.settings.openaiDetail = value; await this.plugin.saveSettings(); })
        );
    }

    if (this.plugin.settings.apiProvider === "openai" || this.plugin.settings.apiProvider === "custom") {
      new Setting(containerEl)
        .setName("Custom Prompt")
        .setDesc("Prompt sent to AI for recognition. Also available as {{prompt}} placeholder in custom provider body templates.")
        .addTextArea((text) => text.setValue(this.plugin.settings.customPrompt)
          .onChange(async (value) => { this.plugin.settings.customPrompt = value; await this.plugin.saveSettings(); })
        );
    }

    if (this.plugin.settings.apiProvider === "custom-form") {
      new Setting(containerEl)
        .setName("Response Field Name")
        .setDesc("The JSON field name containing the LaTeX result (e.g. 'text', 'latex', 'result')")
        .addText((text) => text.setPlaceholder("text").setValue(this.plugin.settings.customResponseField)
          .onChange(async (value) => { this.plugin.settings.customResponseField = value; await this.plugin.saveSettings(); })
        );

      new Setting(containerEl)
        .setName("API Key Header Name")
        .setDesc("The HTTP header name for the API key (e.g. 'X-API-Key', 'Authorization')")
        .addText((text) => text.setPlaceholder("X-API-Key").setValue(this.plugin.settings.customApiKeyHeader)
          .onChange(async (value) => { this.plugin.settings.customApiKeyHeader = value; await this.plugin.saveSettings(); })
        );

      new Setting(containerEl)
        .setName("Image Field Name")
        .setDesc("The form field name for the uploaded image (e.g. 'image', 'file')")
        .addText((text) => text.setPlaceholder("image").setValue(this.plugin.settings.customImageFieldName)
          .onChange(async (value) => { this.plugin.settings.customImageFieldName = value; await this.plugin.saveSettings(); })
        );
      // Additional form fields for legacy custom-form mode
      const legacyFormFieldsSection = containerEl.createDiv({ cls: "provider-formfields-section" });
      legacyFormFieldsSection.createEl("h4", { text: "Additional Form Fields" });
      legacyFormFieldsSection.createEl("p", { text: "Add extra form-data fields (e.g. prompt, model). Values support {{prompt}}, {{apiKey}}, {{image_base64}}, {{image}} placeholders.", cls: "setting-item-description" });

      const legacyFormFieldsList = legacyFormFieldsSection.createDiv({ cls: "provider-formfields-list" });
      const renderLegacyFormFields = () => {
        legacyFormFieldsList.empty();
        const fields = this.plugin.settings.customFormFields || [];
        for (let fi = 0; fi < fields.length; fi++) {
          const field = fields[fi];
          const row = legacyFormFieldsList.createDiv({ cls: "provider-header-row" });
          row.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:6px;";

          const nameInput = row.createEl("input", { type: "text", placeholder: "Field Name", value: field.name || "" });
          nameInput.style.cssText = "flex:1;min-width:0;padding:4px 8px;font-size:12px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);";
          nameInput.addEventListener("input", async () => { field.name = nameInput.value; await this.plugin.saveSettings(); });

          const valueInput = row.createEl("input", { type: "text", placeholder: "Field Value", value: field.value || "" });
          valueInput.style.cssText = "flex:2;min-width:0;padding:4px 8px;font-size:12px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);font-family:monospace;";
          valueInput.addEventListener("input", async () => { field.value = valueInput.value; await this.plugin.saveSettings(); });

          const removeBtn = row.createEl("button", { text: "\u2715", attr: { "aria-label": "Remove field" } });
          removeBtn.style.cssText = "padding:2px 8px;font-size:12px;cursor:pointer;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-error);flex-shrink:0;";
          removeBtn.addEventListener("click", async () => { fields.splice(fi, 1); await this.plugin.saveSettings(); renderLegacyFormFields(); });
        }

        const addRow = legacyFormFieldsList.createDiv({ cls: "provider-header-row" });
        const addBtn = addRow.createEl("button", { text: "+ Add Form Field" });
        addBtn.style.cssText = "padding:4px 12px;font-size:11px;cursor:pointer;border:1px dashed var(--background-modifier-border);border-radius:4px;background:transparent;";
        addBtn.addEventListener("click", async () => {
          if (!this.plugin.settings.customFormFields) this.plugin.settings.customFormFields = [];
          this.plugin.settings.customFormFields.push({ name: "", value: "" });
          await this.plugin.saveSettings();
          renderLegacyFormFields();
        });
      };
      renderLegacyFormFields();
    }

    new Setting(containerEl)
      .setName("Math Insert Mode")
      .setDesc("How to wrap the recognized LaTeX when inserting")
      .addDropdown((dropdown) => dropdown
        .addOption("inline", "Inline ($...$)")
        .addOption("display", "Display ($$...$$)")
        .addOption("raw", "Raw (no $)")
        .setValue(this.plugin.settings.mathMode || "inline")
        .onChange(async (value) => { this.plugin.settings.mathMode = value; await this.plugin.saveSettings(); })
      );

    containerEl.createEl("h3", { text: "Canvas Settings" });

    new Setting(containerEl)
      .setName("Show Grid")
      .setDesc("Display background grid on canvas")
      .addToggle((toggle) => toggle.setValue(this.plugin.settings.showGrid !== false)
        .onChange(async (value) => { this.plugin.settings.showGrid = value; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName("Stroke Color")
      .setDesc("Color of the handwriting pen")
      .addColorPicker((picker) => picker.setValue(this.plugin.settings.strokeColor)
        .onChange(async (value) => { this.plugin.settings.strokeColor = value; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName("Stroke Width")
      .setDesc("Width of the pen stroke")
      .addSlider((slider) => slider.setLimits(1, 10, 1).setValue(this.plugin.settings.strokeWidth).setDynamicTooltip()
        .onChange(async (value) => { this.plugin.settings.strokeWidth = value; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName("Default Canvas Width")
      .setDesc("Default width of the handwriting canvas in pixels")
      .addSlider((slider) => slider.setLimits(400, 2000, 100).setValue(this.plugin.settings.canvasWidth)
        .onChange(async (value) => { this.plugin.settings.canvasWidth = value; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName("Default Canvas Height")
      .setDesc("Default height of the handwriting canvas in pixels")
      .addSlider((slider) => slider.setLimits(300, 1200, 100).setValue(this.plugin.settings.canvasHeight)
        .onChange(async (value) => { this.plugin.settings.canvasHeight = value; await this.plugin.saveSettings(); })
      );

    new Setting(containerEl)
      .setName("Max History Size")
      .setDesc("Maximum number of recognition results to keep in history (0 to disable)")
      .addSlider((slider) => slider.setLimits(0, 100, 5).setValue(this.plugin.settings.maxHistorySize ?? 30).setDynamicTooltip()
        .onChange(async (value) => { this.plugin.settings.maxHistorySize = value; await this.plugin.saveSettings(); })
      );

    // ========== Custom API Providers Management ==========
    containerEl.createEl("h3", { text: "\uD83D\uDD27 Custom API Providers" });

    const customDesc = containerEl.createDiv({ cls: "setting-item-description" });
    customDesc.innerHTML = `
      <p>Define your own API endpoints for formula recognition. Each provider supports:</p>
      <ul>
        <li><strong>Name:</strong> Display name shown in the provider dropdown</li>
        <li><strong>Method:</strong> GET, POST, PUT, DELETE, PATCH</li>
        <li><strong>URL:</strong> API endpoint (supports <code>{{apiKey}}</code> placeholder)</li>
        <li><strong>Headers:</strong> Key-value pairs (values support <code>{{apiKey}}</code> placeholder)</li>
        <li><strong>Body Type:</strong> JSON, Form-Data (multipart), or Raw text</li>
        <li><strong>Body Template:</strong> For JSON/Raw, use placeholders: <code>{{image_base64}}</code> (raw base64), <code>{{image}}</code> (full data URL), <code>{{prompt}}</code>, <code>{{apiKey}}</code>, <code>{{timestamp}}</code>, <code>{{datetime}}</code>, <code>{{date}}</code>, <code>{{time}}</code>, <code>{{random}}</code>, or any custom placeholder defined in "Custom Placeholders" below.</li>
        <li><strong>Response Path:</strong> Dot-path (e.g. <code>data.latex</code>) or JSONPath (e.g. <code>$.choices.0.message.content</code>) to extract LaTeX from JSON response</li>
        <li><strong>Regex:</strong> For non-JSON responses, a regex with a capture group to extract LaTeX</li>
      </ul>
    `;

    // Preset templates
    const presetsDiv = containerEl.createDiv({ cls: "custom-providers-presets" });
    presetsDiv.createEl("h4", { text: "\uD83D\DCCB Import Preset Template" });

    const presetButtons = presetsDiv.createDiv({ cls: "preset-buttons" });
    presetButtons.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;";

    const importPreset = async (preset) => {
      const providers = this.plugin.settings.customProviders || [];
      // Check for existing providers with the same name to avoid duplicates
      const existingNames = providers.map(p => p.name);
      let presetName = preset.name;
      if (existingNames.includes(presetName)) {
        let suffix = 2;
        while (existingNames.includes(presetName + " (" + suffix + ")")) {
          suffix++;
        }
        presetName = presetName + " (" + suffix + ")";
      }
      const id = "custom_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
      const presetClone = JSON.parse(JSON.stringify(preset));
      presetClone.name = presetName;
      providers.push({ id, ...presetClone });
      this.plugin.settings.customProviders = providers;
      await this.plugin.saveSettings();
      this.display();
      new Notice(`Preset "${presetName}" imported!`);
    };

    for (const preset of PRESET_TEMPLATES) {
      const btn = presetButtons.createEl("button", { text: "\uD83D\DCE5 " + preset.name, cls: "preset-import-btn" });
      btn.style.cssText = "padding:6px 12px;font-size:12px;cursor:pointer;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-secondary);";
      btn.addEventListener("click", () => importPreset(preset));
    }

    const listContainer = containerEl.createDiv({ cls: "custom-providers-list" });
    this.renderCustomProvidersList(listContainer);

    new Setting(containerEl)
      .setName("Add New Provider")
      .setDesc("Create a custom API provider configuration")
      .addButton((btn) => btn.setButtonText("\u2795 Add Provider").setCta().onClick(async () => {
        const providers = this.plugin.settings.customProviders || [];
        const id = "custom_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
        providers.push({
          id,
          name: "New Provider",
          method: "POST",
          url: "https://api.example.com/recognize",
          headers: [
            { key: "Authorization", value: "Bearer {{apiKey}}" },
            { key: "Content-Type", value: "application/json" }
          ],
          bodyType: "json",
          bodyTemplate: '{"image": "{{image}}", "prompt": "{{prompt}}"}',
          formFieldName: "image",
          formFields: [],
          responsePath: "data.latex",
          responseType: "json",
          responseRegex: "",
          errorPath: ""
        });
        this.plugin.settings.customProviders = providers;
        await this.plugin.saveSettings();
        this.display();
        new Notice("New provider added! Configure it below.");
      }));

    // ========== Custom Placeholders ==========
    containerEl.createEl("h3", { text: "🔖 Custom Placeholders" });

    const placeholdersDesc = containerEl.createDiv({ cls: "setting-item-description" });
    placeholdersDesc.innerHTML = `
      <p>Define custom placeholders that can be used in body templates, form field values, URLs, and headers. Built-in placeholders are always available:</p>
      <ul>
        <li><code>{{image_base64}}</code> — raw base64 image data</li>
        <li><code>{{image}}</code> — full data URL (data:image/png;base64,...)</li>
        <li><code>{{prompt}}</code> — custom prompt text</li>
        <li><code>{{apiKey}}</code> — API key from settings</li>
        <li><code>{{timestamp}}</code> — current Unix timestamp (seconds)</li>
        <li><code>{{datetime}}</code> — current ISO 8601 datetime</li>
        <li><code>{{date}}</code> — current date (YYYY-MM-DD)</li>
        <li><code>{{time}}</code> — current time (HH:mm:ss)</li>
        <li><code>{{random}}</code> — random 8-character hex string</li>
      </ul>
    `;

    const phListContainer = containerEl.createDiv({ cls: "custom-placeholders-list" });

    const renderPlaceholders = () => {
      phListContainer.empty();
      const placeholders = this.plugin.settings.customPlaceholders || [];

      for (let pi = 0; pi < placeholders.length; pi++) {
        const ph = placeholders[pi];
        const row = phListContainer.createDiv({ cls: "provider-header-row" });
        row.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:6px;";

        const nameInput = row.createEl("input", { type: "text", placeholder: "Name (e.g. model)", value: ph.name || "" });
        nameInput.style.cssText = "flex:1;min-width:0;padding:4px 8px;font-size:12px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);";
        nameInput.addEventListener("input", async () => { ph.name = nameInput.value; await this.plugin.saveSettings(); });

        const valueInput = row.createEl("input", { type: "text", placeholder: "Value (e.g. gpt-4o)", value: ph.value || "" });
        valueInput.style.cssText = "flex:2;min-width:0;padding:4px 8px;font-size:12px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);font-family:monospace;";
        valueInput.addEventListener("input", async () => { ph.value = valueInput.value; await this.plugin.saveSettings(); });

        const usageHint = row.createEl("span", { text: "{{" + (ph.name || "?") + "}}", cls: "placeholder-usage-hint" });
        usageHint.style.cssText = "flex-shrink:0;font-size:10px;color:var(--text-muted);font-family:monospace;min-width:80px;text-align:right;";

        const removeBtn = row.createEl("button", { text: "✕", attr: { "aria-label": "Remove placeholder" } });
        removeBtn.style.cssText = "padding:2px 8px;font-size:12px;cursor:pointer;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-error);flex-shrink:0;";
        removeBtn.addEventListener("click", async () => { placeholders.splice(pi, 1); await this.plugin.saveSettings(); renderPlaceholders(); });
      }

      const addRow = phListContainer.createDiv({ cls: "provider-header-row" });
      const addBtn = addRow.createEl("button", { text: "+ Add Custom Placeholder" });
      addBtn.style.cssText = "padding:4px 12px;font-size:11px;cursor:pointer;border:1px dashed var(--background-modifier-border);border-radius:4px;background:transparent;";
      addBtn.addEventListener("click", async () => {
        if (!this.plugin.settings.customPlaceholders) this.plugin.settings.customPlaceholders = [];
        this.plugin.settings.customPlaceholders.push({ name: "", value: "" });
        await this.plugin.saveSettings();
        renderPlaceholders();
      });
    };
    renderPlaceholders();

    containerEl.createEl("h3", { text: "API Setup Guide" });
    const guide = containerEl.createEl("div");
    guide.innerHTML = `
      <p><strong>SimpleTex (Recommended):</strong> Register at <a href="https://simpletex.cn/">simpletex.cn</a>, go to User Center, create a <strong>UAT (User Authorization Token)</strong> in "User Authorization Token" menu. Paste the token here.</p>
      <p><strong>Mathpix:</strong> Get <strong>App ID</strong> and <strong>App Key</strong> at <a href="https://mathpix.com/">mathpix.com</a>. Paste App ID in "Mathpix App ID" and App Key in "API Key". Most accurate for math formulas.</p>
      <p><strong>OpenAI:</strong> Use your OpenAI API key. Supports gpt-4o, gpt-4o-mini, gpt-4.1, etc. Set "detail" to "high" for best formula recognition accuracy.</p>
      <p><strong>Custom API Providers:</strong> Use the 🔧 Custom API Providers section above to define your own endpoints. Supports JSON, Form-Data, and Raw body types. Available placeholders: <code>{{image_base64}}</code> (raw base64), <code>{{image}}</code> (data URL), <code>{{prompt}}</code>, <code>{{apiKey}}</code>, <code>{{timestamp}}</code>, <code>{{datetime}}</code>, <code>{{date}}</code>, <code>{{time}}</code>, <code>{{random}}</code>, plus any custom placeholders defined above.</p>
      <p><strong>Legacy Custom modes</strong> (Custom JSON / Custom Form) are still available for backward compatibility.</p>
    `;
  }
  renderCustomProvidersList(listContainer) {
    listContainer.empty();
    const providers = this.plugin.settings.customProviders || [];

    if (providers.length === 0) {
      listContainer.createEl("p", { text: "No custom providers configured yet. Add one below or import a preset template.", cls: "setting-item-description" });
      return;
    }

    for (let i = 0; i < providers.length; i++) {
      const provider = providers[i];
      const isExpanded = this._expandedProviders.has(provider.id);

      const card = listContainer.createDiv({ cls: "custom-provider-card" });
      card.style.cssText = "border:1px solid var(--background-modifier-border);border-radius:8px;padding:12px;margin-bottom:12px;background:var(--background-secondary);";

      const cardHeader = card.createDiv({ cls: "provider-card-header" });
      cardHeader.style.cssText = "display:flex;align-items:center;justify-content:space-between;cursor:pointer;user-select:none;";

      const headerLeft = cardHeader.createDiv({ cls: "provider-header-left" });
      headerLeft.style.cssText = "display:flex;align-items:center;gap:8px;flex:1;min-width:0;";

      const expandIcon = headerLeft.createEl("span", { text: isExpanded ? "\u25BC" : "\u25B6", cls: "provider-expand-icon" });
      expandIcon.style.cssText = "font-size:10px;flex-shrink:0;";

      const nameEl = headerLeft.createEl("strong", { text: provider.name || "Unnamed Provider" });
      nameEl.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;";

      const methodBadge = headerLeft.createEl("span", { text: provider.method || "POST", cls: "provider-method-badge" });
      methodBadge.style.cssText = "font-size:10px;padding:2px 6px;border-radius:3px;background:var(--interactive-accent);color:white;flex-shrink:0;";

      const headerActions = cardHeader.createDiv({ cls: "provider-header-actions" });
      headerActions.style.cssText = "display:flex;gap:4px;flex-shrink:0;margin-left:8px;";

      const moveUpBtn = headerActions.createEl("button", { text: "\u25B2", attr: { "aria-label": "Move up" } });
      moveUpBtn.style.cssText = "padding:2px 6px;font-size:10px;cursor:pointer;border:1px solid var(--background-modifier-border);border-radius:3px;background:var(--background-primary);";
      moveUpBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (i === 0) return;
        const list = this.plugin.settings.customProviders;
        [list[i - 1], list[i]] = [list[i], list[i - 1]];
        await this.plugin.saveSettings();
        this.display();
      });

      const moveDownBtn = headerActions.createEl("button", { text: "\u25BC", attr: { "aria-label": "Move down" } });
      moveDownBtn.style.cssText = "padding:2px 6px;font-size:10px;cursor:pointer;border:1px solid var(--background-modifier-border);border-radius:3px;background:var(--background-primary);";
      moveDownBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (i === providers.length - 1) return;
        const list = this.plugin.settings.customProviders;
        [list[i], list[i + 1]] = [list[i + 1], list[i]];
        await this.plugin.saveSettings();
        this.display();
      });

      const deleteBtn = headerActions.createEl("button", { text: "\uD83D\uDDD1\uFE0F", attr: { "aria-label": "Delete provider" } });
      deleteBtn.style.cssText = "padding:2px 6px;font-size:10px;cursor:pointer;border:1px solid var(--background-modifier-border);border-radius:3px;background:var(--background-primary);color:var(--text-error);";
      deleteBtn.addEventListener("click", async (e) => {
        e.stopPropagation();
        if (confirm(`Delete provider "${provider.name}"?`)) {
          const list = this.plugin.settings.customProviders;
          list.splice(i, 1);
          if (this.plugin.settings.apiProvider === provider.id) {
            this.plugin.settings.apiProvider = "simpletex";
          }
          this._expandedProviders.delete(provider.id);
          await this.plugin.saveSettings();
          this.display();
          new Notice(`Provider "${provider.name}" deleted.`);
        }
      });

      cardHeader.addEventListener("click", () => {
        if (isExpanded) {
          this._expandedProviders.delete(provider.id);
        } else {
          this._expandedProviders.add(provider.id);
        }
        this.display();
      });

      if (isExpanded) {
        const cardBody = card.createDiv({ cls: "provider-card-body" });
        cardBody.style.cssText = "margin-top:12px;padding-top:12px;border-top:1px solid var(--background-modifier-border);";

        new Setting(cardBody)
          .setName("Provider Name")
          .setDesc("Display name shown in the API provider dropdown")
          .addText((text) => text.setPlaceholder("My Custom API").setValue(provider.name || "")
            .onChange(async (value) => { provider.name = value; await this.plugin.saveSettings(); }));

        new Setting(cardBody)
          .setName("Request Method")
          .setDesc("HTTP method for the API request")
          .addDropdown((dropdown) => dropdown
            .addOption("GET", "GET")
            .addOption("POST", "POST")
            .addOption("PUT", "PUT")
            .addOption("DELETE", "DELETE")
            .addOption("PATCH", "PATCH")
            .setValue(provider.method || "POST")
            .onChange(async (value) => { provider.method = value; await this.plugin.saveSettings(); }));

        new Setting(cardBody)
          .setName("Request URL")
          .setDesc("API endpoint URL. Supports {{apiKey}} placeholder which will be replaced with the API Key field value.")
          .addText((text) => text.setPlaceholder("https://api.example.com/recognize").setValue(provider.url || "")
            .onChange(async (value) => { provider.url = value; await this.plugin.saveSettings(); }));

        new Setting(cardBody)
          .setName("Body Type")
          .setDesc("Format of the request body")
          .addDropdown((dropdown) => dropdown
            .addOption("json", "JSON")
            .addOption("form-data", "Form-Data (multipart)")
            .addOption("raw", "Raw Text")
            .setValue(provider.bodyType || "json")
            .onChange(async (value) => { provider.bodyType = value; await this.plugin.saveSettings(); this.display(); }));

        if (provider.bodyType === "form-data") {
          new Setting(cardBody)
            .setName("Image Form Field Name")
            .setDesc("The form field name for the uploaded image (e.g. 'image', 'file')")
            .addText((text) => text.setPlaceholder("image").setValue(provider.formFieldName || "image")
              .onChange(async (value) => { provider.formFieldName = value; await this.plugin.saveSettings(); }));


          // Optional bodyTemplate for form-data: parsed as JSON to auto-generate form fields
          new Setting(cardBody)
            .setName("Body Template (optional)")
            .setDesc("Optional JSON template. Each key becomes a form field (values support {{prompt}}, {{apiKey}}, {{image}}, {{image_base64}}). Merged with Additional Form Fields below.")
            .addTextArea((text) => {
              text.setPlaceholder('{"prompt": "{{prompt}}", "model": "my-model"}');
              text.setValue(provider.bodyTemplate || "");
              text.inputEl.style.cssText = "font-family:monospace;font-size:12px;min-height:60px;";
              text.onChange(async (value) => { provider.bodyTemplate = value; await this.plugin.saveSettings(); });
            });

          // Additional form fields
          const formFieldsSection = cardBody.createDiv({ cls: "provider-formfields-section" });
          formFieldsSection.createEl("h4", { text: "Additional Form Fields" });
          formFieldsSection.createEl("p", { text: "Add extra form-data fields (e.g. prompt, model). Values support {{prompt}}, {{apiKey}} placeholders.", cls: "setting-item-description" });

          const formFieldsList = formFieldsSection.createDiv({ cls: "provider-formfields-list" });
          const renderFormFields = () => {
            formFieldsList.empty();
            const fields = provider.formFields || [];
            for (let fi = 0; fi < fields.length; fi++) {
              const field = fields[fi];
              const row = formFieldsList.createDiv({ cls: "provider-header-row" });
              row.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:6px;";

              const nameInput = row.createEl("input", { type: "text", placeholder: "Field Name", value: field.name || "" });
              nameInput.style.cssText = "flex:1;min-width:0;padding:4px 8px;font-size:12px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);";
              nameInput.addEventListener("input", async () => { field.name = nameInput.value; await this.plugin.saveSettings(); });

              const valueInput = row.createEl("input", { type: "text", placeholder: "Field Value", value: field.value || "" });
              valueInput.style.cssText = "flex:2;min-width:0;padding:4px 8px;font-size:12px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);font-family:monospace;";
              valueInput.addEventListener("input", async () => { field.value = valueInput.value; await this.plugin.saveSettings(); });

              const removeBtn = row.createEl("button", { text: "\u2715", attr: { "aria-label": "Remove field" } });
              removeBtn.style.cssText = "padding:2px 8px;font-size:12px;cursor:pointer;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-error);flex-shrink:0;";
              removeBtn.addEventListener("click", async () => { fields.splice(fi, 1); await this.plugin.saveSettings(); renderFormFields(); });
            }

            const addRow = formFieldsList.createDiv({ cls: "provider-header-row" });
            const addBtn = addRow.createEl("button", { text: "+ Add Form Field" });
            addBtn.style.cssText = "padding:4px 12px;font-size:11px;cursor:pointer;border:1px dashed var(--background-modifier-border);border-radius:4px;background:transparent;";
            addBtn.addEventListener("click", async () => {
              if (!provider.formFields) provider.formFields = [];
              provider.formFields.push({ name: "", value: "" });
              await this.plugin.saveSettings();
              renderFormFields();
            });
          };
          renderFormFields();
        }
        if (provider.bodyType === "json" || provider.bodyType === "raw") {
          new Setting(cardBody)
            .setName("Body Template")
            .setDesc("Template with placeholders: {{image_base64}} (raw base64), {{image}} (data:image/png;base64,...), {{prompt}} (custom prompt), {{apiKey}} (API key).")
            .addTextArea((text) => {
              text.setPlaceholder('{"image": "{{image}}", "prompt": "{{prompt}}"}');
              text.setValue(provider.bodyTemplate || "");
              text.inputEl.style.cssText = "font-family:monospace;font-size:12px;min-height:100px;";
              text.onChange(async (value) => { provider.bodyTemplate = value; await this.plugin.saveSettings(); });
            });
        }

        const headersSection = cardBody.createDiv({ cls: "provider-headers-section" });
        headersSection.createEl("h4", { text: "Request Headers" });
        headersSection.createEl("p", { text: "Header values support {{apiKey}} placeholder. Content-Type is set automatically for JSON and Form-Data unless overridden.", cls: "setting-item-description" });

        const headersList = headersSection.createDiv({ cls: "provider-headers-list" });
        const renderHeaders = () => {
          headersList.empty();
          const headers = provider.headers || [];
          for (let hi = 0; hi < headers.length; hi++) {
            const header = headers[hi];
            const row = headersList.createDiv({ cls: "provider-header-row" });
            row.style.cssText = "display:flex;gap:6px;align-items:center;margin-bottom:6px;";

            const keyInput = row.createEl("input", { type: "text", placeholder: "Header Name", value: header.key || "" });
            keyInput.style.cssText = "flex:1;min-width:0;padding:4px 8px;font-size:12px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);";
            keyInput.addEventListener("input", async () => { header.key = keyInput.value; await this.plugin.saveSettings(); });

            const valueInput = row.createEl("input", { type: "text", placeholder: "Header Value", value: header.value || "" });
            valueInput.style.cssText = "flex:2;min-width:0;padding:4px 8px;font-size:12px;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);font-family:monospace;";
            valueInput.addEventListener("input", async () => { header.value = valueInput.value; await this.plugin.saveSettings(); });

            const removeBtn = row.createEl("button", { text: "\u2715", attr: { "aria-label": "Remove header" } });
            removeBtn.style.cssText = "padding:2px 8px;font-size:12px;cursor:pointer;border:1px solid var(--background-modifier-border);border-radius:4px;background:var(--background-primary);color:var(--text-error);flex-shrink:0;";
            removeBtn.addEventListener("click", async () => { headers.splice(hi, 1); await this.plugin.saveSettings(); renderHeaders(); });
          }

          const addRow = headersList.createDiv({ cls: "provider-header-row" });
          const addBtn = addRow.createEl("button", { text: "+ Add Header" });
          addBtn.style.cssText = "padding:4px 12px;font-size:11px;cursor:pointer;border:1px dashed var(--background-modifier-border);border-radius:4px;background:transparent;";
          addBtn.addEventListener("click", async () => {
            if (!provider.headers) provider.headers = [];
            provider.headers.push({ key: "", value: "" });
            await this.plugin.saveSettings();
            renderHeaders();
          });
        };
        renderHeaders();

        new Setting(cardBody)
          .setName("Response Type")
          .setDesc("How to parse the API response")
          .addDropdown((dropdown) => dropdown
            .addOption("json", "JSON (use path below)")
            .addOption("regex", "Text (use regex below)")
            .setValue(provider.responseType || "json")
            .onChange(async (value) => { provider.responseType = value; await this.plugin.saveSettings(); this.display(); }));

        if (provider.responseType === "json") {
          new Setting(cardBody)
            .setName("Response JSON Path")
            .setDesc("Dot-path (e.g. data.latex) or JSONPath (e.g. $.choices.0.message.content). Supports array index like items.0.name.")
            .addText((text) => text.setPlaceholder("data.latex").setValue(provider.responsePath || "")
              .onChange(async (value) => { provider.responsePath = value; await this.plugin.saveSettings(); }));
        }

        if (provider.responseType === "regex") {
          new Setting(cardBody)
            .setName("Response Regex")
            .setDesc("Regular expression with a capture group to extract LaTeX. The first capture group is used, or the full match if no group.")
            .addText((text) => {
              text.setPlaceholder("\\\\begin\\{document\\}([\\\\s\\\\S]*?)\\\\end\\{document\\}");
              text.setValue(provider.responseRegex || "");
              text.inputEl.style.cssText = "font-family:monospace;font-size:12px;";
              text.onChange(async (value) => { provider.responseRegex = value; await this.plugin.saveSettings(); });
            });
        }

        new Setting(cardBody)
          .setName("Error Path (optional)")
          .setDesc("Dot-path to extract error message from error responses (e.g. error.message). Leave blank for default error handling.")
          .addText((text) => text.setPlaceholder("error.message").setValue(provider.errorPath || "")
            .onChange(async (value) => { provider.errorPath = value; await this.plugin.saveSettings(); }));

        new Setting(cardBody)
          .setName("Duplicate Provider")
          .setDesc("Create a copy of this provider configuration")
          .addButton((btn) => btn.setButtonText("\uD83D\DCCB Duplicate").onClick(async () => {
            const list = this.plugin.settings.customProviders;
            const clone = JSON.parse(JSON.stringify(provider));
            clone.id = "custom_" + Date.now() + "_" + Math.random().toString(36).substring(2, 8);
            clone.name = (clone.name || "Provider") + " (Copy)";
            list.splice(i + 1, 0, clone);
            await this.plugin.saveSettings();
            this.display();
            new Notice(`Provider "${clone.name}" duplicated.`);
          }));
      }
    }
  }
}

module.exports = HandwritingLatexPlugin;
/* nosourcemap */