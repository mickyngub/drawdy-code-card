import type { ThemeId } from "../../src/shared/spec";

export const SCOPES = [
    "comment",
    "quote",
    "doctag",
    "keyword",
    "built_in",
    "type",
    "literal",
    "number",
    "operator",
    "punctuation",
    "property",
    "attr",
    "attribute",
    "regexp",
    "string",
    "char.escape",
    "subst",
    "symbol",
    "variable",
    "variable.language",
    "variable.constant",
    "title",
    "title.class",
    "title.function",
    "params",
    "meta",
    "tag",
    "name",
    "selector-tag",
    "selector-id",
    "selector-class",
    "selector-attr",
    "selector-pseudo",
    "template-tag",
    "template-variable",
    "section",
    "bullet",
    "link",
    "code",
    "emphasis",
    "strong",
    "formula",
    "addition",
    "deletion",
] as const;
export type Scope = typeof SCOPES[number];

const SCOPE_SET: ReadonlySet<string> = new Set(SCOPES);

export type Theme = {
    name: string;
    dark: boolean;
    background: string;
    foreground: string;
    lineNumber: string;
    highlight: string;
    border: string;
    /** null: the theme leaves this scope to the scope around it, like an unstyled CSS class. */
    colours: Record<Scope, string | null>;
};

function define(
    base: Omit<Theme, "colours">,
    groups: Record<string, readonly Scope[]>,
    inherit: readonly Scope[]
): Theme {
    const colours: Partial<Record<Scope, string | null>> = {};
    const assign = (scope: Scope, colour: string | null) => {
        if (scope in colours) {
            throw new Error(`${base.name} sets ${scope} twice`);
        }
        colours[scope] = colour;
    };
    for (const [colour, scopes] of Object.entries(groups)) {
        for (const scope of scopes) assign(scope, colour);
    }
    for (const scope of inherit) assign(scope, null);
    const missing = SCOPES.filter((scope) => !(scope in colours));
    if (missing.length > 0) {
        throw new Error(`${base.name} leaves out ${missing.join(", ")}`);
    }
    return { ...base, colours: colours as Record<Scope, string | null> };
}

const LIGHT_BORDER = "rgba(0, 0, 0, 0.08)";
const DARK_BORDER = "rgba(255, 255, 255, 0.1)";

