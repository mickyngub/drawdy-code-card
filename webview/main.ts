import type { DriverToWebview, WebviewToDriver } from "../src/shared/messages";
import {
    AUTO_LANGUAGE,
    COLUMNS,
    DEFAULT_OPTIONS,
    FONT_IDS,
    FONT_SIZE,
    GRADIENT_IDS,
    MAX_CODE_LENGTH,
    MAX_HIGHLIGHT_LENGTH,
    MAX_LINES,
    MAX_TITLE_LENGTH,
    PADDINGS,
    RADIUS,
    START_LINE,
    TAB_SIZES,
    THEME_IDS,
    normaliseCode,
    rememberedStyle,
    restoreStyle,
    type CardOptions,
    type CardSpec,
    type Chrome,
    type FontId,
    type Padding,
    type Shadow,
    type TabSize,
    type ThemeId,
    type WidthMode,
} from "../src/shared/spec";
import { encodeCard } from "./export";
import { fontFailed, loadFont, makeMeasure } from "./fonts";
import { highlightCode, loadHighlighter } from "./highlighter";
import { GRADIENTS } from "./lib/backgrounds";
import {
    CHIP_ROW,
    COLOUR_INPUT,
    FIELD,
    FOOTER_SECONDARY,
    HINT,
    LABEL_ROW,
    PRIMARY,
    SECONDARY,
} from "./lib/classes";
import { FONT_NAMES, fontStack } from "./lib/font-faces";
import { plainLines, splitHighlightedHtml, type Line } from "./lib/hljs-html";
import { isField, keyAction } from "./lib/keys";
import { LANGUAGES, languageName } from "./lib/languages";
import {
    SOFT_EXPORT_SCALE,
    exportScale,
    layoutCard,
    scaleLabel,
    type CardLayout,
    type Measure,
} from "./lib/layout";
import { parseLineRanges } from "./lib/ranges";
import { THEMES } from "./lib/themes";
import { drawCard, type CardFont } from "./render";
import {
    button,
    el,
    makeNumberInput,
    makeRule,
    makeSegmented,
    makeSegmentedField,
    makeSelect,
    makeSlider,
    makeSwatchRow,
    makeTextInput,
    makeToggle,
    type Control,
} from "./ui";

type DrawdyWebviewApi = {
    postMessage(message: unknown, transfer?: Transferable[]): void;
    onMessage(listener: (message: unknown) => void): () => void;
};

declare function acquireDrawdyApi(): DrawdyWebviewApi;

const SETTINGS_DEBOUNCE_MS = 400;
const TYPING_DELAY_MS = 150;
const REPLY_TIMEOUT_MS = 20000;
const CONFIRM_MS = 4000;
const PREVIEW_INSET = 16;
const CLEAR_SWATCH =
    "bg-white bg-[linear-gradient(45deg,transparent_45%,var(--color-danger)_45%,var(--color-danger)_55%,transparent_55%)]";
const HIGHLIGHT_HINT = "Line numbers as shown, for example 3-5, 8.";
const SAMPLE_LABEL = "Try a sample";
const SAMPLE_TITLE = "debounce.ts";
const SAMPLE_CODE = `// Wait until the typing stops, then run once.
export function debounce<T extends unknown[]>(
    fn: (...args: T) => void,
    ms = 300
) {
    let timer: ReturnType<typeof setTimeout> | undefined;
    return (...args: T) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}`;

const api = acquireDrawdyApi();
const byId = <T extends HTMLElement>(id: string) =>
    document.getElementById(id) as T;

