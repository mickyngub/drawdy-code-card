import assert from "node:assert/strict";
import { test } from "node:test";
import { THEME_IDS } from "../src/shared/spec";
import { colourFor, SCOPES, THEMES } from "../webview/lib/themes";

const HEX = /^#[0-9a-f]{6}$/;

const luminance = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

test("every theme defines every scope and resolves each one to a colour", () => {
    for (const id of THEME_IDS) {
        const theme = THEMES[id];
        assert.deepEqual(
            Object.keys(theme.colours).sort(),
            [...SCOPES].sort(),
            theme.name
        );
        for (const scope of SCOPES) {
            const own = theme.colours[scope];
            assert.ok(own === null || HEX.test(own), `${theme.name} ${scope}`);
            assert.match(
                colourFor(theme, scope),
                HEX,
                `${theme.name} ${scope}`
            );
        }
    }
});

test("every theme styles the core scopes apart from plain text", () => {
    for (const id of THEME_IDS) {
        const theme = THEMES[id];
        for (const scope of [
            "comment",
            "keyword",
            "string",
            "number",
            "built_in",
            "title.function",
        ]) {
            assert.notEqual(
                colourFor(theme, scope),
                theme.foreground,
                `${theme.name} ${scope}`
            );
        }
    }
});

test("each theme's dark flag matches its background", () => {
    for (const id of THEME_IDS) {
        const theme = THEMES[id];
        assert.equal(luminance(theme.background) < 128, theme.dark, theme.name);
        assert.ok(
            Math.abs(
                luminance(theme.background) - luminance(theme.foreground)
            ) > 80,
            `${theme.name} text contrast`
        );
    }
});

test("colours resolve like CSS: innermost styled scope, then parents", () => {
    const github = THEMES["github-light"];
    assert.equal(colourFor(github, "string char.escape"), "#032f62");
    assert.equal(colourFor(github, "string subst"), "#24292e");
    assert.equal(colourFor(github, "params attr"), "#005cc5");
    assert.equal(colourFor(github, "variable.constant"), "#005cc5");
    assert.equal(colourFor(github, "title.class.inherited"), "#6f42c1");
    assert.equal(colourFor(github, ""), github.foreground);
    assert.equal(colourFor(github, "unknown"), github.foreground);
    const oneDark = THEMES["one-dark"];
    assert.equal(colourFor(oneDark, "title.function"), "#61aeee");
    assert.equal(colourFor(oneDark, "title.class"), "#e6c07b");
    assert.equal(colourFor(oneDark, "variable.language"), "#d19a66");
});
