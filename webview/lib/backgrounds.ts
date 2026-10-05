import type { GradientId, Shadow } from "../../src/shared/spec";

export const GRADIENTS: Record<
    GradientId,
    { name: string; from: string; to: string }
> = {
    mint: { name: "Mint", from: "#22c55e", to: "#0ea5e9" },
    ocean: { name: "Ocean", from: "#2193b0", to: "#6dd5ed" },
    sunset: { name: "Sunset", from: "#ff7e5f", to: "#feb47b" },
    grape: { name: "Grape", from: "#8e2de2", to: "#4a00e0" },
    peach: { name: "Peach", from: "#ffecd2", to: "#fcb69f" },
    midnight: { name: "Midnight", from: "#0f2027", to: "#2c5364" },
};

export const SHADOW_STYLES: Record<
    Shadow,
    { blur: number; y: number; colour: string } | null
> = {
    none: null,
    soft: { blur: 24, y: 8, colour: "rgba(0, 0, 0, 0.25)" },
    strong: { blur: 48, y: 20, colour: "rgba(0, 0, 0, 0.45)" },
};

export const DOT_COLOURS = ["#ff5f57", "#febc2e", "#28c840"];
