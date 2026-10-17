# Smart Script execution subset

## Purpose

Smart Script is the first executable connection between source and the board. It is a small parser and interpreter for deliberately constrained array, stack, queue, linked-list, and graph traversal patterns. It does not execute JavaScript or TypeScript, use `eval`, or expose browser or host APIs. Unsupported source is rejected with a line-specific message before any history is changed.

## Supported source

```ts
for (let i = 0; i < values.length; i++) {
  highlight(i);
}
```

The loop variable may use another identifier in place of `i`. Its start must be a non-negative integer literal. The only sequence symbol is `values`; the selected array, stack, queue, or linked list supplies its contents. The loop body can contain one or more of these statements:

```ts
highlight(i);
highlight(values[i]);
visit(values[i]);
total += values[i];
total += i;
```

Each statement highlights the selected array cell, container value, or linked-list node. `highlight(i)` uses the current loop index. `highlight(left)` can use a declared numeric variable as an index; when a matching pointer named `left` targets the array, that pointer moves on the same source line. This supports scripts that teach named roles such as `left` and `right`. Highlight indices must be integers inside the selected structure. Duplicate matching pointers and invalid indices return line-specific errors. Stack traversal uses the stack's stored bottom-to-top order; the renderer highlights the matching cell at its displayed position. Queue traversal follows front-to-back order. Linked-list traversal follows the current node chain and stores the selected node ID, so reversing the list preserves the node selection. These highlights are reversible board operations and persist with the execution trace.

Before the loop, scripts may declare unique integer variables such as `let total = 0;`. Accumulator statements update those variables and each timeline snapshot shows their values. Array accumulators require numeric values. Since the current visualization is an array, accumulator statements also highlight the value being read.

Traversal bodies also support nested numeric `if/else` blocks, arithmetic expressions, and `break;` / `continue;` statements, including inside conditional branches. `break` exits the array loop; `continue` skips the remaining statements for the current value. Both are visible timeline steps. Expressions can use `values[i]`, the loop index, declared numeric variables, and numeric literals with unary `+`/`-`, `+`, `-`, `*`, `/`, `%`, and parentheses. Multiplication, division, and remainder bind before addition and subtraction. Conditions compare two expressions with `<`, `<=`, `>`, `>=`, `===`, or `!==`, and combine comparisons with short-circuit `&&` and `||` (`&&` binds more tightly). Each executed condition and branch statement becomes a timeline step. Division or remainder by zero is reported with a source-line diagnostic if the expression is evaluated. For example:

```ts
let positive = 0;
let notPositive = 0;
for (let i = 0; i < values.length; i++) {
  if ((values[i] + 1) % 3 === 0) {
    weightedTotal += values[i] * 2 + i;
  } else {
    skipped += 1;
  }
  highlight(i);
}
```

Loop control can also stop early or skip a value:

```ts
for (let i = 0; i < values.length; i++) {
  if (values[i] < 0) {
    continue;
  }
  if (values[i] === target) {
    break;
  }
  highlight(i);
}
```

### Binary search

The panel can load a fixed control-flow template for binary search. Change only its numeric target:

```ts
let target = 11;
let low = 0;
let high = values.length - 1;
while (low <= high) {
  let mid = Math.floor((low + high) / 2);
  highlight(mid);
  if (values[mid] === target) {
    found = mid;
    break;
  } else if (values[mid] < target) {
    low = mid + 1;
  } else {
    high = mid - 1;
  }
}
```

The selected array must contain finite numeric values sorted in ascending order; stacks and queues cannot be used for binary search. The interpreter updates `low`, `high`, and `mid`, exposes the inspected `value` and numeric `comparison` (`value - target`), and adds `found` when it locates the target. It can move one pointer named `mid` and update one range named `search`; duplicate matching objects are reported as ambiguous. The range shows the active candidate interval and becomes empty when the target is absent.

### Graph breadth-first search

The panel can load a fixed breadth-first search template for an editable graph. Change only the quoted start-node label:

```ts
let start = "A";
let queue = [start];
let visited = [start];
while (queue.length > 0) {
  let current = queue.shift();
  highlight(current);
  for (let neighbor of graph.neighbors(current)) {
    if (!visited.includes(neighbor)) {
      visited.push(neighbor);
      queue.push(neighbor);
    }
  }
}
```

The start label must identify one graph node. Edges are undirected; neighbor order follows stored edge order. The interpreter highlights reachable nodes once in FIFO order. Disconnected nodes stay unhighlighted. Each visit snapshot reports the graph node index and label, `visitedCount`, and remaining `queueLength`. The template is validated and never evaluated as JavaScript.

The panel also provides a fixed iterative depth-first search template. It uses a LIFO stack and the same start-label rules. Neighbors are pushed in stored edge order, so the last pushed unvisited neighbor is explored first. Each visit snapshot reports `visitedCount` and the remaining `stackLength`; cycles and duplicate pending stack entries do not produce duplicate visits.

### Binary-tree depth-first traversal

The panel provides fixed preorder, inorder, postorder, and level-order templates for binary trees. Level-order traversal uses a FIFO queue and visits each level from left to right:

```ts
function inorder(node) {
  if (node === null) return;
  inorder(node.left);
  highlight(node);
  inorder(node.right);
}
inorder(tree.root);
```

```ts
function levelOrder(node) {
  if (node === null) return;
  let queue = [node];
  while (queue.length > 0) {
    let current = queue.shift();
    highlight(current);
    if (current.left !== null) queue.push(current.left);
    if (current.right !== null) queue.push(current.right);
  }
}
levelOrder(tree.root);
```

Only the four built-in templates run. Each visit creates one reversible tree highlight operation and one snapshot with the node's saved tree index, value, and `visitedCount`; level-order snapshots also expose `queueLength` immediately after dequeue. Child links determine traversal order; empty trees complete with no events. Source is validated and never evaluated as JavaScript.

## Execution and history

The interpreter emits board operations and applies them through the normal history dispatcher. Highlights and pointer moves can be stepped backward or forward with the board timeline. Each event carries its source line and variable snapshot; traversal events also record the inspected index and value, and the editor displays these at the current history cursor. The binary-search template exposes its inspected value, index, and comparison through its variable snapshot. Running a script branches from the current history cursor, following the same behavior as other board edits. Script source and cursor mappings are validated with the board history, then persist with local saves and exported board files. A new manual board operation clears the trace so the code view cannot imply that it controls diverged state.

The source is limited to 10,000 characters, arithmetic expressions to 256 tokens and 32 nested parentheses, logical conditions to 32 levels, the loop to 1,000 executed iterations, and its body to 100 supported statements. A run may create at most 5,000 timeline events. These limits are enforced before returning a run; failed runs do not expose partial history. An empty array yields no execution events.

## Explicit limits

The current subset does not support arbitrary JavaScript expressions, loops inside traversal bodies, user-defined functions beyond the four fixed tree templates, input/output, asynchronous code, or traversal of heaps, hash tables, and tries. Arithmetic expressions are limited to 256 tokens and 32 nested parentheses. Binary-search, graph BFS/DFS, and tree traversal control flow are fixed to their templates. Traversal reports declared numeric variables and the loop index; binary search reports its bounds, midpoint, inspected value, comparison, target, and found index when present. Graph search reports visit count, its remaining queue or stack size, and current node. Tree traversal reports visit count and current node, plus queue length for level-order traversal. It is a stepping and visualization foundation, not a general-purpose sandbox. Future language support should preserve the same requirements: bounded execution, explicit diagnostics, deterministic snapshots, and board changes routed through validated `BoardOperation` history.
