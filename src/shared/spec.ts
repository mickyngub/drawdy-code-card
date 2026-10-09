export const THEME_IDS = [
    "github-light",
    "github-dark",
    "one-dark",
    "dracula",
    "nord",
    "solarized-light",
    "monokai",
] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export const FONT_IDS = ["jetbrains-mono", "fira-code"] as const;
export type FontId = (typeof FONT_IDS)[number];

export const GRADIENT_IDS = [
    "mint",
    "ocean",
    "sunset",
    "grape",
    "peach",
    "midnight",
] as const;
export type GradientId = (typeof GRADIENT_IDS)[number];

export const BACKGROUND_IDS = [
    ...GRADIENT_IDS,
    "solid",
    "transparent",
] as const;
export type BackgroundId = (typeof BACKGROUND_IDS)[number];

export const TAB_SIZES = [2, 4, 8] as const;
export type TabSize = (typeof TAB_SIZES)[number];

export const PADDINGS = [16, 32, 64, 128] as const;
export type Padding = (typeof PADDINGS)[number];

export const CHROMES = ["dots", "none"] as const;
export type Chrome = (typeof CHROMES)[number];

export const SHADOWS = ["none", "soft", "strong"] as const;
export type Shadow = (typeof SHADOWS)[number];

export const WIDTH_MODES = ["auto", "columns"] as const;
export type WidthMode = (typeof WIDTH_MODES)[number];

export const FONT_SIZE = { min: 10, max: 24 };
export const RADIUS = { min: 0, max: 24 };
export const COLUMNS = { min: 20, max: 160 };
export const START_LINE = { min: 0, max: 99999 };
export const MAX_CODE_LENGTH = 20000;
export const MAX_LINES = 500;
export const MAX_TITLE_LENGTH = 80;
export const MAX_HIGHLIGHT_LENGTH = 200;
export const AUTO_LANGUAGE = "auto";

export type CardOptions = {
    theme: ThemeId;
    font: FontId;
    fontSize: number;
    ligatures: boolean;
    tabSize: TabSize;
    lineNumbers: boolean;
    startLine: number;
    highlight: string;
    chrome: Chrome;
    title: string;
    padding: Padding;
    background: BackgroundId;
    solid: string;
    radius: number;
    shadow: Shadow;
    width: WidthMode;
    columns: number;
};

export type CardSpec = {
    code: string;
    language: string;
    options: CardOptions;
};

export const DEFAULT_OPTIONS: CardOptions = {
    theme: "one-dark",
    font: "jetbrains-mono",
    fontSize: 14,
    ligatures: true,
    tabSize: 4,
    lineNumbers: true,
    startLine: 1,
    highlight: "",
    chrome: "dots",
    title: "",
    padding: 32,
    background: "mint",
    solid: "#e2e8f0",
    radius: 12,
    shadow: "soft",
    width: "auto",
    columns: 80,
};

const HEX = /^#[0-9a-f]{6}$/i;
const LANGUAGE = /^[a-z0-9-]{1,32}$/;

function oneOf<T>(list: readonly T[], value: unknown, fallback: T): T {
    return list.includes(value as T) ? (value as T) : fallback;
}

function clampInt(
    value: unknown,
    range: { min: number; max: number },
    fallback: number
): number {
    if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
    return Math.min(range.max, Math.max(range.min, Math.round(value)));
}

const bool = (value: unknown, fallback: boolean): boolean =>
    typeof value === "boolean" ? value : fallback;

const line = (value: unknown, max: number, fallback: string): string =>
    typeof value === "string"
        ? value.replace(/[\r\n\t]+/g, " ").slice(0, max)
        : fallback;

export function normaliseOptions(raw: unknown): CardOptions {
    const got =
        typeof raw === "object" && raw !== null
            ? (raw as Record<string, unknown>)
            : {};
    const d = DEFAULT_OPTIONS;
    return {
        theme: oneOf(THEME_IDS, got.theme, d.theme),
        font: oneOf(FONT_IDS, got.font, d.font),
        fontSize: clampInt(got.fontSize, FONT_SIZE, d.fontSize),
        ligatures: bool(got.ligatures, d.ligatures),
        tabSize: oneOf(TAB_SIZES, got.tabSize, d.tabSize),
        lineNumbers: bool(got.lineNumbers, d.lineNumbers),
        startLine: clampInt(got.startLine, START_LINE, d.startLine),
        highlight: line(got.highlight, MAX_HIGHLIGHT_LENGTH, d.highlight),
        chrome: oneOf(CHROMES, got.chrome, d.chrome),
        title: line(got.title, MAX_TITLE_LENGTH, d.title),
        padding: oneOf(PADDINGS, got.padding, d.padding),
        background: oneOf(BACKGROUND_IDS, got.background, d.background),
        solid:
            typeof got.solid === "string" && HEX.test(got.solid)
                ? got.solid.toLowerCase()
                : d.solid,
        radius: clampInt(got.radius, RADIUS, d.radius),
        shadow: oneOf(SHADOWS, got.shadow, d.shadow),
        width: oneOf(WIDTH_MODES, got.width, d.width),
        columns: clampInt(got.columns, COLUMNS, d.columns),
    };
}

/** The file name and highlighted lines belong to one card, so they are never remembered. */
export type RememberedStyle = Omit<CardOptions, "title" | "highlight">;

export function rememberedStyle(options: CardOptions): RememberedStyle {
    const { title: _title, highlight: _highlight, ...style } = options;
    return style;
}

export function restoreStyle(
    current: CardOptions,
    saved: unknown
): CardOptions {
    return {
        ...normaliseOptions(saved),
        title: current.title,
        highlight: current.highlight,
    };
}

export function normaliseCode(code: string): string {
    return code.replace(/\r\n?/g, "\n");
}

export function normaliseSpec(raw: unknown): CardSpec | null {
    if (typeof raw !== "object" || raw === null) return null;
    const got = raw as Record<string, unknown>;
    if (typeof got.code !== "string") return null;
    const code = normaliseCode(got.code).slice(0, MAX_CODE_LENGTH);
    if (code.trim() === "") return null;
    const language =
        typeof got.language === "string" && LANGUAGE.test(got.language)
            ? got.language
            : AUTO_LANGUAGE;
    return { code, language, options: normaliseOptions(got.options) };
}
