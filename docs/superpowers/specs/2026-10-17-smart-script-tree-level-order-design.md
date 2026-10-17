# Smart Script Binary Tree Level-Order Design

## Goal

Teach binary-tree breadth-first traversal using the editable tree already on the board.

## Design

Add one fixed level-order template and interpreter path. Traverse from `rootId` with a FIFO queue, enqueuing left child before right child. Emit one reversible cumulative tree-highlight operation per visit. Each event records the visited node index/value, `visitedCount`, and the queue size remaining immediately after dequeue, matching the template's highlight line. Empty and sparse trees are supported. The source is compared to the fixed template and never executed.

Expose the template through the Smart Script panel, label the active mode as binary-tree level-order traversal, and include it in help text. Reuse existing history, execution trace, persistence, and inspection contracts.

## Validation

- Tests verify breadth-first order and queue snapshots on a sparse tree.
- Empty tree creates no events; edited template fails with a source-line diagnostic.
- App and panel tests cover template selection and saved execution behavior.
- Existing tree DFS and all other script runners remain green.
