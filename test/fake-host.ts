import type {
    DriverCommandIssuer,
    DriverManifest,
    DriverModule,
} from "@drawdy/driver-protocol";
import { overlaps, type Rect } from "../src/lib/free-spot";

export type Stored = Record<string, unknown> & {
    drawdyElementId: string;
    type: string;
};

type Options = {
    viewport?: Rect;
    denied?: string[];
    full?: boolean;
    failAdd?: boolean;
    kv?: Record<string, unknown>;
};

type Sent = { type: string; req?: any };

/** Element rect as the host reports it; elements without x/y/width/height need one passed in. */
export type RectOf = (el: Stored) => Rect;

const plainRect: RectOf = (el) => ({
    x: el.x as number,
    y: el.y as number,
    width: el.width as number,
    height: el.height as number,
});

export function fakeHost(options: Options = {}, rectOf: RectOf = plainRect) {
    const viewport = options.viewport ?? {
        x: 0,
        y: 0,
        width: 1600,
        height: 1000,
    };
    const sent: Sent[] = [];
    const posted: any[] = [];
    const kv: Record<string, unknown> = { ...options.kv };
    let elements = new Map<string, Stored>();
    const undo: Map<string, Stored>[] = [];
    let selection: string[] = [];
    let ids = 0;

    const snapshot = () => undo.push(new Map(elements));

    const issueCommand = (async (cmd: any) => {
        sent.push({ type: cmd.type, req: cmd.req });
        const ok = (value?: unknown) => ({ ...cmd, res: { value } });
        const fail = (type: string) => ({ ...cmd, res: { error: { type } } });
        if (options.denied?.some((prefix) => cmd.type.startsWith(prefix))) {
            return fail("unauthorized");
        }
        switch (cmd.type) {
            case "command:webview:post-message":
                posted.push(cmd.req.message);
                return ok();
            case "command:camera:get-viewport-rect":
                return ok({ rect: viewport });
            case "command:camera:get-info":
                return ok({ zoom: 1 });
            case "command:dom:element-rect":
                return fail("not-found");
            case "command:kv-storage:get":
                return ok({ got: { [cmd.req.key]: kv[cmd.req.key] } });
            case "command:kv-storage:set":
                Object.assign(kv, cmd.req.payload);
                return ok();
            case "command:scene:query-rect":
                return ok({
                    drawdyElements: [...elements.values()]
                        .filter((el) => overlaps(rectOf(el), cmd.req.rect))
                        .map((el) => ({
                            id: el.drawdyElementId,
                            type: el.type,
                        })),
                });
            case "command:scene:element-rects":
                return ok({
                    rects: (cmd.req.drawdyElementIds as string[]).flatMap(
                        (id) => {
                            const el = elements.get(id);
                            return el
                                ? [{ drawdyElementId: id, rect: rectOf(el) }]
                                : [];
                        }
                    ),
                });
            case "command:scene:add-drawdy-elements":
                if (options.failAdd) return fail("bad-argument");
                snapshot();
                if (!options.full) {
                    for (const el of cmd.req.elements as Stored[]) {
                        elements.set(el.drawdyElementId, { ...el });
                    }
                }
                return ok();
            case "command:scene:remove-drawdy-elements": {
                snapshot();
                let removed = 0;
                for (const id of cmd.req.drawdyElementIds as string[]) {
                    if (elements.delete(id)) removed++;
                }
                return ok({ removed });
            }
            case "command:scene:update-drawdy-elements": {
                snapshot();
                for (const { drawdyElementId, properties } of cmd.req.updates) {
                    const el = elements.get(drawdyElementId);
                    if (el)
                        elements.set(drawdyElementId, { ...el, ...properties });
                }
                return ok({ updated: cmd.req.updates.length });
            }
            case "command:scene:get-drawdy-elements":
                return ok({
                    drawdyElements: (cmd.req.drawdyElementIds as string[])
                        .map((id) => elements.get(id))
                        .filter((el): el is Stored => el !== undefined)
                        .map((el) => {
                            const picked: Record<string, unknown> = {
                                id: el.drawdyElementId,
                            };
                            for (const key of cmd.req.properties) {
                                if (key in el) picked[key] = el[key];
                            }
                            return picked;
                        }),
                });
            case "command:scene:get-current-selected-drawdy-elements":
                return ok({ drawdyElementIds: selection });
            case "command:scene:set-selection":
                selection = cmd.req.drawdyElementIds;
                return ok();
            case "command:history:undo": {
                const previous = undo.pop();
                if (previous) elements = previous;
                return ok();
            }
            default:
                return ok({});
        }
    }) as unknown as DriverCommandIssuer;

    return {
        issueCommand,
        sent,
        posted,
        kv,
        get elements() {
            return elements;
        },
        select(next: string[]) {
            selection = next;
        },
        put(el: Stored) {
            elements.set(el.drawdyElementId, el);
        },
        nextId: () => `el-${++ids}`,
        types: () => sent.map((s) => s.type),
        clear() {
            sent.length = 0;
            posted.length = 0;
        },
    };
}

export type FakeHost = ReturnType<typeof fakeHost>;

export async function boot(
    module: DriverModule,
    host: FakeHost,
    manifest: DriverManifest
) {
    await module.activate({
        manifest,
        issueCommand: host.issueCommand,
        styling: { theme: "light" } as any,
        generateId: host.nextId,
    });
    const message = (body: Record<string, unknown>) =>
        module.onEvent({
            type: "subscription:webview:message",
            body: {
                webviewDomId: `${manifest.driverId}:webview`,
                message: body,
            },
        } as any);
    return { message };
}
