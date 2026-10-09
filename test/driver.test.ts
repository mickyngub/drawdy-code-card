import assert from "node:assert/strict";
import { test } from "node:test";
import type { DriverManifest } from "@drawdy/driver-protocol";
import * as driver from "../src/index";
import { overlaps } from "../src/lib/free-spot";
import { DEFAULT_OPTIONS, type CardSpec } from "../src/shared/spec";
import { boot, fakeHost } from "./fake-host";

const manifest = {
    driverId: "mickyngub.code-card",
    driverName: "Code Card",
} as DriverManifest;

const spec: CardSpec = {
    code: "const a = 1;",
    language: "typescript",
    options: DEFAULT_OPTIONS,
};

const card = {
    dataUrl: "data:image/webp;base64,AAAA",
    pixelWidth: 800,
    pixelHeight: 400,
    width: 400,
    height: 200,
    spec,
};

const own = (meta: unknown) =>
    (meta as Record<string, { spec: CardSpec }>)[manifest.driverId];

test("activate asks for nothing that prompts: no storage, no scene subscription", async () => {
    const host = fakeHost();
    await boot(driver, host, manifest);
    const types = host.types();
    assert.ok(!types.some((t) => t.startsWith("command:kv-storage")));
    assert.ok(!types.some((t) => t.startsWith("subscription:scene")));
});

test("the first ready loads settings and subscribes to the selection, once", async () => {
    const host = fakeHost({ kv: { settings: { options: { theme: "nord" } } } });
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    await message({ type: "ready" });
    const types = host.types();
    assert.equal(types.filter((t) => t === "command:kv-storage:get").length, 1);
    assert.equal(
        types.filter((t) => t === "subscription:scene:drawdy-element-selection")
            .length,
        1
    );
    const init = host.posted.find((m) => m.type === "init");
    assert.deepEqual(init.settings, { options: { theme: "nord" } });
});

test("selection events are ignored while the panel is closed", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    await message({ type: "close" });
    host.clear();
    await driver.onEvent({
        type: "subscription:scene:drawdy-element-selection",
        body: { drawdyElementIds: ["x"] },
    } as any);
    assert.equal(host.sent.length, 0);
});

test("a second place lands beside the first, and each result is selected", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    await message({ type: "place", ...card });
    await message({ type: "place", ...card });
    const placed = [...host.elements.values()];
    assert.equal(placed.length, 2);
    const [a, b] = placed.map((el) => ({
        x: el.x as number,
        y: el.y as number,
        width: el.width as number,
        height: el.height as number,
    }));
    assert.equal(overlaps(a, b), false);
    const selections = host.sent.filter(
        (s) => s.type === "command:scene:set-selection"
    );
    assert.deepEqual(
        selections.map((s) => s.req.drawdyElementIds),
        placed.map((el) => [el.drawdyElementId])
    );
    assert.ok(!host.types().includes("command:camera:fly-to-elements"));
    assert.equal(host.posted.filter((m) => m.type === "placed").length, 2);
});

test("a full board is reported instead of a silent success", async () => {
    const host = fakeHost({ full: true });
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    await message({ type: "place", ...card });
    const last = host.posted.at(-1);
    assert.deepEqual(last, { type: "error", message: driver.BOARD_FULL });
});

test("update re-reads the card and keeps its spot, layer, group, frame, opacity and lock", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.put({
        drawdyElementId: "old",
        type: "image",
        x: 120,
        y: -80,
        width: 300,
        height: 150,
        rotation: 0.3,
        opacity: 0.5,
        layer: 4,
        frameId: "frame-1",
        groupId: "group-1",
        locked: false,
        meta: { [manifest.driverId]: { v: 1, spec } },
    });
    host.select(["old"]);
    await message({ type: "edit-selected" });
    // Moved and locked after Edit selected: the update must use the new values.
    host.put({ ...host.elements.get("old")!, x: 500, locked: true });
    await message({ type: "update", ...card });

    assert.equal(host.elements.has("old"), false);
    const [fresh] = [...host.elements.values()];
    assert.equal(fresh.x, 500);
    assert.equal(fresh.y, -80);
    assert.equal(fresh.width, 300);
    assert.equal(fresh.height, 150);
    assert.equal(fresh.layer, 4);
    assert.equal(fresh.frameId, "frame-1");
    assert.equal(fresh.groupId, "group-1");
    assert.equal(fresh.opacity, 0.5);
    assert.equal(fresh.locked, true);
    assert.deepEqual(own(fresh.meta).spec, spec);

    const order = host
        .types()
        .filter((t) => /remove-drawdy|add-drawdy/.test(t));
    assert.deepEqual(order, [
        "command:scene:remove-drawdy-elements",
        "command:scene:add-drawdy-elements",
    ]);
    assert.deepEqual(host.posted.at(-2), {
        type: "placed",
        mode: "update",
        undoSteps: 3,
        rotationReset: true,
    });
});

test("a failed add after the remove is undone, so the old card comes back", async () => {
    const host = fakeHost({ failAdd: true });
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.put({
        drawdyElementId: "old",
        type: "image",
        x: 0,
        y: 0,
        width: 300,
        height: 150,
        meta: { [manifest.driverId]: { v: 1, spec } },
    });
    host.select(["old"]);
    await message({ type: "edit-selected" });
    await message({ type: "update", ...card });
    assert.ok(host.types().includes("command:history:undo"));
    assert.ok(host.elements.has("old"));
    assert.equal(host.posted.at(-1).type, "error");
});

test("a denied board read ends in a clear message, not a hang", async () => {
    const host = fakeHost({ denied: ["command:scene"] });
    const { message } = await boot(driver, host, manifest);
    await message({ type: "ready" });
    host.clear();
    await message({ type: "edit-selected" });
    assert.deepEqual(host.posted.at(-1), {
        type: "error",
        message: driver.NEEDS_PERMISSION,
    });
});

test("undo and redo from the panel go to the board history", async () => {
    const host = fakeHost();
    const { message } = await boot(driver, host, manifest);
    await message({ type: "undo" });
    await message({ type: "redo" });
    const types = host.types();
    assert.ok(types.includes("command:history:undo"));
    assert.ok(types.includes("command:history:redo"));
});
