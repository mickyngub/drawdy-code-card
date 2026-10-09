import type { CardOptions } from "../../src/shared/spec";
import type { Line } from "./hljs-html";
import { inRanges, parseLineRanges } from "./ranges";

export type Measure = (text: string, fontSize: number) => number;

export type Cell = { text: string; scope: string; col: number };

export type Row = {
    y: number;
    /** The line number shown in the gutter; null on a wrapped continuation. */
    number: number | null;
    highlighted: boolean;
    cells: Cell[];
};

export type Dot = { x: number; y: number; r: number };

export type CardLayout = {
    width: number;
    height: number;
    window: {
        x: number;
        y: number;
        width: number;
        height: number;
        radius: number;
    };
    chrome: {
        height: number;
        dots: Dot[];
        title: { text: string; x: number; y: number; fontSize: number } | null;
    } | null;
    fontSize: number;
    lineHeight: number;
    advance: number;
    gutterRight: number | null;
    codeX: number;
    rows: Row[];
    columns: number;
};

type Glyph = { text: string; scope: string; cols: number };

const ELLIPSIS = String.fromCharCode(0x2026);
const MIN_WINDOW_COLUMNS = 16;
const MAX_SIDE = 2048;

const WIDE: readonly [number, number][] = [
    [0x1100, 0x115f],
    [0x2e80, 0x303e],
    [0x3041, 0x33ff],
    [0x3400, 0x4dbf],
    [0x4e00, 0x9fff],
    [0xa000, 0xa4cf],
    [0xac00, 0xd7a3],
    [0xf900, 0xfaff],
    [0xfe30, 0xfe4f],
    [0xff00, 0xff60],
    [0xffe0, 0xffe6],
    [0x1f300, 0x1f64f],
    [0x1f680, 0x1f6ff],
    [0x1f900, 0x1f9ff],
    [0x20000, 0x3fffd],
];

const ZERO: readonly [number, number][] = [
    [0x0300, 0x036f],
    [0x0e31, 0x0e31],
    [0x0e34, 0x0e3a],
    [0x0e47, 0x0e4e],
    [0x1ab0, 0x1aff],
    [0x1dc0, 0x1dff],
    [0x200b, 0x200d],
    [0x20d0, 0x20ff],
    [0xfe00, 0xfe0f],
    [0xfe20, 0xfe2f],
    [0xfeff, 0xfeff],
];

const within = (ranges: readonly [number, number][], cp: number) =>
    ranges.some(([a, b]) => cp >= a && cp <= b);

export function charColumns(cp: number): number {
    if (within(ZERO, cp)) return 0;
    return within(WIDE, cp) ? 2 : 1;
}

const ZWJ = 0x200d;

export function lineGlyphs(line: Line, tabSize: number): Glyph[] {
    const glyphs: Glyph[] = [];
    let col = 0;
    let joinNext = false;
    for (const token of line) {
        for (const ch of token.text) {
            const cp = ch.codePointAt(0) as number;
            if (ch === "\t") {
                const spaces = tabSize - (col % tabSize);
                for (let i = 0; i < spaces; i++) {
                    glyphs.push({ text: " ", scope: token.scope, cols: 1 });
                }
                col += spaces;
                joinNext = false;
                continue;
            }
            const cols = charColumns(cp);
            const last = glyphs[glyphs.length - 1];
            if (last && (cols === 0 || joinNext) && last.text !== " ") {
                last.text += ch;
            } else {
                glyphs.push({ text: ch, scope: token.scope, cols });
                col += cols;
            }
            joinNext = cp === ZWJ;
        }
    }
    return glyphs;
}

const columnsOf = (glyphs: readonly Glyph[]) =>
    glyphs.reduce((sum, g) => sum + g.cols, 0);

/** Soft wraps at the column limit, at the last space past half the row when there is one. */
export function wrapGlyphs(
    glyphs: Glyph[],
    limit: number
): { glyphs: Glyph[]; indent: number }[] {
    let indent = 0;
    while (indent < glyphs.length && glyphs[indent].text === " ") indent++;
    const hang = Math.min(indent, Math.floor(limit / 2));
    const rows: { glyphs: Glyph[]; indent: number }[] = [];
    let rest = glyphs;
    for (;;) {
        const room = rows.length === 0 ? limit : limit - hang;
        if (columnsOf(rest) <= room) break;
        let used = 0;
        let cut = 0;
        while (cut < rest.length && used + rest[cut].cols <= room) {
            used += rest[cut].cols;
            cut++;
        }
        cut = Math.max(cut, 1);
        let before = used;
        for (let k = cut - 1; k > 0; k--) {
            before -= rest[k].cols;
            if (before < room / 2) break;
            if (rest[k].text === " ") {
                cut = k + 1;
                break;
            }
        }
        rows.push({
            glyphs: rest.slice(0, cut),
            indent: rows.length === 0 ? 0 : hang,
        });
        rest = rest.slice(cut);
    }
    rows.push({ glyphs: rest, indent: rows.length === 0 ? 0 : hang });
    return rows;
}

