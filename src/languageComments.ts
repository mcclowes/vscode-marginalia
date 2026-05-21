import type { CommentSyntax } from './comments';

const C_STYLE: CommentSyntax = {
  line: ['//'],
  block: [['/*', '*/']],
  string: ['"', "'", '`'],
};

const HASH_STYLE: CommentSyntax = {
  line: ['#'],
  string: ['"', "'"],
};

const SQL_STYLE: CommentSyntax = {
  line: ['--'],
  block: [['/*', '*/']],
  string: ["'", '"'],
};

const HTML_STYLE: CommentSyntax = {
  block: [['<!--', '-->']],
  string: ['"', "'"],
};

const LANGUAGE_SYNTAX: Record<string, CommentSyntax> = {
  javascript: C_STYLE,
  javascriptreact: C_STYLE,
  typescript: C_STYLE,
  typescriptreact: C_STYLE,
  c: C_STYLE,
  cpp: C_STYLE,
  csharp: C_STYLE,
  java: C_STYLE,
  rust: C_STYLE,
  go: C_STYLE,
  kotlin: C_STYLE,
  swift: C_STYLE,
  scala: C_STYLE,
  dart: C_STYLE,
  groovy: C_STYLE,
  php: { line: ['//', '#'], block: [['/*', '*/']], string: ['"', "'"] },

  python: { line: ['#'], string: ['"', "'"] },
  ruby: HASH_STYLE,
  shellscript: HASH_STYLE,
  bash: HASH_STYLE,
  zsh: HASH_STYLE,
  yaml: HASH_STYLE,
  dockerfile: HASH_STYLE,
  makefile: HASH_STYLE,
  properties: HASH_STYLE,
  toml: HASH_STYLE,
  r: HASH_STYLE,
  perl: HASH_STYLE,
  ini: { line: [';', '#'], string: ['"', "'"] },

  sql: SQL_STYLE,
  lua: { line: ['--'], block: [['--[[', ']]']], string: ['"', "'"] },
  haskell: { line: ['--'], block: [['{-', '-}']], string: ['"'] },
  elm: { line: ['--'], block: [['{-', '-}']], string: ['"'] },

  html: HTML_STYLE,
  xml: HTML_STYLE,
  vue: HTML_STYLE,
  svelte: HTML_STYLE,

  css: { block: [['/*', '*/']], string: ['"', "'"] },
  scss: C_STYLE,
  less: C_STYLE,
};

export function syntaxForLanguage(languageId: string): CommentSyntax | undefined {
  return LANGUAGE_SYNTAX[languageId];
}
