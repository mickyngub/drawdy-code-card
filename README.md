# Code Card

Turn a code snippet into a beautiful, syntax-highlighted card on your Drawdy board, like ray.so or Carbon. The card remembers its code, so when the code changes you edit the card instead of making a new screenshot.

![Pasting a TypeScript function into Code Card, switching the theme to Dracula and placing the card on the board.](https://raw.githubusercontent.com/mickyngub/drawdy-code-card/main/docs/media/code-card.gif)

## What it's for

- **Explaining code** in a review, a workshop or an architecture board, with the lines that matter highlighted.
- **Slides and docs**: a card with a window frame and a file name reads far better than a screenshot of your editor.
- **Snippets that stay editable**: fix a typo or update an example months later, in place.

## How to use

1. Click the **Code Card** button on the right of the board.
2. On the **Code** tab, paste your code, or click **Try a sample**. The language is detected for you, or you can pick it.
3. On the **Style** tab, choose a theme, a font and a background. The preview updates as you go; click it to see the card at full size.
4. Click **Place on board**. The card lands in view, next to anything already there rather than on top of it.
5. To change it later, select the card, click **Edit selected**, make your changes and click **Update on board**. **Place as new** makes a copy instead.

## Style options

- **Themes**: GitHub Light, GitHub Dark, One Dark, Dracula, Nord, Solarized Light and Monokai.
- **Fonts**: JetBrains Mono or Fira Code, 10 to 24 px, with ligatures on or off.
- **Line numbers**, starting from any number, and **highlighted lines** such as `3-5, 8`.
- **Window**: a title bar with three dots and a file name, or none.
- **Background**: six gradients, a solid colour or transparent, with padding, rounded corners and a shadow.
- **Width**: fit the code, or wrap long lines at a set number of columns.

## Tips

- Tab and Shift+Tab indent and outdent inside the code box.
- Cards are drawn at twice their board size, so text stays crisp when you zoom in. For very long code, two cards stay sharper than one.
- A card holds up to 500 lines and 20,000 characters.
- ⌘Z or Ctrl+Z takes a card back, from the panel too. An update takes two undo steps to reverse.

## Privacy

- Your code stays in the panel and on your board. The panel downloads the highlighter and the two fonts from jsDelivr.
- Your style choices are saved for next time. The code itself lives only in the cards you place.

## Credits and licence

- Highlighting by [highlight.js](https://highlightjs.org) (BSD-3-Clause). Fonts: JetBrains Mono and Fira Code (SIL Open Font Licence 1.1). Theme colours follow the highlight.js styles, Dracula (MIT) and Monokai.
- The extension's code is [MIT](https://github.com/mickyngub/drawdy-code-card/blob/main/LICENSE). Building it yourself? See [DEVELOPMENT.md](https://github.com/mickyngub/drawdy-code-card/blob/main/DEVELOPMENT.md).