const tabCode = byId<HTMLButtonElement>("tab-code");
const tabStyle = byId<HTMLButtonElement>("tab-style");
const panelCode = byId<HTMLElement>("panel-code");
const panelStyle = byId<HTMLElement>("panel-style");
const banner = byId<HTMLDivElement>("edit-banner");
const stopEditButton = byId<HTMLButtonElement>("stop-edit");
const previewCanvas = byId<HTMLCanvasElement>("preview");
const previewZoom = byId<HTMLButtonElement>("preview-zoom");
const previewEmpty = byId<HTMLDivElement>("preview-empty");
const previewEmptyText = byId<HTMLSpanElement>("preview-empty-text");
const sampleButton = byId<HTMLButtonElement>("sample");
const previewFull = byId<HTMLDivElement>("preview-full");
const previewFullCanvas = byId<HTMLCanvasElement>("preview-full-canvas");
const previewClose = byId<HTMLButtonElement>("preview-close");
const readout = byId<HTMLSpanElement>("readout");
const readoutWarn = byId<HTMLSpanElement>("readout-warn");
const retryButton = byId<HTMLButtonElement>("retry");
const languageSelect = byId<HTMLSelectElement>("language");
const tabSizeRow = byId<HTMLDivElement>("tab-size");
const codeBox = byId<HTMLTextAreaElement>("code");
const statusLine = byId<HTMLDivElement>("status");
const editSelectedButton = byId<HTMLButtonElement>("edit-selected");
const placeButton = byId<HTMLButtonElement>("place");
const updateButton = byId<HTMLButtonElement>("update");
const EMPTY_TEXT = previewEmptyText.textContent ?? "";

let options: CardOptions = { ...DEFAULT_OPTIONS };
let language = AUTO_LANGUAGE;
let highlighter: "loading" | "ready" | "failed" = "loading";
let highlighterReady: Promise<boolean> = Promise.resolve(false);
let cache: { key: string; lines: Line[]; detected: string | null } | null =
    null;
let current: {
    layout: CardLayout;
    lineCount: number;
    detected: string | null;
    plain: boolean;
} | null = null;
let problem: string | null = null;
let editing = false;
let busy = false;
let busyTimer = 0;
let settingsTimer = 0;
let sampleTimer = 0;
let renderTimer = 0;
let renderToken = 0;
const measures = new Map<FontId, Measure>();

function send(message: WebviewToDriver): void {
    api.postMessage(message);
}

function setStatus(text: string, tone: "" | "good" | "bad" = ""): void {
    statusLine.textContent = text;
    statusLine.dataset.tone = tone;
}

function measureFor(font: FontId): Measure {
    let measure = measures.get(font);
    if (!measure) {
        measure = makeMeasure(font);
        measures.set(font, measure);
    }
    return measure;
}

const cardFont = (): CardFont => ({
    stack: fontStack(options.font),
    ligatures: options.ligatures,
});

function cardCode(): string {
    return normaliseCode(codeBox.value).replace(/\s+$/, "");
}

function limitProblem(code: string): string | null {
    if (code.length > MAX_CODE_LENGTH) {
        return `That is ${code.length.toLocaleString(
            "en-US"
        )} characters. A card holds at most ${MAX_CODE_LENGTH.toLocaleString(
            "en-US"
        )}.`;
    }
    const lines = code.split("\n").length;
    if (lines > MAX_LINES) {
        return `That is ${lines} lines. A card holds at most ${MAX_LINES}.`;
    }
    return null;
}

function tokenise(code: string): {
    lines: Line[];
    detected: string | null;
    plain: boolean;
} {
    const key = `${language}\n${code}`;
    if (cache?.key === key) return { ...cache, plain: false };
    const result =
        highlighter === "ready" ? highlightCode(code, language) : null;
    if (!result)
        return { lines: plainLines(code), detected: null, plain: true };
    cache = {
        key,
        lines: splitHighlightedHtml(result.html),
        detected: result.detected,
    };
    return { ...cache, plain: false };
}

function languageLabel(): string {
    if (highlighter === "failed") return "no highlighting";
    if (highlighter === "loading") return "loading the highlighter";
    if (language !== AUTO_LANGUAGE) return languageName(language);
    return current?.detected
        ? `${languageName(current.detected)}, detected`
        : "no language detected";
}

