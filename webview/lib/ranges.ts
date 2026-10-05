export type LineRange = [number, number];

export type ParsedRanges = {
    ranges: LineRange[];
    invalid: string[];
};

const SINGLE = /^\d{1,6}$/;
const SPAN = /^(\d{1,6})-(\d{1,6})$/;
// People type en and em dashes for ranges too.
const DASH = new RegExp(
    `\\s*[-${String.fromCharCode(0x2013, 0x2014)}]\\s*`,
    "g"
);

export function parseLineRanges(text: string): ParsedRanges {
    const parts = text
        .replace(DASH, "-")
        .split(/[\s,;]+/)
        .filter((part) => part !== "");
    const found: LineRange[] = [];
    const invalid: string[] = [];
    for (const part of parts) {
        if (SINGLE.test(part)) {
            const n = Number(part);
            found.push([n, n]);
            continue;
        }
        const span = SPAN.exec(part);
        if (span) {
            const a = Number(span[1]);
            const b = Number(span[2]);
            found.push([Math.min(a, b), Math.max(a, b)]);
            continue;
        }
        invalid.push(part);
    }
    found.sort((a, b) => a[0] - b[0]);
    const ranges: LineRange[] = [];
    for (const [start, end] of found) {
        const last = ranges[ranges.length - 1];
        if (last && start <= last[1] + 1) last[1] = Math.max(last[1], end);
        else ranges.push([start, end]);
    }
    return { ranges, invalid };
}

export function inRanges(ranges: readonly LineRange[], line: number): boolean {
    return ranges.some(([start, end]) => line >= start && line <= end);
}
