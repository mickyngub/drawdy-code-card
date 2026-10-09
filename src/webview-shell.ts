import { fontFaceCss } from "../webview/lib/font-faces";

const CSS = `
* { box-sizing: border-box; }
html, body { margin: 0; height: 100%; }
body {
    font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
    background: var(--drawdy-background, #ffffff);
    color: var(--drawdy-foreground, #111111);
    font-size: 12px;
    line-height: 1.4;
    height: 100vh;
    display: flex;
    flex-direction: column;
    overflow: hidden;
    -webkit-font-smoothing: antialiased;
}
button, input, select, textarea { font: inherit; color: inherit; }
[hidden] { display: none !important; }
:focus-visible { outline: 2px solid var(--drawdy-primary, #4f46e5); outline-offset: 1px; }

.tabs {
    flex: none;
    display: flex;
    gap: 2px;
    padding: 8px 12px 0;
    border-bottom: 1px solid var(--drawdy-border, #e5e5e5);
}
.tabs button {
    border: none;
    background: transparent;
    padding: 5px 10px 7px;
    cursor: pointer;
    color: var(--drawdy-muted-foreground, #7a7a7a);
    border-bottom: 2px solid transparent;
    margin-bottom: -1px;
    font-size: 12px;
}
.tabs button:hover { color: var(--drawdy-foreground, #111111); }
.tabs button[aria-selected="true"] {
    color: var(--drawdy-foreground, #111111);
    border-bottom-color: var(--drawdy-primary, #4f46e5);
}

.banner {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 12px;
    font-size: 11px;
    background: color-mix(in srgb, var(--drawdy-primary, #4f46e5) 12%, transparent);
    border-bottom: 1px solid var(--drawdy-border, #e5e5e5);
}
.link {
    border: none;
    background: transparent;
    padding: 2px 0;
    cursor: pointer;
    font-size: 11px;
    text-decoration: underline;
    color: var(--drawdy-foreground, #111111);
}

.preview-wrap { flex: none; padding: 10px 12px 0; display: flex; flex-direction: column; gap: 4px; }
.preview-box {
    position: relative;
    height: 124px;
    border: 1px solid var(--drawdy-border, #e5e5e5);
    border-radius: var(--drawdy-radius-md, 8px);
    background: var(--drawdy-surface, var(--drawdy-background, #ffffff));
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
}
.preview-box canvas { display: block; }
.preview-zoom {
    position: absolute;
    inset: 0;
    border: none;
    padding: 0;
    background: transparent;
    cursor: zoom-in;
}
.preview-full {
    position: fixed;
    inset: 0;
    z-index: 10;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 12px;
    background: var(--drawdy-background, #ffffff);
    cursor: zoom-out;
}
.preview-full canvas { display: block; }
.preview-box canvas.checker {
    background-color: #ffffff;
    background-image:
        linear-gradient(45deg, #e5e7eb 25%, transparent 25%),
        linear-gradient(-45deg, #e5e7eb 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, #e5e7eb 75%),
        linear-gradient(-45deg, transparent 75%, #e5e7eb 75%);
    background-size: 12px 12px;
    background-position: 0 0, 0 6px, 6px -6px, -6px 0;
}
.preview-empty {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    flex-direction: column;
    gap: 8px;
    padding: 16px;
    font-size: 11px;
    color: var(--drawdy-muted-foreground, #7a7a7a);
}
.readout {
    font-size: 10px;
    font-variant-numeric: tabular-nums;
    color: var(--drawdy-muted-foreground, #7a7a7a);
    min-height: 16px;
    display: flex;
    align-items: center;
    gap: 6px;
}
.readout .grow { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.readout .warn { color: var(--drawdy-foreground, #111111); }

.tabpanel {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 8px 12px 10px;
}
.scroll { overflow-y: auto; gap: 10px; }

.lbl, .field-head label, .field-head .label {
    font-size: 10px;
    letter-spacing: 0.02em;
    color: var(--drawdy-muted-foreground, #7a7a7a);
}
.row { display: flex; align-items: center; gap: 6px; }
.row .grow { flex: 1; min-width: 0; }
.select, .text, .number {
    height: 24px;
    padding: 2px 6px;
    border: 1px solid var(--drawdy-border, #e5e5e5);
    border-radius: var(--drawdy-radius-sm, 4px);
    background: var(--drawdy-background, #ffffff);
    font-size: 11px;
}
.select { padding: 2px 4px; }
.text { width: 100%; }
.number { width: 64px; font-variant-numeric: tabular-nums; }
.text:focus, .number:focus, .select:focus { border-color: var(--drawdy-primary, #4f46e5); outline: none; }
.text.bad { border-color: var(--drawdy-destructive, #dc2626); }
.text:disabled, .number:disabled { opacity: 0.4; }

.code-box {
    flex: 1;
    min-height: 80px;
    width: 100%;
    resize: none;
    padding: 8px 10px;
    border: 1px solid var(--drawdy-border, #e5e5e5);
    border-radius: var(--drawdy-radius-md, 8px);
    background: var(--drawdy-surface, transparent);
    font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
    font-size: 12px;
    line-height: 1.5;
    white-space: pre;
    overflow: auto;
    tab-size: 4;
}
.code-box:focus { border-color: var(--drawdy-primary, #4f46e5); outline: none; }
.note { font-size: 10px; color: var(--drawdy-muted-foreground, #7a7a7a); margin: 0; }
.note.bad { color: var(--drawdy-destructive, #dc2626); }

.field { display: flex; flex-direction: column; gap: 4px; }
.field-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 6px;
}
.field-head .value { font-size: 10px; font-variant-numeric: tabular-nums; }
input[type="range"] {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 14px;
    background: transparent;
    cursor: pointer;
}
input[type="range"]::-webkit-slider-runnable-track {
    height: 3px;
    border-radius: 999px;
    background: var(--drawdy-border, #e0e0e0);
}
input[type="range"]::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 11px;
    height: 11px;
    margin-top: -4px;
    border-radius: 50%;
    background: var(--drawdy-primary, #4f46e5);
}
input[type="range"]::-moz-range-track {
    height: 3px;
    border-radius: 999px;
    background: var(--drawdy-border, #e0e0e0);
}
input[type="range"]::-moz-range-thumb {
    width: 11px;
    height: 11px;
    border: none;
    border-radius: 50%;
    background: var(--drawdy-primary, #4f46e5);
}

.seg { display: flex; flex-wrap: wrap; gap: 3px; }
.seg button {
    flex: 1 1 auto;
    min-width: 0;
    padding: 3px 6px;
    border: 1px solid var(--drawdy-border, #e5e5e5);
    background: transparent;
    color: var(--drawdy-muted-foreground, #7a7a7a);
    border-radius: var(--drawdy-radius-sm, 4px);
    cursor: pointer;
    font-size: 10px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}
.seg button:hover { color: var(--drawdy-foreground, #111111); }
.seg button.on {
    background: var(--drawdy-primary, #4f46e5);
    border-color: var(--drawdy-primary, #4f46e5);
    color: var(--drawdy-primary-foreground, #ffffff);
}

.swatches { display: flex; align-items: center; gap: 5px; flex-wrap: wrap; }
.swatch {
    width: 20px;
    height: 20px;
    padding: 0;
    border-radius: 50%;
    border: 1px solid var(--drawdy-border, #e5e5e5);
    cursor: pointer;
}
.swatch.on { outline: 2px solid var(--drawdy-primary, #4f46e5); outline-offset: 1px; }
.swatch.clear {
    background-color: #ffffff;
    background-image: linear-gradient(45deg, transparent 45%, #dc2626 45%, #dc2626 55%, transparent 55%);
}
input[type="color"] {
    width: 26px;
    height: 20px;
    padding: 0;
    border: 1px solid var(--drawdy-border, #e5e5e5);
    border-radius: var(--drawdy-radius-sm, 4px);
    background: transparent;
    cursor: pointer;
}

.rule { height: 1px; flex: none; background: var(--drawdy-border, #e5e5e5); margin: 2px 0; }

footer {
    flex: none;
    border-top: 1px solid var(--drawdy-border, #e5e5e5);
    padding: 6px 12px 8px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    background: var(--drawdy-surface, transparent);
}
.status {
    font-size: 10px;
    line-height: 14px;
    min-height: 28px;
    color: var(--drawdy-muted-foreground, #7a7a7a);
}
.status.bad { color: var(--drawdy-destructive, #dc2626); }
.status.good { color: var(--drawdy-success, #16a34a); }
.actions { display: flex; justify-content: flex-end; gap: 6px; }
.btn {
    flex: none;
    padding: 5px 11px;
    border-radius: var(--drawdy-radius-sm, 4px);
    border: 1px solid var(--drawdy-border, #e5e5e5);
    background: transparent;
    cursor: pointer;
    font-size: 11px;
}
.btn.small { padding: 1px 7px; font-size: 10px; }
.btn:hover:not(:disabled) { border-color: var(--drawdy-foreground, #111111); }
.btn:disabled { opacity: 0.4; cursor: default; }
.btn.primary {
    background: var(--drawdy-primary, #4f46e5);
    border-color: var(--drawdy-primary, #4f46e5);
    color: var(--drawdy-primary-foreground, #ffffff);
}
`;

