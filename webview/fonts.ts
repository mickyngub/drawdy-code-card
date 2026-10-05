import type { FontId } from "../src/shared/spec";
import { FONT_FAMILIES, fontStack } from "./lib/font-faces";
import type { Measure } from "./lib/layout";

const TIMEOUT_MS = 8000;
const SAMPLE_LIMIT = 4000;

const failed = new Set<FontId>();

export async function loadFont(font: FontId, text: string): Promise<boolean> {
    if (typeof document === "undefined" || !document.fonts) return false;
    const sample = text.slice(0, SAMPLE_LIMIT) || "0";
    const timeout = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), TIMEOUT_MS)
    );
    try {
        const faces = await Promise.race([
            document.fonts.load(`16px "${FONT_FAMILIES[font]}"`, `0${sample}`),
            timeout,
        ]);
        const ok =
            faces !== null && faces.some((face) => face.status === "loaded");
        if (ok) failed.delete(font);
        else failed.add(font);
        return ok;
    } catch {
        failed.add(font);
        return false;
    }
}

export const fontFailed = (font: FontId): boolean => failed.has(font);

export function makeMeasure(font: FontId): Measure {
    const ctx = document.createElement("canvas").getContext("2d");
    const stack = fontStack(font);
    return (text, fontSize) => {
        if (!ctx) return Array.from(text).length * fontSize * 0.6;
        ctx.font = `${fontSize}px ${stack}`;
        return ctx.measureText(text).width;
    };
}
