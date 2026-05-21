export type CommentSyntax = {
  line?: string[];
  block?: Array<[string, string]>;
  string?: string[];
};

export type CommentKind = 'line' | 'block';

export type CommentTag = 'todo' | null;

export type Comment = {
  kind: CommentKind;
  startLine: number;
  startCol: number;
  endLine: number;
  endCol: number;
  text: string;
  raw: string;
};

export function detectTag(text: string, tags: string[]): CommentTag {
  if (tags.length === 0) return null;
  const head = text.replace(/^[\/\*\s]+/, '');
  for (const t of tags) {
    if (!t) continue;
    const re = new RegExp(`^${escapeRegExp(t)}\\b`, 'i');
    if (re.test(head)) return 'todo';
  }
  return null;
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export type ScanKinds = { line: boolean; block: boolean };

export function extractComments(
  source: string,
  syntax: CommentSyntax,
  kinds: ScanKinds = { line: true, block: true },
): Comment[] {
  const lineMarkers = kinds.line ? syntax.line ?? [] : [];
  const blockMarkers = kinds.block ? syntax.block ?? [] : [];
  const stringDelims = syntax.string ?? [];

  const lineStarts = computeLineStarts(source);
  const out: Comment[] = [];
  const len = source.length;

  let i = 0;
  let stringDelim: string | null = null;

  while (i < len) {
    if (stringDelim !== null) {
      if (source[i] === '\\' && i + 1 < len) {
        i += 2;
        continue;
      }
      if (source.startsWith(stringDelim, i)) {
        i += stringDelim.length;
        stringDelim = null;
        continue;
      }
      if (source[i] === '\n' && stringDelim.length === 1 && stringDelim !== '`') {
        stringDelim = null;
      }
      i++;
      continue;
    }

    const blockHit = matchPair(source, i, blockMarkers);
    if (blockHit) {
      const [open, close] = blockHit;
      const start = i;
      i += open.length;
      const closeIdx = source.indexOf(close, i);
      const endExclusive = closeIdx === -1 ? len : closeIdx + close.length;
      const raw = source.slice(start, endExclusive);
      const inner = source.slice(
        start + open.length,
        endExclusive - (closeIdx === -1 ? 0 : close.length),
      );
      const startPos = offsetToPos(start, lineStarts);
      const endPos = offsetToPos(endExclusive, lineStarts);
      out.push({
        kind: 'block',
        startLine: startPos.line,
        startCol: startPos.col,
        endLine: endPos.line,
        endCol: endPos.col,
        text: inner.trim(),
        raw,
      });
      i = endExclusive;
      continue;
    }

    const lineHit = matchAny(source, i, lineMarkers);
    if (lineHit) {
      const start = i;
      const eol = source.indexOf('\n', i);
      const endExclusive = eol === -1 ? len : eol;
      const raw = source.slice(start, endExclusive);
      const inner = raw.slice(lineHit.length);
      const startPos = offsetToPos(start, lineStarts);
      const endPos = offsetToPos(endExclusive, lineStarts);
      out.push({
        kind: 'line',
        startLine: startPos.line,
        startCol: startPos.col,
        endLine: endPos.line,
        endCol: endPos.col,
        text: inner.trim(),
        raw,
      });
      i = endExclusive;
      continue;
    }

    const stringHit = matchAny(source, i, stringDelims);
    if (stringHit) {
      stringDelim = stringHit;
      i += stringHit.length;
      continue;
    }

    i++;
  }

  return out;
}

function matchAny(source: string, i: number, candidates: string[]): string | null {
  for (const c of candidates) {
    if (c.length > 0 && source.startsWith(c, i)) return c;
  }
  return null;
}

function matchPair(
  source: string,
  i: number,
  pairs: Array<[string, string]>,
): [string, string] | null {
  for (const p of pairs) {
    if (p[0].length > 0 && source.startsWith(p[0], i)) return p;
  }
  return null;
}

function computeLineStarts(source: string): number[] {
  const starts = [0];
  for (let i = 0; i < source.length; i++) {
    if (source[i] === '\n') starts.push(i + 1);
  }
  return starts;
}

function offsetToPos(offset: number, lineStarts: number[]): { line: number; col: number } {
  let lo = 0;
  let hi = lineStarts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >>> 1;
    if (lineStarts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return { line: lo, col: offset - lineStarts[lo] };
}