function updateReadout(): void {
    retryButton.hidden = highlighter !== "failed";
    if (!current) {
        readout.textContent = "";
        readoutWarn.hidden = true;
        return;
    }
    const { layout, lineCount } = current;
    const scale = exportScale(layout.width, layout.height);
    readout.textContent =
        `${Math.round(layout.width)} × ${Math.round(
            layout.height
        )} px · ${lineCount} ${
            lineCount === 1 ? "line" : "lines"
        } · ${languageLabel()}` +
        (scale < 2 ? ` · exports at ${scaleLabel(scale)}` : "");
    readoutWarn.hidden = scale >= SOFT_EXPORT_SCALE;
}

function updateChrome(): void {
    const ready = current !== null;
    placeButton.disabled = !ready || busy;
    updateButton.disabled = !ready || busy;
    placeButton.textContent = editing ? "Place as new" : "Place on board";
    placeButton.className = editing ? FOOTER_SECONDARY : PRIMARY;
    updateButton.hidden = !editing;
    banner.hidden = !editing;
}

function paintInto(
    canvas: HTMLCanvasElement,
    roomW: number,
    roomH: number,
    layout: CardLayout,
    plain: boolean
): boolean {
    if (roomW <= 0 || roomH <= 0) return false;
    const fit = Math.min(roomW / layout.width, roomH / layout.height, 1);
    const dpr = window.devicePixelRatio || 1;
    const cssW = Math.max(1, Math.round(layout.width * fit));
    const cssH = Math.max(1, Math.round(layout.height * fit));
    canvas.style.width = `${cssW}px`;
    canvas.style.height = `${cssH}px`;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    canvas.toggleAttribute(
        "data-checker",
        options.background === "transparent"
    );
    drawCard(
        canvas,
        layout,
        options,
        THEMES[options.theme],
        cardFont(),
        canvas.width / layout.width,
        plain
    );
    return true;
}

function paintPreview(layout: CardLayout, plain: boolean): void {
    const box = previewCanvas.parentElement as HTMLElement;
    const painted = paintInto(
        previewCanvas,
        box.clientWidth - PREVIEW_INSET,
        box.clientHeight - PREVIEW_INSET,
        layout,
        plain
    );
    if (!painted) return;
    previewCanvas.hidden = false;
    previewZoom.hidden = false;
    previewEmpty.hidden = true;
    if (!previewFull.hidden) paintFull();
}

function paintFull(): void {
    if (!current) {
        closeFull();
        return;
    }
    const closeRoom = previewClose.offsetHeight + 8;
    paintInto(
        previewFullCanvas,
        window.innerWidth - 24,
        window.innerHeight - 24 - closeRoom,
        current.layout,
        current.plain
    );
}

function openFull(): void {
    if (!current) return;
    previewFull.hidden = false;
    paintFull();
    previewClose.focus();
}

function closeFull(): void {
    if (previewFull.hidden) return;
    previewFull.hidden = true;
    if (!previewZoom.hidden) previewZoom.focus();
}

function showEmpty(text: string): void {
    previewCanvas.hidden = true;
    previewZoom.hidden = true;
    previewEmpty.hidden = false;
    previewEmptyText.textContent = text;
    sampleButton.hidden = cardCode() !== "";
    closeFull();
}

function scheduleRender(delay = 0): void {
    if (renderTimer) clearTimeout(renderTimer);
    renderTimer = setTimeout(() => {
        renderTimer = 0;
        void render();
    }, delay) as unknown as number;
}

