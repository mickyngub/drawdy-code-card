export type Token = {
    text: string;
    /** The highlight.js scopes around the text, outermost first, space separated. */
    scope: string;
};

export type Line = Token[];

const NAMED: Record<string, string> = {
    amp: "&",
    lt: "<",
    gt: ">",
    quot: '"',
    apos: "'",
    nbsp: String.fromCharCode(0xa0),
};

export function decodeEntities(text: string): string {
    return text.replace(
        /&(#x[0-9a-f]{1,6}|#\d{1,7}|[a-z]{2,6});/gi,
        (whole, body: string) => {
            if (body[0] !== "#") return NAMED[body.toLowerCase()] ?? whole;
            const code =
                body[1] === "x" || body[1] === "X"
                    ? parseInt(body.slice(2), 16)
                    : parseInt(body.slice(1), 10);
            return code > 0 && code <= 0x10ffff
                ? String.fromCodePoint(code)
                : whole;
        }
    );
}

// highlight.js 11 writes the scope "title.class.inherited" as "hljs-title class_ inherited__".
export function classToScope(className: string): string | null {
    const parts = className.split(/\s+/).filter(Boolean);
    const start = parts.findIndex((part) => part.startsWith("hljs-"));
    if (start < 0) return null;
    const head = parts[start].slice("hljs-".length);
    if (head === "") return null;
    const rest = parts
        .slice(start + 1)
        .filter((part) => part.endsWith("_"))
        .map((part) => part.replace(/_+$/, ""));
    return [head, ...rest].join(".");
}

const TAG = /<span\s+class="([^"]*)"[^>]*>|<\/span>|<[^>]*>/g;

export function splitHighlightedHtml(html: string): Line[] {
    const lines: Line[] = [[]];
    const stack: (string | null)[] = [];
    const pushText = (raw: string) => {
        if (raw === "") return;
        const scope = stack.filter((s): s is string => s !== null).join(" ");
        const pieces = decodeEntities(raw).split("\n");
        pieces.forEach((piece, i) => {
            if (i > 0) lines.push([]);
            if (piece === "") return;
            const line = lines[lines.length - 1];
            const last = line[line.length - 1];
            if (last && last.scope === scope) last.text += piece;
            else line.push({ text: piece, scope });
        });
    };
    let at = 0;
    for (const match of html.matchAll(TAG)) {
        pushText(html.slice(at, match.index));
        at = match.index + match[0].length;
        if (match[1] !== undefined) stack.push(classToScope(match[1]));
        else if (match[0] === "</span>") stack.pop();
    }
    pushText(html.slice(at));
    return lines;
}

export function plainLines(code: string): Line[] {
    return code
        .split("\n")
        .map((text) => (text === "" ? [] : [{ text, scope: "" }]));
}
