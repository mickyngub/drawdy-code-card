import type { CardOptions } from "../src/shared/spec";
import { DOT_COLOURS, GRADIENTS, SHADOW_STYLES } from "./lib/backgrounds";
import { charColumns, type CardLayout } from "./lib/layout";
import { colourFor, type Theme } from "./lib/themes";

function roundRect(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    r: number
): void {
    const radius = Math.max(0, Math.min(r, w / 2, h / 2));
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
}

function backgroundFill(
    ctx: CanvasRenderingContext2D,
    options: CardOptions,
    width: number,
    height: number
): string | CanvasGradient {
    if (options.background === "solid") return options.solid;
    const gradient = GRADIENTS[options.background as keyof typeof GRADIENTS];
    const fill = ctx.createLinearGradient(0, 0, width, height);
    fill.addColorStop(0, gradient.from);
    fill.addColorStop(1, gradient.to);
    return fill;
}

export type CardFont = { stack: string; ligatures: boolean };

export function drawCard(
    canvas: HTMLCanvasElement,
    layout: CardLayout,
    options: CardOptions,
    theme: Theme,
    font: CardFont,
    scale: number,
    plain: boolean
): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    const win = layout.window;

    if (options.background !== "transparent") {
        ctx.fillStyle = backgroundFill(
            ctx,
            options,
            layout.width,
            layout.height
        );
        roundRect(ctx, 0, 0, layout.width, layout.height, options.radius);
        ctx.fill();
    }

    ctx.save();
    const shadow = SHADOW_STYLES[options.shadow];
    if (shadow) {
        // Canvas shadows are in device pixels; the transform does not scale them.
        ctx.shadowColor = shadow.colour;
        ctx.shadowBlur = shadow.blur * scale;
        ctx.shadowOffsetY = shadow.y * scale;
    }
    ctx.fillStyle = theme.background;
    roundRect(ctx, win.x, win.y, win.width, win.height, win.radius);
    ctx.fill();
    ctx.restore();

    ctx.save();
    roundRect(ctx, win.x, win.y, win.width, win.height, win.radius);
    ctx.clip();

    ctx.fillStyle = theme.highlight;
    for (const row of layout.rows) {
        if (row.highlighted) {
            ctx.fillRect(win.x, row.y, win.width, layout.lineHeight);
        }
    }

    ctx.textBaseline = "middle";
    if (layout.chrome) {
        layout.chrome.dots.forEach((dot, i) => {
            ctx.fillStyle = DOT_COLOURS[i];
            ctx.beginPath();
            ctx.arc(dot.x, dot.y, dot.r, 0, Math.PI * 2);
            ctx.fill();
        });
        const title = layout.chrome.title;
        if (title) {
            ctx.font = `${title.fontSize}px ${font.stack}`;
            ctx.textAlign = "left";
            ctx.fillStyle = theme.lineNumber;
            ctx.fillText(title.text, title.x, title.y);
        }
    }

    ctx.font = `${layout.fontSize}px ${font.stack}`;
    const half = layout.lineHeight / 2;
    if (layout.gutterRight !== null) {
        ctx.textAlign = "right";
        for (const row of layout.rows) {
            if (row.number === null) continue;
            ctx.fillStyle = row.highlighted
                ? theme.foreground
                : theme.lineNumber;
            ctx.fillText(String(row.number), layout.gutterRight, row.y + half);
        }
    }

    ctx.textAlign = "left";
    for (const row of layout.rows) {
        const y = row.y + half;
        for (const cell of row.cells) {
            if (cell.text.trim() === "") continue;
            ctx.fillStyle = plain
                ? theme.foreground
                : colourFor(theme, cell.scope);
            const x = layout.codeX + cell.col * layout.advance;
            if (font.ligatures) {
                ctx.fillText(cell.text, x, y);
                continue;
            }
            // One glyph per grid cell keeps the font from joining characters.
            let col = 0;
            let cluster = "";
            let clusterCol = 0;
            for (const ch of cell.text) {
                const cols = charColumns(ch.codePointAt(0) as number);
                if (cols === 0 && cluster !== "") {
                    cluster += ch;
                    continue;
                }
                if (cluster.trim() !== "") {
                    ctx.fillText(cluster, x + clusterCol * layout.advance, y);
                }
                cluster = ch;
                clusterCol = col;
                col += cols;
            }
            if (cluster.trim() !== "") {
                ctx.fillText(cluster, x + clusterCol * layout.advance, y);
            }
        }
    }
    ctx.restore();

    ctx.strokeStyle = theme.border;
    ctx.lineWidth = 1;
    roundRect(
        ctx,
        win.x + 0.5,
        win.y + 0.5,
        win.width - 1,
        win.height - 1,
        Math.max(0, win.radius - 0.5)
    );
    ctx.stroke();
}
