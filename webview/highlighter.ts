import { AUTO_LANGUAGE } from "../src/shared/spec";

const SCRIPT_URL =
    "https://cdn.jsdelivr.net/npm/@highlightjs/cdn-assets@11.12.0/highlight.min.js";
const SCRIPT_INTEGRITY =
    "sha384-wjfDDhOPPdjtva8vWBhWeVprSpmxisEu5aYT3q1JyACqXpdKpo3PWZTMVq24MBix";
const TIMEOUT_MS = 15000;

type Result = { value: string; language?: string };

type Hljs = {
    highlight(
        code: string,
        options: { language: string; ignoreIllegals: boolean }
    ): Result;
    highlightAuto(code: string): Result;
    getLanguage(name: string): unknown;
};

let loading: Promise<boolean> | null = null;

function hljs(): Hljs | null {
    const found = (window as unknown as { hljs?: Hljs }).hljs;
    return found && typeof found.highlight === "function" ? found : null;
}

// A classic script tag, so the bundle needs no dynamic import or fetch.
export function loadHighlighter(): Promise<boolean> {
    if (hljs()) return Promise.resolve(true);
    if (loading) return loading;
    loading = new Promise<boolean>((resolve) => {
        const script = document.createElement("script");
        script.src = SCRIPT_URL;
        script.integrity = SCRIPT_INTEGRITY;
        script.crossOrigin = "anonymous";
        const done = (ok: boolean) => {
            clearTimeout(timer);
            if (!ok) {
                script.remove();
                loading = null;
            }
            resolve(ok);
        };
        const timer = setTimeout(() => done(false), TIMEOUT_MS);
        script.onload = () => done(hljs() !== null);
        script.onerror = () => done(false);
        document.head.appendChild(script);
    });
    return loading;
}

export function highlightCode(
    code: string,
    language: string
): { html: string; detected: string | null } | null {
    const engine = hljs();
    if (!engine) return null;
    try {
        if (language !== AUTO_LANGUAGE && engine.getLanguage(language)) {
            const result = engine.highlight(code, {
                language,
                ignoreIllegals: true,
            });
            return { html: result.value, detected: null };
        }
        const result = engine.highlightAuto(code);
        return { html: result.value, detected: result.language ?? null };
    } catch {
        return null;
    }
}
