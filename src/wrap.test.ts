import { describe, it, expect } from 'vitest';
import { wrapText } from './wrap';

describe('wrapText', () => {
  it('returns one line when under width', () => {
    expect(wrapText('hello world', 20)).toEqual(['hello world']);
  });

  it('wraps at word boundaries', () => {
    expect(wrapText('hello world foo bar baz', 11)).toEqual(['hello world', 'foo bar baz']);
  });

  it('returns [] for empty input', () => {
    expect(wrapText('', 20)).toEqual([]);
  });

  it('returns [] for whitespace-only input', () => {
    expect(wrapText('   \t  ', 20)).toEqual([]);
  });

  it('collapses runs of whitespace', () => {
    expect(wrapText('hello    world', 20)).toEqual(['hello world']);
  });

  it('hard-breaks a single word longer than width', () => {
    expect(wrapText('abcdefghij', 4)).toEqual(['abcd', 'efgh', 'ij']);
  });

  it('keeps short words on the same line until full', () => {
    expect(wrapText('a b c d e f g', 5)).toEqual(['a b c', 'd e f', 'g']);
  });

  it('starts a new line when the next word would overflow', () => {
    expect(wrapText('alpha beta gamma', 10)).toEqual(['alpha beta', 'gamma']);
  });
});
