# Smart Script execution subset

## Purpose

Smart Script is the first executable connection between source and the board. It is a small parser and interpreter for a deliberately constrained array traversal pattern. It does not execute JavaScript or TypeScript, use `eval`, or expose browser or host APIs. Unsupported source is rejected with a line-specific message before any history is changed.

## Supported source

```ts
for (let i = 0; i < values.length; i++) {
  highlight(i);
}
```

The loop variable may use another identifier in place of `i`. Its start must be a non-negative integer literal. The only array symbol is `values`; the selected board array supplies its contents. The loop body can contain one or more of these statements:

```ts
highlight(i);
highlight(values[i]);
visit(values[i]);
total += values[i];
total += i;
```

Each statement highlights the current array cell. If the selected array has one pointer named after the loop variable, the runner also moves that pointer to the current index. Multiple matching pointers are considered ambiguous and stop execution.

Before the loop, scripts may declare unique integer variables such as `let total = 0;`. Accumulator statements update those variables and each timeline snapshot shows their values. Array accumulators require numeric values. Since the current visualization is an array, accumulator statements also highlight the value being read.

## Execution and history

The interpreter emits board operations and applies them through the normal history dispatcher. Highlights and pointer moves can be stepped backward or forward with the board timeline. Each event carries its source line and index-variable snapshot; the editor highlights the active line and displays the snapshot at the current history cursor. Running a script branches from the current history cursor, following the same behavior as other board edits.

The source is limited to 10,000 characters, the loop to 1,000 iterations, and its body to 100 supported statements. A run may create at most 5,000 timeline events. These limits apply before the interpreter dispatches any operation. An empty array yields no execution events.

## Explicit limits

The current subset does not support arbitrary expressions, nested control flow, function definitions, input/output, assignment beyond integer accumulation, asynchronous code, or other data structures. It reports declared integer variables and the loop index. It is a stepping and visualization foundation, not a general-purpose sandbox. Future language support should preserve the same requirements: bounded execution, explicit diagnostics, deterministic snapshots, and board changes routed through validated `BoardOperation` history.
