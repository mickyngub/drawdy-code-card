import type {
    DriverCommandIssuer,
    DriverManifest,
    DriverModule,
    ModuleStyling,
    SubscribeableKey,
    SubscribedDrawdyElement,
} from "@drawdy/driver-protocol";
import {
    centredIn,
    findFreeRect,
    revealAndSelect,
    visibleArea,
} from "./lib/free-spot";
import type {
    DriverToWebview,
    Rect,
    RenderedCard,
    WebviewToDriver,
} from "./shared/messages";
import { normaliseSpec, type CardSpec } from "./shared/spec";
import { WEBVIEW_HTML } from "./webview-html";

// Drawdy shows this through <img>, where currentColor is black, so the colours are explicit.
const ACTION_BUTTON_SVG = `<svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" width="18" height="18"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#22c55e"/><stop offset="1" stop-color="#0ea5e9"/></linearGradient></defs><rect x="1" y="1" width="22" height="22" rx="6" fill="url(#g)"/><path d="M9 8.5 5.5 12 9 15.5M15 8.5l3.5 3.5-3.5 3.5M13.2 7.5l-2.4 9" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

const SETTINGS_KV_KEY = "settings";
const MAX_SIDE_UNITS = 20000;

export const NEEDS_PERMISSION =
    "Code Card needs permission to read the board. Reload the page and click Allow.";
export const BOARD_FULL =
    "The board is full: it holds at most 10,000 elements. Remove some, then try again.";

const UPDATE_KEYS: SubscribeableKey[] = [
    "x",
    "y",
    "width",
    "height",
    "rotation",
    "opacity",
    "layer",
    "frameId",
    "groupId",
    "locked",
];

type EditTarget = { id: string };

type Kept = {
    frameId?: string;
    groupId?: string;
    layer?: number;
    opacity?: number;
};

class PermissionDenied extends Error {}

let requestId = 0;
let selectionToken = 0;

let driver: {
    manifest: DriverManifest;
    issueCommand: DriverCommandIssuer;
    generateId: () => string;
    styling: ModuleStyling;
    actionButtonId: string;
    webviewId: string;
    webviewHtml: string | null;
    webviewOpen: boolean;
    panelReady: boolean;
    started: boolean;
    settings: Record<string, unknown> | null;
    editing: EditTarget | null;
} | null = null;

let chain: Promise<void> = Promise.resolve();

const nextRequestId = (): string => String(requestId++);

function stylingCssVars(styling: ModuleStyling): string {
    return Object.entries(styling)
        .map(([key, value]) =>
            key === "theme"
                ? `color-scheme: ${value};`
                : `--drawdy-${key.replace(
                      /[A-Z]/g,
                      (c) => `-${c.toLowerCase()}`
                  )}: ${value};`
        )
        .join("");
}

function reportFailure(err: unknown): void {
    if (err instanceof PermissionDenied) {
        post({ type: "error", message: NEEDS_PERMISSION });
        return;
    }
    const detail = err instanceof Error && err.message ? err.message : "";
    post({
        type: "error",
        message: `Something went wrong${
            detail ? ` (${detail.slice(0, 80)})` : ""
        }. Try again.`,
    });
}

function enqueue(task: () => Promise<void>): Promise<void> {
    const next = chain.then(task).catch(reportFailure);
    chain = next;
    return next;
}

function post(message: DriverToWebview): void {
    if (!driver) return;
    void driver.issueCommand({
        type: "command:webview:post-message",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { webviewDomId: driver.webviewId, message },
    });
}

function placeCtx() {
    const d = driver as NonNullable<typeof driver>;
    return {
        issueCommand: d.issueCommand,
        driverId: d.manifest.driverId,
        nextRequestId,
        webviewDomId: d.webviewId,
    };
}

function denied(res: { res: { error?: { type: string } } }): boolean {
    return res.res.error?.type === "unauthorized";
}

// The published protocol package predates the history commands, so they go through untyped.
async function history(type: "undo" | "redo"): Promise<void> {
    if (!driver) return;
    const res = (await driver.issueCommand({
        type: `command:history:${type}`,
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
    } as unknown as Parameters<DriverCommandIssuer>[0])) as {
        res: { error?: { type: string } };
    };
    if (denied(res)) throw new PermissionDenied();
}

export const activate: DriverModule["activate"] = async ({
    manifest,
    issueCommand,
    styling,
    generateId,
}) => {
    driver = {
        manifest,
        issueCommand,
        generateId,
        styling,
        actionButtonId: `${manifest.driverId}:action-button`,
        webviewId: `${manifest.driverId}:webview`,
        webviewHtml: null,
        webviewOpen: false,
        panelReady: false,
        started: false,
        settings: null,
        editing: null,
    };
    const { driverId } = manifest;

    const created = await issueCommand({
        type: "command:dom:create-action-button",
        driverId,
        requestId: nextRequestId(),
        req: { domElementId: driver.actionButtonId, svg: ACTION_BUTTON_SVG },
    });
    if (created.res.error !== undefined) return;

    await Promise.all([
        issueCommand({
            type: "subscription:dom:element-clicked",
            driverId,
            requestId: nextRequestId(),
            req: { domElementId: driver.actionButtonId },
        }),
        issueCommand({
            type: "subscription:webview:message",
            driverId,
            requestId: nextRequestId(),
            req: { webviewDomId: driver.webviewId },
        }),
        issueCommand({
            type: "subscription:dom:theme-changed",
            driverId,
            requestId: nextRequestId(),
        }),
    ]);
};

export const onEvent: DriverModule["onEvent"] = async (event) => {
    if (!driver) return;
    switch (event.type) {
        case "subscription:dom:element-clicked": {
            if (event.body.domElementId !== driver.actionButtonId) return;
            await enqueue(openWebview);
            return;
        }
        case "subscription:webview:message": {
            if (event.body.webviewDomId !== driver.webviewId) return;
            const message = event.body.message;
            if (typeof message !== "object" || message === null) return;
            await handleWebviewMessage(message as WebviewToDriver);
            return;
        }
        case "subscription:dom:theme-changed": {
            driver.styling = event.body.styling;
            if (driver.panelReady) {
                post({
                    type: "theme",
                    cssVars: stylingCssVars(driver.styling),
                });
            }
            return;
        }
        case "subscription:scene:drawdy-element-selection": {
            if (!driver.webviewOpen || !driver.panelReady) return;
            await refreshSelection(event.body.drawdyElementIds).catch(
                reportFailure
            );
            return;
        }
        default: {
            return;
        }
    }
};

// The panel is kept alive while closed and never reloads, so a theme switch reaches it by message.
async function openWebview(): Promise<void> {
    if (!driver) return;
    if (driver.webviewHtml === null) {
        driver.webviewHtml = WEBVIEW_HTML.replace(
            "/*__DRAWDY_STYLING__*/",
            stylingCssVars(driver.styling)
        );
    }
    await driver.issueCommand({
        type: "command:webview:create",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: {
            webviewDomId: driver.webviewId,
            htmlContent: driver.webviewHtml,
            keepStateWhenClosed: true,
        },
    });
    if (!driver) return;
    driver.webviewOpen = true;
    if (driver.panelReady) {
        post({ type: "theme", cssVars: stylingCssVars(driver.styling) });
        await refreshSelection();
    }
}

async function start(): Promise<void> {
    if (!driver || driver.started) return;
    driver.started = true;
    const { driverId } = driver.manifest;
    const stored = await driver.issueCommand({
        type: "command:kv-storage:get",
        driverId,
        requestId: nextRequestId(),
        req: { key: SETTINGS_KV_KEY },
    });
    if (driver && stored.res.error === undefined) {
        const restored = stored.res.value?.got?.[SETTINGS_KV_KEY];
        if (restored && typeof restored === "object") {
            driver.settings = restored as Record<string, unknown>;
        }
    }
    await driver?.issueCommand({
        type: "subscription:scene:drawdy-element-selection",
        driverId,
        requestId: nextRequestId(),
    });
}

async function onReady(): Promise<void> {
    if (!driver) return;
    driver.panelReady = true;
    driver.webviewOpen = true;
    await start();
    if (!driver) return;
    post({ type: "theme", cssVars: stylingCssVars(driver.styling) });
    post({ type: "init", settings: driver.settings ?? undefined });
    await refreshSelection();
}

async function saveSettings(settings: Record<string, unknown>): Promise<void> {
    if (!driver) return;
    driver.settings = settings;
    await driver.issueCommand({
        type: "command:kv-storage:set",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: {
            key: SETTINGS_KV_KEY,
            payload: { [SETTINGS_KV_KEY]: settings },
        },
    });
}

async function handleWebviewMessage(message: WebviewToDriver): Promise<void> {
    if (!driver) return;
    switch (message.type) {
        case "ready": {
            await enqueue(onReady);
            return;
        }
        case "settings": {
            const settings = message.settings;
            if (typeof settings !== "object" || settings === null) return;
            await enqueue(() => saveSettings(settings));
            return;
        }
        case "place": {
            await enqueue(() => place(message));
            return;
        }
        case "update": {
            await enqueue(() => update(message));
            return;
        }
        case "edit-selected": {
            await enqueue(loadSelected);
            return;
        }
        case "stop-edit": {
            driver.editing = null;
            return;
        }
        case "undo":
        case "redo": {
            const step = message.type;
            await enqueue(() => history(step));
            return;
        }
        case "close": {
            driver.webviewOpen = false;
            await driver.issueCommand({
                type: "command:webview:hide",
                driverId: driver.manifest.driverId,
                requestId: nextRequestId(),
                req: { webviewDomId: driver.webviewId },
            });
            return;
        }
    }
}

function ownMeta(meta: unknown): Record<string, unknown> | null {
    if (!driver || typeof meta !== "object" || meta === null) return null;
    const own = (meta as Record<string, unknown>)[driver.manifest.driverId];
    if (typeof own !== "object" || own === null) return null;
    return (own as Record<string, unknown>).v === 1
        ? (own as Record<string, unknown>)
        : null;
}

async function readElements(
    ids: string[],
    properties: SubscribeableKey[]
): Promise<SubscribedDrawdyElement[]> {
    if (!driver || ids.length === 0) return [];
    const res = await driver.issueCommand({
        type: "command:scene:get-drawdy-elements",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { properties, drawdyElementIds: ids },
    });
    if (denied(res)) throw new PermissionDenied();
    if (res.res.error !== undefined) return [];
    return res.res.value.drawdyElements;
}

async function selectedIds(): Promise<string[]> {
    if (!driver) return [];
    const res = await driver.issueCommand({
        type: "command:scene:get-current-selected-drawdy-elements",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
    });
    if (denied(res)) throw new PermissionDenied();
    if (res.res.error !== undefined) return [];
    return res.res.value.drawdyElementIds;
}

const isCard = (el: SubscribedDrawdyElement) =>
    el.type === "image" && ownMeta(el.meta)?.spec !== undefined;

async function refreshSelection(ids?: string[]): Promise<void> {
    const token = ++selectionToken;
    const selected = ids ?? (await selectedIds());
    const editable = (await readElements(selected, ["type", "meta"])).some(
        isCard
    );
    if (!driver || token !== selectionToken) return;
    post({ type: "selection", editable });
}

async function loadSelected(): Promise<void> {
    if (!driver) return;
    const cards = (
        await readElements(await selectedIds(), ["type", "meta"])
    ).filter(isCard);
    if (!driver) return;
    if (cards.length !== 1) {
        post({
            type: "error",
            message:
                cards.length === 0
                    ? "Select a code card made with Code Card first."
                    : "More than one code card is selected. Select just one.",
        });
        return;
    }
    const spec = normaliseSpec(ownMeta(cards[0].meta)?.spec);
    if (!spec) {
        post({
            type: "error",
            message: "That code card's saved code could not be read.",
        });
        return;
    }
    driver.editing = { id: cards[0].id };
    post({ type: "load", spec });
}

function readCard(message: RenderedCard): {
    spec: CardSpec;
    ratio: number;
} | null {
    const spec = normaliseSpec(message.spec);
    const sizeOk = (n: unknown) =>
        typeof n === "number" && n > 0 && n <= MAX_SIDE_UNITS;
    if (
        !spec ||
        typeof message.dataUrl !== "string" ||
        !/^data:image\/(webp|png);base64,/.test(message.dataUrl) ||
        !sizeOk(message.pixelWidth) ||
        !sizeOk(message.pixelHeight) ||
        !sizeOk(message.width) ||
        !sizeOk(message.height)
    ) {
        post({ type: "error", message: "That code card could not be read." });
        return null;
    }
    return { spec, ratio: message.pixelHeight / message.pixelWidth };
}

async function preferredRect(width: number, height: number): Promise<Rect> {
    const area = await visibleArea(placeCtx());
    const rect = area
        ? centredIn(area, width, height)
        : { x: 0, y: 0, width, height };
    return { ...rect, x: Math.round(rect.x), y: Math.round(rect.y) };
}

type Added = { id: string } | { error: string };

async function addCard(
    message: RenderedCard,
    spec: CardSpec,
    rect: Rect,
    keep: Kept
): Promise<Added> {
    if (!driver) return { error: "" };
    const drawdyElementId = driver.generateId();
    const added = await driver.issueCommand({
        type: "command:scene:add-drawdy-elements",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: {
            elements: [
                {
                    type: "image",
                    drawdyElementId,
                    url: message.dataUrl,
                    ...rect,
                    ...keep,
                    meta: { [driver.manifest.driverId]: { v: 1, spec } },
                },
            ],
        },
    });
    if (denied(added)) throw new PermissionDenied();
    if (added.res.error !== undefined) {
        return { error: added.res.error.message ?? "" };
    }
    // Over its element limit the board adds nothing but still answers success.
    const back = await driver.issueCommand({
        type: "command:scene:element-rects",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { drawdyElementIds: [drawdyElementId] },
    });
    if (back.res.error === undefined && back.res.value.rects.length === 0) {
        return { error: BOARD_FULL };
    }
    return { id: drawdyElementId };
}

async function place(message: RenderedCard): Promise<void> {
    const card = readCard(message);
    if (!driver || !card) return;
    const preferred = await preferredRect(
        message.width,
        message.width * card.ratio
    );
    const rect = await findFreeRect(placeCtx(), preferred);
    const added = await addCard(message, card.spec, rect, {});
    if (!driver) return;
    if ("error" in added) {
        post({
            type: "error",
            message:
                added.error === BOARD_FULL
                    ? BOARD_FULL
                    : "The board rejected that code card.",
        });
        return;
    }
    await revealAndSelect(placeCtx(), [added.id], rect);
    post({ type: "placed", mode: "new" });
    await refreshSelection();
}

export function keptProperties(old: SubscribedDrawdyElement): Kept {
    const keep: Kept = {};
    if (typeof old.frameId === "string") keep.frameId = old.frameId;
    if (typeof old.groupId === "string") keep.groupId = old.groupId;
    if (typeof old.layer === "number") keep.layer = old.layer;
    if (typeof old.opacity === "number") keep.opacity = old.opacity;
    return keep;
}

async function update(message: RenderedCard): Promise<void> {
    const card = readCard(message);
    if (!driver || !card) return;
    const editing = driver.editing;
    if (!editing) {
        post({
            type: "error",
            message:
                "Select a code card on the board and click Edit selected first.",
        });
        return;
    }
    const [old] = await readElements([editing.id], UPDATE_KEYS);
    if (!driver) return;
    if (
        typeof old?.x !== "number" ||
        typeof old.y !== "number" ||
        typeof old.width !== "number" ||
        !(old.width > 0)
    ) {
        driver.editing = null;
        post({ type: "edit-ended" });
        post({
            type: "error",
            message:
                "The code card you were editing is no longer on the board. Place it as a new card.",
        });
        return;
    }
    const removed = await driver.issueCommand({
        type: "command:scene:remove-drawdy-elements",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { drawdyElementIds: [editing.id] },
    });
    if (denied(removed)) throw new PermissionDenied();
    if (removed.res.error !== undefined) {
        post({
            type: "error",
            message: "The board would not replace that code card.",
        });
        return;
    }
    // Same top-left and width as the old card, so a card resized on the board keeps its size.
    const rect = {
        x: old.x,
        y: old.y,
        width: old.width,
        height: old.width * card.ratio,
    };
    const added = await addCard(message, card.spec, rect, keptProperties(old));
    if (!driver) return;
    if ("error" in added) {
        await history("undo");
        post({
            type: "error",
            message:
                added.error === BOARD_FULL
                    ? BOARD_FULL
                    : "The board rejected the updated code card, so the old one is back.",
        });
        return;
    }
    let undoSteps = 2;
    if (old.locked === true) {
        const locked = await driver.issueCommand({
            type: "command:scene:update-drawdy-elements",
            driverId: driver.manifest.driverId,
            requestId: nextRequestId(),
            req: {
                updates: [
                    {
                        drawdyElementId: added.id,
                        properties: { locked: true },
                    },
                ],
            },
        });
        if (locked.res.error === undefined) undoSteps = 3;
    }
    driver.editing = { id: added.id };
    await revealAndSelect(placeCtx(), [added.id], rect);
    post({
        type: "placed",
        mode: "update",
        undoSteps,
        rotationReset: typeof old.rotation === "number" && old.rotation !== 0,
    });
    await refreshSelection();
}
