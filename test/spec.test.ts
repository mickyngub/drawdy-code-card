import assert from "node:assert/strict";
import { test } from "node:test";
import {
    DEFAULT_OPTIONS,
    MAX_CODE_LENGTH,
    normaliseOptions,
    normaliseSpec,
    type CardSpec,
} from "../src/shared/spec";

const SPEC: CardSpec = {
    code: "const a = 1;\n\tconsole.log(a);",
    language: "typescript",
    options: {
        ...DEFAULT_OPTIONS,
        theme: "dracula",
        font: "fira-code",
        fontSize: 16,
        ligatures: false,
        tabSize: 2,
        lineNumbers: false,
        startLine: 40,
        highlight: "41-42",
        chrome: "none",
        title: "app.ts",
        padding: 64,
        background: "solid",
        solid: "#123abc",
        radius: 0,
        shadow: "strong",
        width: "columns",
        columns: 60,
    },
};

test("a spec survives the round trip through board meta", () => {
    assert.deepEqual(normaliseSpec(JSON.parse(JSON.stringify(SPEC))), SPEC);
});

test("specs without code are refused", () => {
    assert.equal(normaliseSpec(null), null);
    assert.equal(normaliseSpec("code"), null);
    assert.equal(normaliseSpec({ language: "go" }), null);
    assert.equal(normaliseSpec({ code: "  \n " }), null);
});

test("missing or broken options fall back to the defaults", () => {
    const spec = normaliseSpec({ code: "x", language: "Type Script!" });
    assert.deepEqual(spec, {
        code: "x",
        language: "auto",
        options: DEFAULT_OPTIONS,
    });
    assert.deepEqual(
        normaliseOptions({
            theme: "solarized-dark",
            fontSize: 99,
            tabSize: 3,
            padding: 20,
            radius: -4,
            columns: 5.6,
            startLine: 1.4,
            solid: "red",
            title: "a\nb",
            ligatures: "yes",
        }),
        {
            ...DEFAULT_OPTIONS,
            fontSize: 24,
            radius: 0,
            columns: 20,
            startLine: 1,
            title: "a b",
        }
    );
});

test("code keeps Unix line endings and the size cap", () => {
    assert.equal(normaliseSpec({ code: "a\r\nb\rc" })?.code, "a\nb\nc");
    assert.equal(
        normaliseSpec({ code: "y".repeat(MAX_CODE_LENGTH + 10) })?.code.length,
        MAX_CODE_LENGTH
    );
});
