# Code Card

Paste code and place it on your Drawdy board as a syntax-highlighted card, like ray.so or Carbon, that you can open and edit again later.

## How to use

1. Click the Code Card button (a white `</>` on a green-to-blue tile) on the right of the board.
2. On the **Code** tab, paste or type your code. Tab indents and Shift+Tab outdents, by the tab size you pick (2, 4 or 8). Press Esc to leave the box. Pick the **Language**, or leave it on **Auto detect**.
3. Shape the card on the **Style** tab. The preview on top updates as you go:
   - **Theme**: GitHub Light, GitHub Dark, One Dark, Dracula, Nord, Solarized Light or Monokai.
   - **Font**: JetBrains Mono or Fira Code, a **Font size** from 10 to 24 px, and **Ligatures** on or off.
   - **Line numbers**, with the **First line number** to count from.
   - **Highlight lines**: numbers and ranges as shown in the gutter, for example `3-5, 8`.
   - **Window**: three dots and a **File name** in the title bar, or none.
   - **Background**: six gradients, a solid colour you pick, or transparent. Then **Padding**, **Corner radius** and **Shadow**.
   - **Width**: fit the code, or a fixed number of columns where long lines wrap.
4. Click **Place on board**. The card lands in the middle of your view as one image, and the board moves to it. Press ⌘Z or Ctrl+Z to take it back.
5. To change a card later, select it on the board and click **Edit selected**. Its code and style come back into the panel. Click **Update on board** to replace it at the same spot and width, or **Place as new** for a copy. Press ⌘Z twice to undo an update. Press Escape to close the panel.

Your style settings are remembered for next time. The code is not.

## Good to know

- Network: the panel loads highlight.js 11.12.0 (`@highlightjs/cdn-assets`, checked with a subresource integrity hash) and the JetBrains Mono and Fira Code fonts (`@fontsource` 5.3.0) from jsDelivr. Your code stays in the panel and on the board. If highlight.js cannot load, the card is drawn in one colour and **Try again** loads it again. If a font cannot load, the card uses your system's monospace font.
- The card is a picture: WebP, or PNG when the background is transparent. It is drawn at twice its board size, so it stays sharp when you zoom in. A card longer or wider than 1024 board units is drawn at less than 2x to stay within 2048 pixels; the panel shows the scale under the preview.
- Storage: style settings are saved with Drawdy's extension storage (`kv-storage`) a moment after you change them. Each card keeps its code, language and style in its own data on the board, which is how **Edit selected** finds them.
- Limits: 500 lines and 20,000 characters per card. Code is drawn on a monospace grid; text in a script the fonts do not cover, such as Thai or Chinese, falls back to a system font and can sit slightly off the grid.

## Third-party code

- highlight.js (BSD-3-Clause) is loaded at runtime from jsDelivr, not bundled.
- JetBrains Mono and Fira Code are under the SIL Open Font Licence 1.1 and are loaded at runtime from jsDelivr.
- The theme colours follow highlight.js's own GitHub, GitHub Dark, Atom One Dark, Nord and Solarized Light styles (BSD-3-Clause) and the published Dracula (MIT) and Monokai palettes.

## Licence

This extension's code is [MIT](LICENSE).

## Development

```bash
npm install
npm test
npm run typecheck
npm run dev          # dev server on :5198; in Drawdy run ⌘K → "Add extension dev server" on a local board
npm run build        # regenerates src/webview-html.ts and dist/*.drawdyx
npm run preflight    # before submitting: committed, built, pushed, under Drawdy's limits, above the live version
```

Drawdy builds published versions from this repository's `src/index.ts`, so commit `src/webview-html.ts` after `npm run build`. Bump `driverVersion` in `manifest.json` for every release and add it to `CHANGELOG.md`. `npm test` holds the manifest and listing files to Drawdy's submission rules (a description of at most 500 characters, an icon of at most 256 KB, only `@drawdy/driver-protocol` imported from outside the repository).
