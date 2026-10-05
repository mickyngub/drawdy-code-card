import type {
    DriverCommandIssuer,
    DriverManifest,
    DriverModule,
    ModuleStyling,
    SubscribeableKey,
    SubscribedDrawdyElement,
} from "@drawdy/driver-protocol";
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
const FLY_DURATION_MS = 350;
const MAX_SIDE_UNITS = 20000;

type EditTarget = { id: string };

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

function enqueue(task: () => Promise<void>): Promise<void> {
    const next = chain.then(task).catch(() => undefined);
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
        issueCommand({
            type: "subscription:scene:drawdy-element-selection",
            driverId,
            requestId: nextRequestId(),
        }),
    ]);

    const stored = await issueCommand({
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
            if (!driver.webviewOpen) driver.webviewHtml = null;
            post({ type: "theme", cssVars: stylingCssVars(driver.styling) });
            return;
        }
        case "subscription:scene:drawdy-element-selection": {
            await refreshSelection(event.body.drawdyElementIds);
            return;
        }
        default: {
            return;
        }
    }
};

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
    if (driver) driver.webviewOpen = true;
}

async function handleWebviewMessage(message: WebviewToDriver): Promise<void> {
    if (!driver) return;
    switch (message.type) {
        case "ready": {
            driver.webviewOpen = true;
            post({ type: "init", settings: driver.settings ?? undefined });
            await refreshSelection();
            return;
        }
        case "settings": {
            const settings = message.settings;
            if (typeof settings !== "object" || settings === null) return;
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
            message: "That card's saved code could not be read.",
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
        post({ type: "error", message: "That card could not be read." });
        return null;
    }
    return { spec, ratio: message.pixelHeight / message.pixelWidth };
}

async function viewCentredRect(width: number, height: number): Promise<Rect> {
    if (!driver) return { x: 0, y: 0, width, height };
    const res = await driver.issueCommand({
        type: "command:camera:get-viewport-rect",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
    });
    if (res.res.error !== undefined) return { x: 0, y: 0, width, height };
    const { rect } = res.res.value;
    return {
        x: Math.round(rect.x + (rect.width - width) / 2),
        y: Math.round(rect.y + (rect.height - height) / 2),
        width,
        height,
    };
}

async function addCard(
    message: RenderedCard,
    spec: CardSpec,
    rect: Rect,
    keep: { frameId?: string; layer?: number }
): Promise<string | null> {
    if (!driver) return null;
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
    return added.res.error === undefined ? drawdyElementId : null;
}

async function place(message: RenderedCard): Promise<void> {
    const card = readCard(message);
    if (!driver || !card) return;
    const rect = await viewCentredRect(
        message.width,
        message.width * card.ratio
    );
    const id = await addCard(message, card.spec, rect, {});
    if (!driver) return;
    if (!id) {
        post({ type: "error", message: "The board rejected that card." });
        return;
    }
    await driver.issueCommand({
        type: "command:camera:fly-to-elements",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: {
            drawdyElementIds: [id],
            flyDurationMs: FLY_DURATION_MS,
            zoom: 1,
        },
    });
    post({ type: "placed", mode: "new" });
    await refreshSelection();
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
    const [old] = await readElements(
        [editing.id],
        ["x", "y", "width", "frameId", "layer"]
    );
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
                "The card you were editing is no longer on the board. Place it as a new card.",
        });
        return;
    }
    const keep: { frameId?: string; layer?: number } = {};
    if (typeof old.frameId === "string") keep.frameId = old.frameId;
    if (typeof old.layer === "number") keep.layer = old.layer;
    await driver.issueCommand({
        type: "command:scene:remove-drawdy-elements",
        driverId: driver.manifest.driverId,
        requestId: nextRequestId(),
        req: { drawdyElementIds: [editing.id] },
    });
    // Same top-left and width as the old card, so a card resized on the board keeps its size.
    const id = await addCard(
        message,
        card.spec,
        {
            x: old.x,
            y: old.y,
            width: old.width,
            height: old.width * card.ratio,
        },
        keep
    );
    if (!driver) return;
    if (!id) {
        post({
            type: "error",
            message:
                "The board rejected the updated card. Press ⌘Z or Ctrl+Z to get the old one back.",
        });
        return;
    }
    driver.editing = { id };
    post({ type: "placed", mode: "update" });
    await refreshSelection();
}