const BODY = `
<div class="tabs" role="tablist" aria-label="Code Card">
    <button type="button" role="tab" id="tab-code" aria-selected="true" aria-controls="panel-code">Code</button>
    <button type="button" role="tab" id="tab-style" aria-selected="false" aria-controls="panel-style" tabindex="-1">Style</button>
</div>
<div class="banner" id="edit-banner" hidden>
    <span>Editing a code card from the board.</span>
    <button type="button" class="link" id="stop-edit">Stop editing</button>
</div>
<div class="preview-wrap">
    <div class="preview-box">
        <canvas id="preview" role="img" aria-label="Preview of the code card" hidden></canvas>
        <button type="button" class="preview-zoom" id="preview-zoom" aria-label="Show the code card larger" title="Show larger" hidden></button>
        <div class="preview-empty" id="preview-empty">
            <span id="preview-empty-text">Paste or type code on the Code tab to see the card here.</span>
            <button type="button" class="btn small" id="sample">Try a sample</button>
        </div>
    </div>
    <div class="readout"><div class="grow"><span id="readout"></span><span class="warn" id="readout-warn" hidden>Long cards come out softer. Split it into two cards for sharp text.</span></div><button type="button" class="btn small" id="retry" hidden>Try again</button></div>
</div>
<div class="preview-full" id="preview-full" role="dialog" aria-label="Code card preview" hidden>
    <canvas id="preview-full-canvas" role="img" aria-label="Larger preview of the code card"></canvas>
    <button type="button" class="btn small" id="preview-close">Close</button>
</div>
<section class="tabpanel" id="panel-code" role="tabpanel" aria-labelledby="tab-code">
    <div class="row">
        <label class="lbl" for="language">Language</label>
        <select class="select grow" id="language"></select>
        <span class="lbl" id="tab-size-label">Tab</span>
        <div class="seg" id="tab-size" role="group" aria-labelledby="tab-size-label"></div>
    </div>
    <textarea class="code-box" id="code" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Code" aria-describedby="code-note" placeholder="Paste or type code here."></textarea>
    <p class="note" id="code-note">Tab indents, Shift+Tab outdents. Press Esc to leave the box.</p>
</section>
<section class="tabpanel scroll" id="panel-style" role="tabpanel" aria-labelledby="tab-style" hidden></section>
<footer>
    <div class="status" id="status" role="status" aria-live="polite"></div>
    <div class="actions">
        <button type="button" class="btn" id="edit-selected" hidden>Edit selected</button>
        <button type="button" class="btn primary" id="place" disabled>Place on board</button>
        <button type="button" class="btn primary" id="update" hidden>Update on board</button>
    </div>
</footer>
`;

export function shellHtml(js: string): string {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style id="drawdy-styling">:root{/*__DRAWDY_STYLING__*/}</style>
<style>${fontFaceCss()}</style>
<style>${CSS}</style>
</head>
<body>
${BODY}
<script>${js}</script>
</body>
</html>`;
}