async function render(): Promise<void> {
    const token = ++renderToken;
    const code = cardCode();
    const nextProblem = code === "" ? null : limitProblem(code);
    if (problem && statusLine.textContent === problem) setStatus("");
    problem = nextProblem;
    if (code === "" || problem) {
        current = null;
        showEmpty(problem ?? EMPTY_TEXT);
        if (problem) setStatus(problem, "bad");
        updateReadout();
        updateChrome();
        return;
    }
    await loadFont(options.font, code);
    if (token !== renderToken) return;
    const { lines, detected, plain } = tokenise(code);
    const layout = layoutCard(lines, options, measureFor(options.font));
    current = { layout, lineCount: lines.length, detected, plain };
    paintPreview(layout, plain);
    updateReadout();
    updateChrome();
}

// A card loaded for editing brings its own style, which must not become the remembered one.
function queueSettings(): void {
    if (settingsTimer) clearTimeout(settingsTimer);
    settingsTimer = 0;
    if (editing) return;
    settingsTimer = setTimeout(
        flushSettings,
        SETTINGS_DEBOUNCE_MS
    ) as unknown as number;
}

function flushSettings(): void {
    if (settingsTimer) clearTimeout(settingsTimer);
    settingsTimer = 0;
    if (editing) return;
    send({ type: "settings", settings: { options: rememberedStyle(options) } });
}

const controls: {
    theme?: Control<string>;
    font?: Control<FontId>;
    fontSize?: Control<number>;
    ligatures?: Control<boolean>;
    lineNumbers?: Control<boolean>;
    startLine?: Control<number> & { input: HTMLInputElement };
    highlight?: ReturnType<typeof makeTextInput>;
    highlightNote?: HTMLParagraphElement;
    chrome?: Control<Chrome>;
    title?: Control<string> & { input: HTMLInputElement };
    background?: ReturnType<typeof makeSwatchRow>;
    solidPicker?: HTMLInputElement;
    padding?: Control<Padding>;
    radius?: Control<number>;
    shadow?: Control<Shadow>;
    width?: Control<WidthMode>;
    columns?: Control<number> & { input: HTMLInputElement };
    tabSize?: Control<TabSize>;
} = {};

function syncCodeBox(): void {
    codeBox.style.fontFamily = fontStack(options.font);
    codeBox.style.fontVariantLigatures = options.ligatures ? "normal" : "none";
    codeBox.style.tabSize = String(options.tabSize);
}

function syncDependents(): void {
    if (controls.startLine)
        controls.startLine.input.disabled = !options.lineNumbers;
    if (controls.title)
        controls.title.input.disabled = options.chrome === "none";
    if (controls.columns)
        controls.columns.input.disabled = options.width === "auto";
    const solid = controls.background?.nodes.get("solid");
    if (solid) solid.style.background = options.solid;
    const { invalid } = parseLineRanges(options.highlight);
    if (controls.highlightNote && controls.highlight) {
        const bad = invalid.length > 0;
        controls.highlightNote.textContent = bad
            ? `Skipped ${invalid
                  .map((part) => `"${part}"`)
                  .join(", ")}. ${HIGHLIGHT_HINT}`
            : HIGHLIGHT_HINT;
        controls.highlightNote.dataset.tone = bad ? "bad" : "";
        controls.highlight.input.setAttribute("aria-invalid", String(bad));
    }
    syncCodeBox();
}

function commit(next: Partial<CardOptions>): void {
    options = { ...options, ...next };
    syncDependents();
    scheduleRender();
    queueSettings();
}

function pushControls(): void {
    controls.theme?.set(options.theme);
    controls.font?.set(options.font);
    controls.fontSize?.set(options.fontSize);
    controls.ligatures?.set(options.ligatures);
    controls.lineNumbers?.set(options.lineNumbers);
    controls.startLine?.set(options.startLine);
    controls.highlight?.set(options.highlight);
    controls.chrome?.set(options.chrome);
    controls.title?.set(options.title);
    controls.background?.set(options.background);
    if (controls.solidPicker) controls.solidPicker.value = options.solid;
    controls.padding?.set(options.padding);
    controls.radius?.set(options.radius);
    controls.shadow?.set(options.shadow);
    controls.width?.set(options.width);
    controls.columns?.set(options.columns);
    controls.tabSize?.set(options.tabSize);
    syncDependents();
}

