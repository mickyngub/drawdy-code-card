// The languages in highlight.js's common build (@highlightjs/cdn-assets 11.12.0).
export const LANGUAGES: [string, string][] = [
    ["bash", "Bash"],
    ["c", "C"],
    ["cpp", "C++"],
    ["csharp", "C#"],
    ["css", "CSS"],
    ["diff", "Diff"],
    ["go", "Go"],
    ["graphql", "GraphQL"],
    ["xml", "HTML and XML"],
    ["ini", "INI and TOML"],
    ["java", "Java"],
    ["javascript", "JavaScript"],
    ["json", "JSON"],
    ["kotlin", "Kotlin"],
    ["less", "Less"],
    ["lua", "Lua"],
    ["makefile", "Makefile"],
    ["markdown", "Markdown"],
    ["objectivec", "Objective-C"],
    ["perl", "Perl"],
    ["php", "PHP"],
    ["plaintext", "Plain text"],
    ["python", "Python"],
    ["r", "R"],
    ["ruby", "Ruby"],
    ["rust", "Rust"],
    ["scss", "SCSS"],
    ["shell", "Shell session"],
    ["sql", "SQL"],
    ["swift", "Swift"],
    ["typescript", "TypeScript"],
    ["vbnet", "Visual Basic .NET"],
    ["wasm", "WebAssembly"],
    ["yaml", "YAML"],
];

const EXTRA: Record<string, string> = {
    "php-template": "PHP template",
    "python-repl": "Python REPL",
};

export function languageName(id: string): string {
    return LANGUAGES.find(([value]) => value === id)?.[1] ?? EXTRA[id] ?? id;
}
