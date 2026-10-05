import assert from "node:assert/strict";
import { test } from "node:test";
import {
    classToScope,
    decodeEntities,
    plainLines,
    splitHighlightedHtml,
} from "../webview/lib/hljs-html";
import { inRanges, parseLineRanges } from "../webview/lib/ranges";

test("line ranges read singles, spans, reversed spans and dashes", () => {
    assert.deepEqual(parseLineRanges("3-5,8"), {
        ranges: [
            [3, 5],
            [8, 8],
        ],
        invalid: [],
    });
    assert.deepEqual(parseLineRanges(" 8 , 5 - 3 ").ranges, [
        [3, 5],
        [8, 8],
    ]);
    const enDash = String.fromCharCode(0x2013);
    assert.deepEqual(parseLineRanges(`2${enDash}4; 10`).ranges, [
        [2, 4],
        [10, 10],
    ]);
    assert.deepEqual(parseLineRanges("").ranges, []);
});

test("line ranges merge overlapping and touching spans", () => {
    assert.deepEqual(parseLineRanges("1-3,2-4,6,7,20").ranges, [
        [1, 4],
        [6, 7],
        [20, 20],
    ]);
});

test("line ranges keep the valid parts and list the rest", () => {
    assert.deepEqual(parseLineRanges("a, 2, 3-x, 4-6"), {
        ranges: [
            [2, 2],
            [4, 6],
        ],
        invalid: ["a", "3-x"],
    });
});

test("inRanges checks both ends of a span", () => {
    const { ranges } = parseLineRanges("3-5,8");
    assert.deepEqual(
        [2, 3, 4, 5, 6, 7, 8, 9].map((n) => inRanges(ranges, n)),
        [false, true, true, true, false, false, true, false]
    );
});

test("entities decode once, including numeric ones", () => {
    assert.equal(
        decodeEntities(
            "&lt;a&gt; &amp;amp; &quot;x&quot; &#x27;y&#39; &#128512;"
        ),
        `<a> &amp; "x" 'y' ${String.fromCodePoint(128512)}`
    );
    assert.equal(
        decodeEntities("&bogus; &#0; & alone"),
        "&bogus; &#0; & alone"
    );
    assert.equal(decodeEntities("a&nbsp;b"), `a${String.fromCharCode(0xa0)}b`);
});

test("highlight.js classes become dotted scopes", () => {
    assert.equal(classToScope("hljs-keyword"), "keyword");
    assert.equal(classToScope("hljs-title function_"), "title.function");
    assert.equal(
        classToScope("hljs-title class_ inherited__"),
        "title.class.inherited"
    );
    assert.equal(classToScope("language-xml"), null);
});

// Output of highlight.js 11.12.0 for TypeScript, with a comment and a template
// string that both cross a line break.
const TYPESCRIPT =
    '<span class="hljs-comment">/* a\n b */</span>\n<span class="hljs-keyword">const</span> <span class="hljs-attr">s</span>: <span class="hljs-built_in">string</span> = <span class="hljs-string">`x &amp; <span class="hljs-subst">${y}</span>\nz`</span>;';

test("spans that cross a newline carry their scope onto the next line", () => {
    assert.deepEqual(splitHighlightedHtml(TYPESCRIPT), [
        [{ text: "/* a", scope: "comment" }],
        [{ text: " b */", scope: "comment" }],
        [
            { text: "const", scope: "keyword" },
            { text: " ", scope: "" },
            { text: "s", scope: "attr" },
            { text: ": ", scope: "" },
            { text: "string", scope: "built_in" },
            { text: " = ", scope: "" },
            { text: "`x & ", scope: "string" },
            { text: "${y}", scope: "string subst" },
        ],
        [
            { text: "z`", scope: "string" },
            { text: ";", scope: "" },
        ],
    ]);
});

// highlight.js 11.12.0 for XML: nested scopes and escaped text.
const XML =
    '<span class="hljs-tag">&lt;<span class="hljs-name">div</span> <span class="hljs-attr">class</span>=<span class="hljs-string">&quot;a&quot;</span>&gt;</span><span class="hljs-symbol">&amp;nbsp;</span>&#x27;<span class="hljs-tag">&lt;/<span class="hljs-name">div</span>&gt;</span>';

test("nested spans keep the whole scope stack", () => {
    assert.deepEqual(splitHighlightedHtml(XML), [
        [
            { text: "<", scope: "tag" },
            { text: "div", scope: "tag name" },
            { text: " ", scope: "tag" },
            { text: "class", scope: "tag attr" },
            { text: "=", scope: "tag" },
            { text: '"a"', scope: "tag string" },
            { text: ">", scope: "tag" },
            { text: "&nbsp;", scope: "symbol" },
            { text: "'", scope: "" },
            { text: "</", scope: "tag" },
            { text: "div", scope: "tag name" },
            { text: ">", scope: "tag" },
        ],
    ]);
});

test("blank lines and a trailing newline stay as empty lines", () => {
    assert.deepEqual(splitHighlightedHtml("a\n\nb\n"), [
        [{ text: "a", scope: "" }],
        [],
        [{ text: "b", scope: "" }],
        [],
    ]);
    assert.deepEqual(plainLines("a\n\nb"), [
        [{ text: "a", scope: "" }],
        [],
        [{ text: "b", scope: "" }],
    ]);
});

test("a span opened without highlight.js classes adds no scope", () => {
    assert.deepEqual(
        splitHighlightedHtml(
            '<span class="language-css"><span class="hljs-attribute">color</span>: red</span>'
        ),
        [
            [
                { text: "color", scope: "attribute" },
                { text: ": red", scope: "" },
            ],
        ]
    );
});