function toCells(glyphs: readonly Glyph[], indent: number): Cell[] {
    const cells: Cell[] = [];
    let col = indent;
    for (const glyph of glyphs) {
        const last = cells[cells.length - 1];
        if (last && last.scope === glyph.scope) last.text += glyph.text;
        else cells.push({ text: glyph.text, scope: glyph.scope, col });
        col += glyph.cols;
    }
    return cells;
}

function fitText(
    text: string,
    room: number,
    fontSize: number,
    measure: Measure
): string {
    const fits = (t: string) => measure(t, fontSize) <= room + 0.01;
    if (fits(text)) return text;
    const chars = Array.from(text);
    while (chars.length > 0) {
        chars.pop();
        const candidate = chars.join("").trimEnd() + ELLIPSIS;
        if (fits(candidate)) return candidate;
    }
    return "";
}

export function layoutCard(
    lines: readonly Line[],
    options: CardOptions,
    measure: Measure
): CardLayout {
    const f = options.fontSize;
    const advance = measure("0", f);
    const lineHeight = Math.round(f * 1.6);
    const padX = Math.round(f * 1.4);
    const padY = Math.round(f * 1.2);
    const { ranges } = parseLineRanges(options.highlight);
    const fixed = options.width === "columns";

    const rows: Row[] = [];
    let columns = 0;
    const source = lines.length > 0 ? lines : [[]];
    source.forEach((line, i) => {
        const number = options.startLine + i;
        const highlighted = inRanges(ranges, number);
        const glyphs = lineGlyphs(line, options.tabSize);
        const parts = fixed
            ? wrapGlyphs(glyphs, options.columns)
            : [{ glyphs, indent: 0 }];
        parts.forEach((part, k) => {
            columns = Math.max(columns, part.indent + columnsOf(part.glyphs));
            rows.push({
                y: 0,
                number: k === 0 ? number : null,
                highlighted,
                cells: toCells(part.glyphs, part.indent),
            });
        });
    });

    const lastNumber = options.startLine + source.length - 1;
    const gutterWidth = options.lineNumbers
        ? String(lastNumber).length * advance + 2 * advance
        : 0;
    const gridColumns = fixed
        ? options.columns
        : Math.max(columns, MIN_WINDOW_COLUMNS);
    let windowWidth = padX + gutterWidth + gridColumns * advance + padX;

    let chrome: CardLayout["chrome"] = null;
    let titleText = "";
    let titleWidth = 0;
    const titleSize = Math.round(f * 0.9);
    const chromeHeight = Math.round(f * 2.6);
    const dotR = Math.round(f * 0.43 * 10) / 10;
    const dotStep = Math.round(f * 1.43);
    const firstDot = Math.round(f * 1.3);
    const dotsEnd = firstDot + 2 * dotStep + dotR;
    if (options.chrome === "dots") {
        const title = options.title.trim();
        if (title !== "") {
            const wanted = measure(title, titleSize);
            if (!fixed) {
                windowWidth = Math.max(
                    windowWidth,
                    Math.ceil(2 * (dotsEnd + f) + wanted)
                );
            }
            titleText = fitText(
                title,
                windowWidth - 2 * (dotsEnd + f),
                titleSize,
                measure
            );
            titleWidth = titleText ? measure(titleText, titleSize) : 0;
        }
    }

    const pad = options.padding;
    const top =
        options.chrome === "dots" ? chromeHeight + Math.round(f * 0.4) : padY;
    const windowHeight = top + rows.length * lineHeight + padY;
    const win = {
        x: pad,
        y: pad,
        width: Math.round(windowWidth),
        height: windowHeight,
        radius: options.radius,
    };
    if (options.chrome === "dots") {
        chrome = {
            height: chromeHeight,
            dots: [0, 1, 2].map((i) => ({
                x: win.x + firstDot + i * dotStep,
                y: win.y + chromeHeight / 2,
                r: dotR,
            })),
            title: titleText
                ? {
                      text: titleText,
                      x: win.x + (win.width - titleWidth) / 2,
                      y: win.y + chromeHeight / 2,
                      fontSize: titleSize,
                  }
                : null,
        };
    }
    rows.forEach((row, i) => {
        row.y = win.y + top + i * lineHeight;
    });

    return {
        width: win.width + 2 * pad,
        height: win.height + 2 * pad,
        window: win,
        chrome,
        fontSize: f,
        lineHeight,
        advance,
        gutterRight: options.lineNumbers
            ? win.x + padX + gutterWidth - 2 * advance
            : null,
        codeX: win.x + padX + gutterWidth,
        rows,
        columns,
    };
}

export function exportScale(width: number, height: number): number {
    return Math.min(2, MAX_SIDE / Math.max(width, height, 1));
}

export const SOFT_EXPORT_SCALE = 1.2;

/** Rounds down, so a 1.998 scale reads 1.99 and never claims the full 2x. */
export function scaleLabel(scale: number): string {
    return `${Math.floor(scale * 100) / 100}x`;
}
