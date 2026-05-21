# CHECK: hash-style comments render as marginalia in Python files.
greeting = "hello world"

total = 42  # CHECK: this trailing comment renders to the right of the code

# CHECK: consecutive comments each render on their own line
# CHECK: ...second line
count = 0

tricky = "this string contains # but it is NOT a comment"
# CHECK: the line above must have NO marginalia (# is inside a string).

unterminated = 'oops
# CHECK: the single-quoted string above ends at the newline (heuristic),
# CHECK: so this line IS still detected as a real comment.


def add(a, b):
    return a + b  # CHECK: trailing comment inside a function body