function buildStyleControls(): void {
    const parent = panelStyle;
    controls.theme = makeSelect(
        parent,
        "Theme",
        THEME_IDS.map((id) => [id, THEMES[id].name]),
        options.theme,
        (theme) => commit({ theme: theme as ThemeId })
    );
    controls.font = makeSegmentedField<FontId>(
        parent,
        "Font",
        FONT_IDS.map((id) => [id, FONT_NAMES[id]]),
        options.font,
        (font) => commit({ font })
    );
    controls.fontSize = makeSlider(
        parent,
        { label: "Font size", ...FONT_SIZE, step: 1, unit: "px" },
        options.fontSize,
        (fontSize) => commit({ fontSize })
    );

    const shown = el("div", FIELD, parent);
    const shownHead = el("div", LABEL_ROW, shown);
    el("span", undefined, shownHead).textContent = "Text";
    const toggles = el("div", CHIP_ROW, shown);
    toggles.setAttribute("role", "group");
    toggles.setAttribute("aria-label", "Text");
    controls.ligatures = makeToggle(
        toggles,
        "Ligatures",
        options.ligatures,
        (ligatures) => commit({ ligatures })
    );
    controls.lineNumbers = makeToggle(
        toggles,
        "Line numbers",
        options.lineNumbers,
        (lineNumbers) => commit({ lineNumbers })
    );
    controls.startLine = makeNumberInput(
        shown,
        "First line number",
        START_LINE,
        options.startLine,
        (startLine) => commit({ startLine })
    );

    controls.highlight = makeTextInput(
        parent,
        "Highlight lines",
        "3-5, 8",
        MAX_HIGHLIGHT_LENGTH,
        (highlight) => commit({ highlight })
    );
    controls.highlightNote = el("p", HINT, controls.highlight.wrap);
    controls.highlightNote.id = "highlight-note";
    controls.highlight.input.setAttribute("aria-describedby", "highlight-note");

    makeRule(parent);
    controls.chrome = makeSegmentedField<Chrome>(
        parent,
        "Window",
        [
            ["dots", "Three dots"],
            ["none", "None"],
        ],
        options.chrome,
        (chrome) => commit({ chrome })
    );
    controls.title = makeTextInput(
        parent,
        "File name",
        "app.ts",
        MAX_TITLE_LENGTH,
        (title) => commit({ title })
    );

    controls.background = makeSwatchRow(
        parent,
        "Background",
        [
            ...GRADIENT_IDS.map((id) => ({
                value: id,
                label: `${GRADIENTS[id].name} gradient`,
                css: `linear-gradient(135deg, ${GRADIENTS[id].from}, ${GRADIENTS[id].to})`,
            })),
            { value: "solid", label: "Solid colour", css: options.solid },
            {
                value: "transparent",
                label: "Transparent",
                css: "",
                className: CLEAR_SWATCH,
            },
        ],
        options.background,
        (background) =>
            commit({ background: background as CardOptions["background"] })
    );
    const picker = el("input", COLOUR_INPUT, controls.background.row);
    picker.type = "color";
    picker.value = options.solid;
    picker.setAttribute("aria-label", "Solid colour, any colour");
    picker.addEventListener("input", () => {
        controls.background?.set("solid");
        commit({ background: "solid", solid: picker.value.toLowerCase() });
    });
    controls.solidPicker = picker;

    controls.padding = makeSegmentedField<Padding>(
        parent,
        "Padding",
        PADDINGS.map((p) => [p, `${p}`]),
        options.padding,
        (padding) => commit({ padding })
    );
    controls.radius = makeSlider(
        parent,
        { label: "Corner radius", ...RADIUS, step: 1, unit: "px" },
        options.radius,
        (radius) => commit({ radius })
    );
    controls.shadow = makeSegmentedField<Shadow>(
        parent,
        "Shadow",
        [
            ["none", "None"],
            ["soft", "Soft"],
            ["strong", "Strong"],
        ],
        options.shadow,
        (shadow) => commit({ shadow })
    );
    const widthField = makeSegmentedField<WidthMode>(
        parent,
        "Width",
        [
            ["auto", "Fit the code"],
            ["columns", "Fixed, wrap long lines"],
        ],
        options.width,
        (width) => commit({ width })
    );
    controls.width = widthField;
    controls.columns = makeNumberInput(
        widthField.wrap,
        "Columns",
        COLUMNS,
        options.columns,
        (columns) => commit({ columns })
    );

    makeRule(parent);
    const resetRow = el("div", "flex items-center gap-3", parent);
    el("span", `${HINT} min-w-0 flex-1`, resetRow).textContent =
        "Style settings are remembered for next time, except the file name and highlighted lines.";
    button(resetRow, SECONDARY, "Reset style", () => {
        options = {
            ...DEFAULT_OPTIONS,
            title: options.title,
            highlight: options.highlight,
        };
        pushControls();
        scheduleRender();
        queueSettings();
        setStatus("Style reset to the defaults.");
    });
}

