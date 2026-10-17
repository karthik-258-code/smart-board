# Smart Script Binary Tree Traversal Design

## Intent

Extend Smart Script so learners can watch standard binary-tree depth-first traversals on the existing editable tree object. Each visited node becomes one reversible timeline step, with a saved node index and value for inspection.

## Scope

- Provide fixed, safe templates for preorder, inorder, and postorder traversal.
- Accept only the exact supported template chosen by its traversal order; never evaluate source code.
- Traverse children by stable node IDs, starting at `rootId`.
- Highlight the cumulative visited-node prefix and store `visitedCount` on each event.
- Support empty trees, one-node trees, sparse trees, and string or numeric values.
- Add binary trees to Smart Script target selection and expose three template buttons.
- Persist and validate tree inspection snapshots through board files and history.

## Behavior

Each traversal template mirrors conventional recursive pseudocode. A visit operation records the corresponding source line, tree node index, and node value. Empty trees complete with zero events. The tree's saved node order defines snapshot indices; child order comes from `leftId` and `rightId`.

## Safety and compatibility

Keep source length and timeline event limits. Route highlights through `tree/set-highlighted` and existing history dispatch. Preserve existing execution serialization; validate inspections against the selected tree's node array.

## Acceptance

- All three orders produce their standard visit sequences for a nontrivial sparse tree.
- Undo, redo, save, reload, and history validation preserve the trace and highlights.
- Unsupported or altered templates fail with a line-specific error and no mutation.
- Existing graph BFS, binary search, and traversal scripts remain unchanged.
