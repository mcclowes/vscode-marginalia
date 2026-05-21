// Greedy word-wrap. Returns an array of lines, each at most `width` characters
// long. Words longer than `width` are hard-broken into pieces of size `width`.
// Returns [] for empty / whitespace-only input.
export function wrapText(text: string, width: number): string[] {
  if (width <= 0) return text ? [text] : [];

  const words = text.split(/\s+/).filter((w) => w.length > 0);
  if (words.length === 0) return [];

  const lines: string[] = [];
  let current = '';

  const flush = () => {
    if (current) {
      lines.push(current);
      current = '';
    }
  };

  for (const word of words) {
    if (word.length > width) {
      flush();
      for (let i = 0; i < word.length; i += width) {
        const piece = word.slice(i, i + width);
        if (i + width >= word.length) {
          current = piece;
        } else {
          lines.push(piece);
        }
      }
      continue;
    }
    if (!current) {
      current = word;
    } else if (current.length + 1 + word.length <= width) {
      current += ' ' + word;
    } else {
      flush();
      current = word;
    }
  }
  flush();
  return lines;
}
