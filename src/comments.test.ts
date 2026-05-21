import { describe, it, expect } from 'vitest';
import { detectTag, extractComments, type CommentSyntax } from './comments';

const C: CommentSyntax = {
  line: ['//'],
  block: [['/*', '*/']],
  string: ['"', "'", '`'],
};

const HASH: CommentSyntax = {
  line: ['#'],
  string: ['"', "'"],
};

describe('extractComments', () => {
  it('finds a trailing line comment', () => {
    const out = extractComments('let x = 1; // hello', C);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('line');
    expect(out[0].text).toBe('hello');
    expect(out[0].startLine).toBe(0);
    expect(out[0].startCol).toBe(11);
    expect(out[0].endLine).toBe(0);
  });

  it('finds a block comment on one line', () => {
    const out = extractComments('a /* note */ b', C);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('block');
    expect(out[0].text).toBe('note');
  });

  it('finds a multi-line block comment', () => {
    const src = 'a\n/* one\ntwo */\nb';
    const out = extractComments(src, C);
    expect(out).toHaveLength(1);
    expect(out[0].startLine).toBe(1);
    expect(out[0].endLine).toBe(2);
    expect(out[0].text).toBe('one\ntwo');
  });

  it('ignores // inside a double-quoted string', () => {
    const out = extractComments('let s = "// not a comment";', C);
    expect(out).toHaveLength(0);
  });

  it('ignores /* */ inside a string', () => {
    const out = extractComments('let s = "/* nope */";', C);
    expect(out).toHaveLength(0);
  });

  it('honours escaped quotes inside strings', () => {
    const out = extractComments('let s = "he said \\"hi\\""; // real', C);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('real');
  });

  it('handles hash-style comments', () => {
    const out = extractComments('x = 1 # python', HASH);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('python');
  });

  it('respects the kinds filter (line only)', () => {
    const out = extractComments('// line\n/* block */', C, { line: true, block: false });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('line');
  });

  it('respects the kinds filter (block only)', () => {
    const out = extractComments('// line\n/* block */', C, { line: false, block: true });
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('block');
  });

  it('treats an unterminated block as comment to EOF', () => {
    const out = extractComments('code /* unterminated', C);
    expect(out).toHaveLength(1);
    expect(out[0].kind).toBe('block');
  });

  it('finds many comments in order', () => {
    const src = '// one\nlet x = 1; // two\n/* three */';
    const out = extractComments(src, C);
    expect(out.map((c) => c.text)).toEqual(['one', 'two', 'three']);
  });

  it('trims text but preserves raw', () => {
    const out = extractComments('//   spaced   ', C);
    expect(out[0].text).toBe('spaced');
    expect(out[0].raw).toBe('//   spaced   ');
  });

  it('treats newline as ending a single-quoted string (heuristic)', () => {
    const out = extractComments("a = 'oops\nlet x = 1; // real", C);
    expect(out).toHaveLength(1);
    expect(out[0].text).toBe('real');
  });

  it('handles consecutive line comments on adjacent lines', () => {
    const out = extractComments('// a\n// b\n// c', C);
    expect(out).toHaveLength(3);
    expect(out.map((c) => c.startLine)).toEqual([0, 1, 2]);
  });

  it('reports correct start column for a block comment', () => {
    const out = extractComments('xx /* m */', C);
    expect(out[0].startCol).toBe(3);
    expect(out[0].endCol).toBe(10);
  });
});

describe('detectTag', () => {
  const TAGS = ['TODO', 'FIXME', 'XXX', 'HACK'];

  it('flags a leading TODO', () => {
    expect(detectTag('TODO: fix this', TAGS)).toBe('todo');
  });

  it('flags FIXME case-insensitively', () => {
    expect(detectTag('fixme: later', TAGS)).toBe('todo');
  });

  it('ignores TODO that is not at the start', () => {
    expect(detectTag('refactor the TODO list', TAGS)).toBeNull();
  });

  it('strips leading comment chars and whitespace', () => {
    expect(detectTag('* TODO: jsdoc-style', TAGS)).toBe('todo');
    expect(detectTag('  // TODO embedded', TAGS)).toBe('todo');
  });

  it('requires a word boundary so TODOing does not match', () => {
    expect(detectTag('TODOing things', TAGS)).toBeNull();
  });

  it('returns null when the tag list is empty', () => {
    expect(detectTag('TODO: x', [])).toBeNull();
  });

  it('skips empty strings in the tag list', () => {
    expect(detectTag('TODO: x', ['', 'TODO'])).toBe('todo');
  });
});
