import {
    CHECKER,
    CODE_AREA,
    FOOTER_SECONDARY,
    HINT,
    ICON_BUTTON,
    LABEL_ROW,
    LINK,
    PRIMARY,
    SCROLL_BODY,
    SECONDARY,
    SEGMENTED,
    SELECT_CHEVRON,
    SELECT_COMPACT,
    STATUS,
    TAB,
} from "../webview/lib/classes";
import { fontFaceCss } from "../webview/lib/font-faces";
import { ICONS, icon } from "../webview/lib/icons";
import { PANEL_CSS } from "./panel-css";

const EMPTY_WELL =
    "has-[>#preview-empty:not([hidden])]:border-dashed has-[>#preview-empty:not([hidden])]:border-line-strong has-[>#preview-empty:not([hidden])]:bg-transparent";

const BODY = `
<div class="flex h-10 shrink-0 gap-4 border-b border-divider px-4" role="tablist" aria-label="Code Card">
    <button type="button" role="tab" id="tab-code" class="${TAB}" aria-selected="true" aria-controls="panel-code">Code</button>
    <button type="button" role="tab" id="tab-style" class="${TAB}" aria-selected="false" aria-controls="panel-style" tabindex="-1">Style</button>
</div>
<div class="flex shrink-0 items-center justify-between gap-2 border-b border-divider bg-accent-subtle px-4 py-2 text-body text-fg" id="edit-banner" hidden>
    <span>Editing a code card from the board.</span>
    <button type="button" class="${LINK}" id="stop-edit">Stop editing</button>
</div>
<div class="flex shrink-0 flex-col gap-2 px-4 pt-3">
    <div class="relative grid h-[124px] place-items-center overflow-hidden rounded-xl border border-transparent bg-section ${EMPTY_WELL}">
        <canvas id="preview" class="block ${CHECKER}" role="img" aria-label="Preview of the code card" hidden></canvas>
        <button type="button" class="${ICON_BUTTON} absolute top-1.5 right-1.5 bg-panel/80" id="preview-zoom" aria-label="Show the code card larger" title="Show larger" hidden>${icon(ICONS.fullscreen)}</button>
        <div class="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center" id="preview-empty">
            ${icon(ICONS.code, "size-5 text-fg-subtle")}
            <span class="text-body text-fg-subtle" id="preview-empty-text">Paste or type code on the Code tab to see the card here.</span>
            <button type="button" class="${SECONDARY} mt-1" id="sample">Try a sample</button>
        </div>
    </div>
    <div class="flex items-center gap-2 text-caption text-fg-subtle tabular-nums"><div class="flex min-w-0 flex-1 flex-col"><span id="readout"></span><span class="text-fg-muted" id="readout-warn" hidden>Long cards come out softer. Split it into two cards for sharp text.</span></div><button type="button" class="${SECONDARY}" id="retry" hidden>Try again</button></div>
</div>
<div class="fixed inset-0 z-10 flex cursor-zoom-out flex-col items-center justify-center gap-2 bg-panel p-3" id="preview-full" role="dialog" aria-label="Code card preview" hidden>
    <canvas id="preview-full-canvas" class="block ${CHECKER}" role="img" aria-label="Larger preview of the code card"></canvas>
    <button type="button" class="${SECONDARY}" id="preview-close">Close</button>
</div>
<section class="flex min-h-0 flex-1 flex-col gap-4 px-4 pt-4 pb-3" id="panel-code" role="tabpanel" aria-labelledby="tab-code">
    <div class="flex gap-2">
        <div class="flex min-w-0 flex-1 flex-col gap-2">
            <label class="${LABEL_ROW}" for="language">Language</label>
            <div class="relative"><select class="${SELECT_COMPACT}" id="language"></select>${SELECT_CHEVRON}</div>
        </div>
        <div class="flex w-24 shrink-0 flex-col gap-2">
            <span class="${LABEL_ROW}" id="tab-size-label">Tab</span>
            <div class="${SEGMENTED}" id="tab-size" role="group" aria-labelledby="tab-size-label"></div>
        </div>
    </div>
    <div class="flex min-h-0 flex-1 flex-col gap-2">
        <textarea class="${CODE_AREA} flex-1 overflow-auto" id="code" spellcheck="false" autocomplete="off" autocapitalize="off" aria-label="Code" aria-describedby="code-note" placeholder="Paste or type code here."></textarea>
        <p class="${HINT}" id="code-note">Tab indents, Shift+Tab outdents. Press Esc to leave the box.</p>
    </div>
</section>
<section class="${SCROLL_BODY}" id="panel-style" role="tabpanel" aria-labelledby="tab-style" hidden></section>
<footer class="flex shrink-0 flex-col gap-2 border-t border-divider px-4 py-3">
    <div class="${STATUS}" id="status" role="status" aria-live="polite"></div>
    <div class="flex items-center gap-2">
        <button type="button" class="${FOOTER_SECONDARY}" id="edit-selected" hidden>Edit selected</button>
        <button type="button" class="${PRIMARY}" id="place" disabled>Place on board</button>
        <button type="button" class="${PRIMARY}" id="update" hidden>Update on board</button>
    </div>
</footer>
`;

export function shellHtml(js: string): string {
    return `<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/google-sans-flex@5.3.2/wght.css" />
<style id="drawdy-styling">:root{/*__DRAWDY_STYLING__*/}</style>
<style>${fontFaceCss()}</style>
<style>${PANEL_CSS}</style>
</head>
<body class="flex h-screen flex-col overflow-hidden bg-panel font-sans text-body text-fg antialiased">
${BODY}
<script>${js}</script>
</body>
</html>`;
}
