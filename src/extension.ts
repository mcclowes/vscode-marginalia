import * as vscode from 'vscode';
import {
  extractComments,
  detectTag,
  type CommentKind,
  type CommentTag,
} from './comments';
import { syntaxForLanguage } from './languageComments';
import { wrapText } from './wrap';

const CONFIG_SECTION = 'marginalia';
const DEBOUNCE_MS = 150;
const COLUMN_GAP = 3;

export function activate(context: vscode.ExtensionContext): void {
  const manager = new DecorationManager();

  const applyAll = () => {
    for (const editor of vscode.window.visibleTextEditors) manager.apply(editor);
  };

  let pending: NodeJS.Timeout | undefined;
  const debouncedApplyAll = () => {
    if (pending) clearTimeout(pending);
    pending = setTimeout(applyAll, DEBOUNCE_MS);
  };

  // Re-apply only when the cursor crosses to a different line, so the
  // hide-on-overflow / cursor-reveal logic flips without thrashing on every
  // intra-line keypress.
  const lastLine = new WeakMap<vscode.TextEditor, number>();

  context.subscriptions.push(
    manager,
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) manager.apply(editor);
    }),
    vscode.window.onDidChangeVisibleTextEditors(() => applyAll()),
    vscode.window.onDidChangeTextEditorSelection((event) => {
      const line = event.textEditor.selection.active.line;
      if (lastLine.get(event.textEditor) === line) return;
      lastLine.set(event.textEditor, line);
      manager.apply(event.textEditor);
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      const editor = vscode.window.activeTextEditor;
      if (editor && event.document === editor.document) debouncedApplyAll();
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration(CONFIG_SECTION)) {
        manager.rebuild();
        applyAll();
      }
    }),
    vscode.commands.registerCommand('marginalia.toggle', async () => {
      const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
      const next = !cfg.get<boolean>('enabled', true);
      await cfg.update('enabled', next, vscode.ConfigurationTarget.Global);
    }),
  );

  applyAll();
}

export function deactivate(): void {}

class DecorationManager implements vscode.Disposable {
  private dimType: vscode.TextEditorDecorationType;
  private hideType: vscode.TextEditorDecorationType;
  private marginType: vscode.TextEditorDecorationType;

  constructor() {
    this.dimType = this.makeDimType();
    this.hideType = vscode.window.createTextEditorDecorationType({
      textDecoration: 'none; display: none;',
    });
    this.marginType = vscode.window.createTextEditorDecorationType({});
  }

  rebuild(): void {
    this.dimType.dispose();
    this.dimType = this.makeDimType();
  }

  dispose(): void {
    this.dimType.dispose();
    this.hideType.dispose();
    this.marginType.dispose();
  }