// Colours follow highlight.js's own github, github-dark, atom-one-dark, nord and
// solarized-light styles, and the published Dracula and Monokai palettes.
export const THEMES: Record<ThemeId, Theme> = {
    "github-light": define(
        {
            name: "GitHub Light",
            dark: false,
            background: "#ffffff",
            foreground: "#24292e",
            lineNumber: "#8c959f",
            highlight: "#fff8c5",
            border: LIGHT_BORDER,
        },
        {
            "#d73a49": [
                "doctag",
                "keyword",
                "template-tag",
                "template-variable",
                "type",
                "variable.language",
            ],
            "#6f42c1": ["title", "title.class", "title.function"],
            "#005cc5": [
                "attr",
                "attribute",
                "literal",
                "meta",
                "number",
                "operator",
                "variable",
                "selector-attr",
                "selector-class",
                "selector-id",
                "section",
            ],
            "#032f62": ["regexp", "string"],
            "#e36209": ["built_in", "symbol"],
            "#6a737d": ["comment", "code", "formula"],
            "#22863a": [
                "name",
                "quote",
                "selector-tag",
                "selector-pseudo",
                "addition",
            ],
            "#24292e": ["subst", "emphasis", "strong"],
            "#735c0f": ["bullet"],
            "#b31d28": ["deletion"],
        },
        [
            "punctuation",
            "property",
            "char.escape",
            "variable.constant",
            "params",
            "tag",
            "link",
        ]
    ),
    "github-dark": define(
        {
            name: "GitHub Dark",
            dark: true,
            background: "#0d1117",
            foreground: "#c9d1d9",
            lineNumber: "#6e7681",
            highlight: "#2b2616",
            border: DARK_BORDER,
        },
        {
            "#ff7b72": [
                "doctag",
                "keyword",
                "template-tag",
                "template-variable",
                "type",
                "variable.language",
            ],
            "#d2a8ff": ["title", "title.class", "title.function"],
            "#79c0ff": [
                "attr",
                "attribute",
                "literal",
                "meta",
                "number",
                "operator",
                "variable",
                "selector-attr",
                "selector-class",
                "selector-id",
            ],
            "#a5d6ff": ["regexp", "string"],
            "#ffa657": ["built_in", "symbol"],
            "#8b949e": ["comment", "code", "formula"],
            "#7ee787": ["name", "quote", "selector-tag", "selector-pseudo"],
            "#c9d1d9": ["subst", "emphasis", "strong"],
            "#1f6feb": ["section"],
            "#f2cc60": ["bullet"],
            "#aff5b4": ["addition"],
            "#ffdcd7": ["deletion"],
        },
        [
            "punctuation",
            "property",
            "char.escape",
            "variable.constant",
            "params",
            "tag",
            "link",
        ]
    ),
    "one-dark": define(
        {
            name: "One Dark",
            dark: true,
            background: "#282c34",
            foreground: "#abb2bf",
            lineNumber: "#636d83",
            highlight: "#353b45",
            border: DARK_BORDER,
        },
        {
            "#5c6370": ["comment", "quote"],
            "#c678dd": ["doctag", "keyword", "formula"],
            "#e06c75": ["section", "name", "selector-tag", "deletion", "subst"],
            "#56b6c2": ["literal"],
            "#98c379": ["string", "regexp", "addition", "attribute"],
            "#d19a66": [
                "attr",
                "variable",
                "template-variable",
                "type",
                "selector-class",
                "selector-attr",
                "selector-pseudo",
                "number",
            ],
            "#61aeee": [
                "symbol",
                "bullet",
                "link",
                "meta",
                "selector-id",
                "title",
            ],
            "#e6c07b": ["built_in", "title.class"],
        },
        [
            "operator",
            "punctuation",
            "property",
            "char.escape",
            "variable.language",
            "variable.constant",
            "title.function",
            "params",
            "tag",
            "template-tag",
            "code",
            "emphasis",
            "strong",
        ]
    ),
    dracula: define(
        {
            name: "Dracula",
            dark: true,
            background: "#282a36",
            foreground: "#f8f8f2",
            lineNumber: "#6272a4",
            highlight: "#44475a",
            border: DARK_BORDER,
        },
        {
            "#6272a4": ["comment", "quote", "formula"],
            "#ff79c6": [
                "keyword",
                "doctag",
                "selector-tag",
                "template-tag",
                "operator",
                "name",
                "meta",
                "char.escape",
            ],
            "#f1fa8c": ["string", "emphasis"],
            "#ff5555": ["regexp", "deletion"],
            "#bd93f9": [
                "number",
                "literal",
                "variable.constant",
                "variable.language",
                "symbol",
                "section",
            ],
            "#50fa7b": [
                "title",
                "title.function",
                "attr",
                "attribute",
                "selector-class",
                "selector-id",
                "selector-attr",
                "selector-pseudo",
                "addition",
                "code",
            ],
            "#8be9fd": ["title.class", "type", "built_in", "bullet", "link"],
            "#ffb86c": ["params", "template-variable", "strong"],
            "#f8f8f2": ["subst"],
        },
        ["punctuation", "property", "variable", "tag"]
    ),
    nord: define(
        {
            name: "Nord",
            dark: true,
            background: "#2e3440",
            foreground: "#d8dee9",
            lineNumber: "#616e88",
            highlight: "#3b4252",
            border: DARK_BORDER,
        },
        {
            "#81a1c1": [
                "selector-tag",
                "keyword",
                "literal",
                "symbol",
                "bullet",
                "name",
                "tag",
                "operator",
            ],
            "#8fbcbb": [
                "selector-id",
                "selector-class",
                "selector-attr",
                "built_in",
                "type",
                "title",
                "title.class",
                "code",
                "formula",
                "doctag",
                "attr",
            ],
            "#88c0d0": [
                "property",
                "selector-pseudo",
                "title.function",
                "section",
            ],
            "#b48ead": ["number"],
            "#ebcb8b": ["regexp"],
            "#a3be8c": ["string", "addition"],
            "#bf616a": ["deletion"],
            "#616e88": ["comment", "quote"],
            "#5e81ac": ["meta", "template-tag"],
            "#d8dee9": [
                "subst",
                "params",
                "attribute",
                "variable",
                "template-variable",
            ],
        },
        [
            "punctuation",
            "char.escape",
            "variable.language",
            "variable.constant",
            "link",
            "emphasis",
            "strong",
        ]
    ),
    "solarized-light": define(
        {
            name: "Solarized Light",
            dark: false,
            background: "#fdf6e3",
            foreground: "#657b83",
            lineNumber: "#93a1a1",
            highlight: "#eee8d5",
            border: LIGHT_BORDER,
        },
        {
            "#93a1a1": ["comment", "quote"],
            "#859900": ["keyword", "selector-tag", "addition"],
            "#2aa198": ["number", "string", "literal", "doctag", "regexp"],
            "#268bd2": [
                "title",
                "title.function",
                "section",
                "name",
                "selector-id",
                "selector-class",
            ],
            "#b58900": [
                "attribute",
                "attr",
                "variable",
                "template-variable",
                "title.class",
                "type",
            ],
            "#cb4b16": [
                "symbol",
                "bullet",
                "subst",
                "meta",
                "selector-attr",
                "selector-pseudo",
                "link",
            ],
            "#dc322f": ["built_in", "deletion"],
        },
        [
            "operator",
            "punctuation",
            "property",
            "char.escape",
            "variable.language",
            "variable.constant",
            "params",
            "tag",
            "template-tag",
            "code",
            "emphasis",
            "strong",
            "formula",
        ]
    ),
    monokai: define(
        {
            name: "Monokai",
            dark: true,
            background: "#272822",
            foreground: "#f8f8f2",
            lineNumber: "#90908a",
            highlight: "#3e3d32",
            border: DARK_BORDER,
        },
        {
            "#75715e": ["comment", "quote"],
            "#f92672": [
                "keyword",
                "selector-tag",
                "name",
                "doctag",
                "template-tag",
                "operator",
                "meta",
                "deletion",
            ],
            "#e6db74": ["string", "regexp", "link"],
            "#ae81ff": [
                "number",
                "literal",
                "variable.constant",
                "symbol",
                "char.escape",
            ],
            "#a6e22e": [
                "title",
                "title.function",
                "title.class",
                "attr",
                "attribute",
                "selector-class",
                "selector-id",
                "selector-attr",
                "selector-pseudo",
                "section",
                "addition",
            ],
            "#66d9ef": ["built_in", "type", "code", "bullet"],
            "#fd971f": ["params", "variable.language", "template-variable"],
            "#f8f8f2": ["subst"],
        },
        [
            "punctuation",
            "property",
            "variable",
            "tag",
            "emphasis",
            "strong",
            "formula",
        ]
    ),
};

/**
 * The colour of a token, read like CSS: the innermost scope the theme styles
 * wins, "title.function" falls back to "title", and an unstyled scope takes the
 * colour of the scope around it.
 */
export function colourFor(theme: Theme, scope: string): string {
    const stack = scope === "" ? [] : scope.split(" ");
    for (let i = stack.length - 1; i >= 0; i--) {
        let name = stack[i];
        for (;;) {
            if (SCOPE_SET.has(name)) {
                const colour = theme.colours[name as Scope];
                if (colour) return colour;
            }
            const dot = name.lastIndexOf(".");
            if (dot < 0) break;
            name = name.slice(0, dot);
        }
    }
    return theme.foreground;
}