function buildCodeControls(): void {
    for (const [value, caption] of [
        [AUTO_LANGUAGE, "Auto detect"],
        ...LANGUAGES,
    ]) {
        const option = el("option", undefined, languageSelect);
        option.value = value;
        option.textContent = caption;
    }
    languageSelect.value = language;
    languageSelect.addEventListener("change", () => {
        language = languageSelect.value;
        scheduleRender();
    });
    controls.tabSize = makeSegmented<TabSize>(
        tabSizeRow,
        TAB_SIZES.map((size) => [size, String(size)]),
        options.tabSize,
        (tabSize) => commit({ tabSize })
    );
}

function replaceRange(
    from: number,
    to: number,
    text: string,
    selStart: number,
    selEnd: number
): void {
    codeBox.focus();
    codeBox.setSelectionRange(from, to);
    // insertText keeps the change on the textarea's own undo stack.
    const ok =
        text === ""
            ? document.execCommand("delete")
            : document.execCommand("insertText", false, text);
    if (!ok) codeBox.setRangeText(text, from, to, "end");
    codeBox.setSelectionRange(selStart, selEnd);
    scheduleRender(TYPING_DELAY_MS);
}

function indent(outdent: boolean): void {
    const value = codeBox.value;
    const start = codeBox.selectionStart;
    const end = codeBox.selectionEnd;
    const size = options.tabSize;
    const lineStart = value.lastIndexOf("\n", start - 1) + 1;
    if (!outdent && !value.slice(start, end).includes("\n")) {
        const spaces = size - ((start - lineStart) % size);
        replaceRange(
            start,
            end,
            " ".repeat(spaces),
            start + spaces,
            start + spaces
        );
        return;
    }
    const last = end > start && value[end - 1] === "\n" ? end - 1 : end;
    const lineEnd = value.indexOf("\n", last);
    const stop = lineEnd < 0 ? value.length : lineEnd;
    let firstShift = 0;
    const lines = value
        .slice(lineStart, stop)
        .split("\n")
        .map((line, i) => {
            let shift: number;
            let next: string;
            if (outdent) {
                const lead = /^( +|\t)/.exec(line)?.[1] ?? "";
                const cut = lead === "\t" ? 1 : Math.min(lead.length, size);
                shift = -cut;
                next = line.slice(cut);
            } else {
                shift = size;
                next = " ".repeat(size) + line;
            }
            if (i === 0) firstShift = shift;
            return next;
        });
    const text = lines.join("\n");
    if (start === end) {
        const caret = Math.max(lineStart, start + firstShift);
        replaceRange(lineStart, stop, text, caret, caret);
    } else {
        replaceRange(lineStart, stop, text, lineStart, lineStart + text.length);
    }
}