  apply(editor: vscode.TextEditor): void {
    const cfg = vscode.workspace.getConfiguration(CONFIG_SECTION);
    if (!cfg.get<boolean>('enabled', true)) {
      this.clear(editor);
      return;
    }

    const syntax = syntaxForLanguage(editor.document.languageId);
    if (!syntax) {
      this.clear(editor);
      return;
    }

    const kinds = new Set(cfg.get<string[]>('commentKinds', ['line', 'block']));
    const comments = extractComments(editor.document.getText(), syntax, {
      line: kinds.has('line'),
      block: kinds.has('block'),
    });

    const maxLen = cfg.get<number>('maxLength', 100);
    const alignment = cfg.get<string>('alignment', 'column');
    const anchorColumn = cfg.get<number>('anchorColumn', 120);
    const italic = cfg.get<boolean>('italic', true);
    const todoTags = cfg.get<string[]>('todoTags', ['TODO', 'FIXME', 'XXX', 'HACK']);

    // Cursor reveal: never hide a comment on the line the cursor sits on, so
    // edits and the cursor itself remain visible inside the comment.
    const activeLine = editor.selection?.active.line ?? -1;

    const dimRanges: vscode.Range[] = [];
    const hideRanges: vscode.Range[] = [];
    const items: MarginItem[] = [];

    // Lines that already have a primary chip — wrap continuations can't land
    // here without colliding with another comment's marginalia.
    const occupiedLines = new Set<number>();
    for (const c of comments) {
      if (c.kind === 'block' && c.endLine > c.startLine) {
        for (let l = c.startLine; l <= c.endLine; l++) occupiedLines.add(l);
      } else {
        occupiedLines.add(c.startLine);
      }
    }

    const pushItem = (
      line: number,
      visibleLineLen: number,
      text: string,
      kind: CommentKind,
      tag: CommentTag,
      hover?: vscode.MarkdownString,
    ) => {
      const lineEnd = editor.document.lineAt(line).range.end;
      items.push({
        range: new vscode.Range(lineEnd, lineEnd),
        lineLen: visibleLineLen,
        text,
        kind,
        tag,
        hover,
      });
    };

    for (const c of comments) {
      const range = new vscode.Range(c.startLine, c.startCol, c.endLine, c.endCol);
      const tag = detectTag(c.text, todoTags);

      if (c.kind === 'block' && c.endLine > c.startLine) {
        // Render each source line of a multi-line block as its own marginalia,
        // so the comment keeps its shape instead of collapsing onto one line.
        dimRanges.push(range);
        for (let line = c.startLine; line <= c.endLine; line++) {
          const lineText = editor.document.lineAt(line).text;
          const fragment =
            line === c.startLine
              ? lineText.slice(c.startCol)
              : line === c.endLine
                ? lineText.slice(0, c.endCol)
                : lineText;
          const text = cleanBlockLine(fragment);
          if (text) pushItem(line, lineText.length, text, c.kind, tag);
        }
        continue;
      }

      const full = collapse(c.text);
      if (!full) continue;

      // If the line overflows the marginalia column because of the comment
      // itself, hide the inline so the chip can sit in the column. Reveal it
      // again when the cursor is on that line so editing still works.
      const lineText = editor.document.lineAt(c.startLine).text;
      const prefix = lineText.slice(0, c.startCol);
      const trailing = prefix.trim().length > 0;
      const singleLine = c.startLine === c.endLine;
      const overflows = lineText.length > anchorColumn;
      const hideInline = trailing && singleLine && overflows && c.startLine !== activeLine;
      if (hideInline) hideRanges.push(range);
      else dimRanges.push(range);

      // Wrap onto consecutive free lines so long comments stay fully readable
      // without forcing truncation.
      const chunks = wrapText(full, maxLen);
      let placed = 0;
      for (let i = 0; i < chunks.length; i++) {
        const targetLine = c.startLine + i;
        if (i > 0) {
          if (targetLine >= editor.document.lineCount) break;
          if (occupiedLines.has(targetLine)) break;
          if (editor.document.lineAt(targetLine).text.length >= anchorColumn) break;
          occupiedLines.add(targetLine);
        }
        const visibleLineLen =
          i === 0 && hideInline
            ? prefix.length
            : editor.document.lineAt(targetLine).text.length;
        pushItem(targetLine, visibleLineLen, chunks[i], c.kind, tag);
        placed++;
      }

      if (placed > 0 && placed < chunks.length) {
        // Couldn't fit the whole comment — signal truncation on the last
        // visible chip and offer the original on hover.
        const last = items[items.length - 1];
        last.text = last.text + '…';
        last.hover = new vscode.MarkdownString().appendText(c.text);
      }
    }

    // 'column': align every marginalia at anchorColumn; lines longer than it
    // simply trail (min COLUMN_GAP), so marginalia never overlaps code.
    const marginOptions: vscode.DecorationOptions[] = items.map((it) => {
      const marginCh =
        alignment === 'column' ? Math.max(COLUMN_GAP, anchorColumn - it.lineLen) : COLUMN_GAP;
      const deco: vscode.DecorationOptions = {
        range: it.range,
        renderOptions: { after: buildAfter(it.text, marginCh, italic, it.kind, it.tag) },
      };
      if (it.hover) deco.hoverMessage = it.hover;
      return deco;
    });

    editor.setDecorations(this.dimType, dimRanges);
    editor.setDecorations(this.hideType, hideRanges);
    editor.setDecorations(this.marginType, marginOptions);
  }

  private clear(editor: vscode.TextEditor): void {
    editor.setDecorations(this.dimType, []);
    editor.setDecorations(this.hideType, []);
    editor.setDecorations(this.marginType, []);
  }

  private makeDimType(): vscode.TextEditorDecorationType {
    const opacity = vscode.workspace
      .getConfiguration(CONFIG_SECTION)
      .get<number>('dimInlineOpacity', 0.25);
    return vscode.window.createTextEditorDecorationType({
      opacity: String(clamp(opacity, 0, 1)),
    });
  }
}

type MarginItem = {
  range: vscode.Range;
  lineLen: number;
  text: string;
  kind: CommentKind;
  tag: CommentTag;
  hover?: vscode.MarkdownString;
};

// Per-kind accent for the chip's left edge, so block and line comments read apart.
const KIND_ACCENT: Record<CommentKind, string> = {
  line: 'charts.blue',
  block: 'charts.purple',
};

const TODO_ACCENT = 'errorForeground';

function buildAfter(
  text: string,
  marginCh: number,
  italic: boolean,
  kind: CommentKind,
  tag: CommentTag,
): vscode.ThemableDecorationAttachmentRenderOptions {
  const accent = tag === 'todo' ? TODO_ACCENT : KIND_ACCENT[kind];
  const fg = tag === 'todo' ? TODO_ACCENT : 'editorInlayHint.foreground';
  return {
    contentText: text,
    color: new vscode.ThemeColor(fg),
    backgroundColor: new vscode.ThemeColor('editorInlayHint.background'),
    borderColor: new vscode.ThemeColor(accent),
    fontStyle: italic ? 'italic' : 'normal',
    margin: `0 0 0 ${marginCh}ch`,
    // VSCode only injects `text-decoration` verbatim; the trailing declarations
    // ride along to give the chip a left accent, rounded corners and padding.
    // `pointer-events: none` so the chip doesn't swallow clicks meant for the
    // line beneath — selection/caret placement still work over a chip.
    textDecoration:
      'none; border-style: solid; border-width: 0 0 0 2px; border-radius: 3px; padding: 0 6px; pointer-events: none; user-select: none;',
  };
}

function collapse(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

// Strip block delimiters and JSDoc-style leading '*' from one line of a block comment.
function cleanBlockLine(fragment: string): string {
  let s = fragment.trim();
  if (s.startsWith('/*')) s = s.slice(2).trim();
  if (s.endsWith('*/')) s = s.slice(0, -2).trim();
  if (s.startsWith('*')) s = s.slice(1).trim();
  return collapse(s);
}

function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n));
}
