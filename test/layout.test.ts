import assert from "node:assert/strict";
import { test } from "node:test";
import { DEFAULT_OPTIONS, type CardOptions } from "../src/shared/spec";
import { plainLines } from "../webview/lib/hljs-html";
import {
    charColumns,
    exportScale,
    layoutCard,
    lineGlyphs,
    wrapGlyphs,
} from "../webview/lib/layout";

// A monospace stand-in: every character is 0.6 em wide.
const measure = (text: string, size: number) =>
    Array.from(text).length * size * 0.6;

const options = (over: Partial<CardOptions>): CardOptions => ({
    ...DEFAULT_OPTIONS,
    fontSize: 10,
    ...over,
});

const texts = (glyphs: { text: string }[]) =>
    glyphs.map((g) => g.text).join("");

test("a card without chrome sizes from its widest line and the gutter", () => {
    const layout = layoutCard(
        plainLines("ab\n\tx = 1"),
        options({
            chrome: "none",
            padding: 16,
            startLine: 9,
            highlight: "10",
            tabSize: 4,
        }),
        measure
    );
    assert.equal(layout.advance, 6);
    assert.equal(layout.lineHeight, 16);
    assert.deepEqual(layout.window, {
        x: 16,
        y: 16,
        width: 148,
        height: 56,
        radius: 12,
    });
    assert.equal(layout.width, 180);
    assert.equal(layout.height, 88);
    assert.equal(layout.gutterRight, 42);
    assert.equal(layout.codeX, 54);
    assert.equal(layout.columns, 9);
    assert.deepEqual(layout.rows, [
        {
            y: 28,
            number: 9,
            highlighted: false,
            cells: [{ text: "ab", scope: "", col: 0 }],
        },
        {
            y: 44,
            number: 10,
            highlighted: true,
            cells: [{ text: "    x = 1", scope: "", col: 0 }],
        },
    ]);
});

test("window chrome adds dots and widens an auto card for its title", () => {
    const layout = layoutCard(
        plainLines("a"),
        options({
            chrome: "dots",
            title: "main.ts",
            lineNumbers: false,
            padding: 16,
        }),
        measure
    );
    assert.equal(layout.window.width, 149);
    assert.equal(layout.window.height, 58);
    assert.deepEqual(
        layout.chrome?.dots.map((d) => [d.x, d.y, d.r]),
        [
            [29, 29, 4.3],
            [43, 29, 4.3],
            [57, 29, 4.3],
        ]
    );
    assert.equal(layout.chrome?.title?.text, "main.ts");
    assert.equal(layout.chrome?.title?.fontSize, 9);
    assert.ok(Math.abs((layout.chrome?.title?.x ?? 0) - 71.6) < 1e-9);
    assert.equal(layout.rows[0].y, 46);
    assert.equal(layout.gutterRight, null);
});

test("a fixed-width card shortens a long title with an ellipsis", () => {
    const layout = layoutCard(
        plainLines("a"),
        options({
            chrome: "dots",
            title: "a-very-long-file-name-for-testing.ts",
            lineNumbers: false,
            width: "columns",
            columns: 20,
        }),
        measure
    );
    assert.equal(layout.window.width, 148);
    assert.equal(
        layout.chrome?.title?.text,
        `a-ver${String.fromCharCode(0x2026)}`
    );
});

test("soft wrap breaks after a space and hangs continuations at the indent", () => {
    const rows = wrapGlyphs(
        lineGlyphs([{ text: "    aaaa bbbb cccc dddd eeee", scope: "" }], 4),
        12
    );
    assert.deepEqual(
        rows.map((r) => [texts(r.glyphs), r.indent]),
        [
            ["    aaaa ", 0],
            ["bbbb ", 4],
            ["cccc ", 4],
            ["dddd ", 4],
            ["eeee", 4],
        ]
    );
});

test("soft wrap cuts at the limit when a row has no space", () => {
    const rows = wrapGlyphs(
        lineGlyphs([{ text: "abcdefghijklmnopqrstuvwxyz", scope: "" }], 4),
        10
    );
    assert.deepEqual(
        rows.map((r) => texts(r.glyphs)),
        ["abcdefghij", "klmnopqrst", "uvwxyz"]
    );
});

test("wrapped continuations have no number and share the highlight", () => {
    const layout = layoutCard(
        plainLines(`${"x".repeat(45)}\ny`),
        options({ width: "columns", columns: 20, highlight: "1" }),
        measure
    );
    assert.deepEqual(
        layout.rows.map((r) => [
            r.number,
            r.highlighted,
            r.cells[0]?.text.length,
        ]),
        [
            [1, true, 20],
            [null, true, 20],
            [null, true, 5],
            [2, false, 1],
        ]
    );
});

test("tabs stop at the tab size and keep their token's scope", () => {
    const glyphs = lineGlyphs(
        [
            { text: "ab", scope: "keyword" },
            { text: "\tx", scope: "" },
        ],
        4
    );
    assert.equal(texts(glyphs), "ab  x");
    assert.equal(glyphs[2].scope, "");
    assert.equal(texts(lineGlyphs([{ text: "\t\ty", scope: "" }], 2)), "    y");
});

test("wide characters take two columns and marks stay on their letter", () => {
    assert.equal(charColumns("a".codePointAt(0) as number), 1);
    assert.equal(charColumns(0x4e2d), 2);
    assert.equal(charColumns(0x0301), 0);
    const accented = `e${String.fromCharCode(0x0301)}x`;
    assert.deepEqual(
        lineGlyphs([{ text: accented, scope: "" }], 4).map((g) => g.cols),
        [1, 1]
    );
    const thai = String.fromCharCode(0x0e01, 0x0e34, 0x0e19);
    assert.deepEqual(
        lineGlyphs([{ text: thai, scope: "" }], 4).map((g) => g.text.length),
        [2, 1]
    );
    const layout = layoutCard(
        plainLines(`a${String.fromCharCode(0x4e2d)}b`),
        options({}),
        measure
    );
    assert.equal(layout.columns, 4);
});

test("cards past 1024 board units export below 2x to stay within 2048 px", () => {
    assert.equal(exportScale(500, 300), 2);
    assert.equal(exportScale(1024, 200), 2);
    assert.equal(exportScale(200, 1600), 1.28);
});