function selectTab(which: "code" | "style", focus = false): void {
    const code = which === "code";
    tabCode.setAttribute("aria-selected", String(code));
    tabStyle.setAttribute("aria-selected", String(!code));
    tabCode.tabIndex = code ? 0 : -1;
    tabStyle.tabIndex = code ? -1 : 0;
    panelCode.hidden = !code;
    panelStyle.hidden = code;
    if (focus) (code ? tabCode : tabStyle).focus();
}

function setBusy(next: boolean): void {
    busy = next;
    if (busyTimer) clearTimeout(busyTimer);
    busyTimer = 0;
    updateChrome();
}

// The reply clock starts once the card is sent, so a slow highlighter or font load can't re-enable the button mid-send.
function awaitReply(): void {
    if (busyTimer) clearTimeout(busyTimer);
    busyTimer = setTimeout(() => {
        busyTimer = 0;
        setBusy(false);
        setStatus("Drawdy didn't answer. Try again.", "bad");
    }, REPLY_TIMEOUT_MS) as unknown as number;
}

async function sendCard(mode: "place" | "update"): Promise<void> {
    const code = cardCode();
    if (busy || code === "" || limitProblem(code)) return;
    setBusy(true);
    setStatus(mode === "update" ? "Updating…" : "Placing…");
    try {
        if (highlighter === "loading") await highlighterReady;
        await loadFont(options.font, code);
        const { lines, plain } = tokenise(code);
        const layout = layoutCard(lines, options, measureFor(options.font));
        const snapshot = { ...options };
        const theme = THEMES[snapshot.theme];
        const font = cardFont();
        const encoded = encodeCard(
            layout.width,
            layout.height,
            snapshot.background === "transparent",
            (canvas, scale) =>
                drawCard(canvas, layout, snapshot, theme, font, scale, plain)
        );
        const spec: CardSpec = { code, language, options: snapshot };
        send({
            type: mode,
            ...encoded,
            width: layout.width,
            height: layout.height,
            spec,
        });
        awaitReply();
    } catch {
        setBusy(false);
        setStatus("The code card could not be drawn. Try again.", "bad");
    }
}

function loadSample(): void {
    if (editing) {
        setEditing(false);
        send({ type: "stop-edit" });
    }
    codeBox.value = SAMPLE_CODE;
    language = "typescript";
    languageSelect.value = language;
    if (options.title.trim() === "") {
        options = { ...options, title: SAMPLE_TITLE };
        pushControls();
    }
    selectTab("code");
    scheduleRender();
    setStatus("Loaded a sample. Click Place on board to add it.");
}

function resetSampleButton(): void {
    if (sampleTimer) clearTimeout(sampleTimer);
    sampleTimer = 0;
    sampleButton.textContent = SAMPLE_LABEL;
}

function onSampleClick(): void {
    if (codeBox.value.trim() !== "" && !sampleTimer) {
        sampleButton.textContent = "Replace your data?";
        sampleTimer = setTimeout(
            resetSampleButton,
            CONFIRM_MS
        ) as unknown as number;
        return;
    }
    resetSampleButton();
    loadSample();
}

function setEditing(next: boolean): void {
    editing = next;
    updateChrome();
}

function startHighlighter(): void {
    highlighter = "loading";
    updateReadout();
    highlighterReady = loadHighlighter().then((ok) => {
        highlighter = ok ? "ready" : "failed";
        cache = null;
        if (ok) {
            if (statusLine.dataset.tone === "bad") setStatus("");
        } else {
            setStatus(
                "Could not load the highlighter from jsDelivr, so the card is one colour. Check your connection, then click Try again.",
                "bad"
            );
        }
        scheduleRender();
        return ok;
    });
}

