# Marginalia

A VS Code extension that renders code comments as flush-right **marginalia** — moving them out of the way of your code and lining them up in a clean right-hand column, the way notes sit in the margin of a book.

The original inline comment text is dimmed in place, and a tidy chip is drawn at a shared anchor column (or just trailing the line).

## Features

- **Column or trailing alignment** — align every comment at one shared right-hand column, or place each just after its own line.
- **Comment-aware** — distinguishes line and block comments from comment-like text inside strings.
- **TODO highlighting** — comments starting with `TODO`, `FIXME`, `XXX`, or `HACK` are highlighted in red.
- **Wrapping** — long comments wrap onto subsequent free lines; any remainder is shown on hover.
- **Cursor reveal** — the original comment is revealed when your cursor is on its line.
- **Broad language support** — JavaScript/TypeScript (+ JSX/TSX), Python, Ruby, Go, Rust, C/C++, C#, Java, Kotlin, Swift, Scala, Dart, PHP, shell, YAML, TOML, SQL, Lua, Haskell, Elm, HTML/XML, Vue, Svelte, CSS/SCSS/LESS, and more.

## Settings

| Setting | Default | Description |
| --- | --- | --- |
| `marginalia.enabled` | `true` | Enable comment marginalia rendering. |
| `marginalia.commentKinds` | `["line", "block"]` | Which kinds of comments to render. |
| `marginalia.dimInlineOpacity` | `0.25` | Opacity applied to the original inline comment text. |
| `marginalia.alignment` | `"column"` | `column` aligns all comments at one column; `trailing` places each after its own line. |
| `marginalia.anchorColumn` | `120` | Column at which marginalia are aligned. |
| `marginalia.maxLength` | `100` | Maximum characters per marginalia chip. |
| `marginalia.italic` | `true` | Render marginalia in italics. |
| `marginalia.todoTags` | `["TODO", "FIXME", "XXX", "HACK"]` | Tags highlighted in red. Set to `[]` to disable. |

## Commands

- **Marginalia: Toggle** (`marginalia.toggle`) — toggle rendering on or off.

## Development

```bash
npm install
npm run compile   # build to ./out
npm run watch     # rebuild on change
npm test          # run the Vitest suite
```

Press `F5` in VS Code to launch an Extension Development Host with the extension loaded.

## License

[MIT](LICENSE)
