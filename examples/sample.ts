// HOW TO USE THIS FILE
// 1. Press F5 in the project to launch the Extension Development Host.
// 2. Open this file in that new window.
// 3. Each comment below should appear dimmed in place and re-rendered
//    in a shared column on the right. The CHECK lines say what to expect.

// CHECK: this full-line comment renders as marginalia on the right.
const greeting = 'hello world';

const total = 42; // CHECK: this trailing comment renders to the right of the code

// CHECK: three consecutive comments each render on their own line
// CHECK: ...this is the second
// CHECK: ...this is the third
let counter = 0;

/* CHECK: a single-line block comment also renders as marginalia */
const enabled = true;

/*
 * CHECK: each line of a multi-line block comment renders as its own
 * marginalia chip, stacked on the right so the comment keeps its shape.
 */
function noop(): void {}

const tricky1 = 'this string contains // but it is NOT a comment';
// CHECK: the line above must have NO marginalia (// is inside a string).

const tricky2 = 'this string contains /* fake block */ markers too';
// CHECK: the line above must have NO marginalia either.

const escaped = 'he said \'hi\''; // CHECK: this real comment still renders despite escaped quotes

const url = 'https://example.com'; // CHECK: the // in the URL is ignored; only this comment renders

function add(a: number, b: number): number {
  return a + b; // CHECK: trailing comment inside a function body
}

const longComment = 1; // CHECK: a very long comment wraps onto subsequent free lines so the whole thing stays readable in the margin instead of being truncated, with the rest spilling onto blank or chip-free lines below until the comment runs out or the next chip blocks the way

export { greeting, total, counter, enabled, noop, add, longComment, tricky1, tricky2, escaped, url };