function wire(): void {
    codeBox.addEventListener("input", () => scheduleRender(TYPING_DELAY_MS));
    codeBox.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            event.stopPropagation();
            (placeButton.disabled ? tabCode : placeButton).focus();
            return;
        }
        if (event.key !== "Tab" || event.isComposing) return;
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        event.preventDefault();
        indent(event.shiftKey);
    });
    placeButton.addEventListener("click", () => void sendCard("place"));
    updateButton.addEventListener("click", () => void sendCard("update"));
    editSelectedButton.addEventListener("click", () => {
        setStatus("Reading the selected card…");
        send({ type: "edit-selected" });
    });
    stopEditButton.addEventListener("click", () => {
        setEditing(false);
        send({ type: "stop-edit" });
        setStatus("Stopped editing. Place on board adds a new code card.");
    });
    sampleButton.addEventListener("click", onSampleClick);
    previewZoom.addEventListener("click", openFull);
    previewFull.addEventListener("click", closeFull);
    retryButton.addEventListener("click", () => {
        setStatus("Loading the highlighter…");
        startHighlighter();
    });
    tabCode.addEventListener("click", () => selectTab("code"));
    tabStyle.addEventListener("click", () => selectTab("style"));
    for (const tab of [tabCode, tabStyle]) {
        tab.addEventListener("keydown", (event) => {
            if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
            event.preventDefault();
            selectTab(tab === tabCode ? "style" : "code", true);
        });
    }
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !previewFull.hidden) {
            event.preventDefault();
            closeFull();
            return;
        }
        const action = keyAction(event, isField(event.target));
        if (!action) return;
        event.preventDefault();
        if (action === "blur") (event.target as HTMLElement).blur();
        else send({ type: action });
    });
    window.addEventListener("resize", () => scheduleRender());
}

function placedText(
    message: Extract<DriverToWebview, { type: "placed" }>
): string {
    if (message.mode === "new") {
        return "Placed the code card. Press ⌘Z or Ctrl+Z to undo.";
    }
    const times =
        message.undoSteps === 2 ? "twice" : `${message.undoSteps} times`;
    return `Updated the code card${
        message.rotationReset ? " (rotation reset)" : ""
    }. Press ⌘Z or Ctrl+Z ${times} to get the old version back.`;
}

function handle(message: DriverToWebview): void {
    switch (message.type) {
        case "init": {
            const raw = message.settings?.options;
            if (raw) options = restoreStyle(options, raw);
            pushControls();
            scheduleRender();
            return;
        }
        case "theme": {
            const node = document.getElementById("drawdy-styling");
            if (node) node.textContent = `:root{${message.cssVars}}`;
            return;
        }
        case "selection": {
            editSelectedButton.hidden = !message.editable;
            return;
        }
        case "load": {
            const spec = message.spec;
            flushSettings();
            resetSampleButton();
            codeBox.value = spec.code;
            language = LANGUAGES.some(([id]) => id === spec.language)
                ? spec.language
                : AUTO_LANGUAGE;
            languageSelect.value = language;
            options = { ...spec.options };
            pushControls();
            setEditing(true);
            selectTab("code");
            scheduleRender();
            setStatus(
                "Loaded the selected card. Change it, then click Update on board."
            );
            return;
        }
        case "edit-ended": {
            setEditing(false);
            return;
        }
        case "placed": {
            setBusy(false);
            const fallback = fontFailed(options.font)
                ? ` ${FONT_NAMES[options.font]} didn't load, so it used a system font.`
                : "";
            setStatus(placedText(message) + fallback, fallback ? "" : "good");
            return;
        }
        case "error": {
            setBusy(false);
            setStatus(message.message, "bad");
            return;
        }
    }
}

buildCodeControls();
buildStyleControls();
pushControls();
wire();
updateChrome();
showEmpty(EMPTY_TEXT);
startHighlighter();

api.onMessage((raw) => {
    if (!raw || typeof raw !== "object") return;
    handle(raw as DriverToWebview);
});

send({ type: "ready" });
