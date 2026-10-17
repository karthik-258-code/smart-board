# Smart Script Graph Depth-First Search Design

## Intent

Add graph depth-first search beside the existing breadth-first template so learners can compare queue and stack exploration on the same editable graph.

## Behavior

- Provide one fixed, safe iterative DFS template using a LIFO stack.
- Allow changing only the quoted start-node label, like graph BFS.
- Require one matching node label and use stable node IDs during traversal.
- Visit each reachable node once; leave disconnected nodes unhighlighted.
- Push neighbors in stored edge order, so stack behavior naturally visits the most recently pushed neighbor first.
- Create one reversible cumulative graph highlight and one inspection snapshot per visit.
- Report `visitedCount` and remaining `stackLength`; expose inspected graph node index and label.

## Safety and compatibility

Never evaluate source. Validate against the exact DFS template after normalizing the start label. Keep existing source/event limits and history serialization. Continue routing graph updates through `graph/set-highlighted`.

## Acceptance

- Traversal order is deterministic for cycles, duplicate pending entries, and disconnected nodes.
- Missing or duplicate start labels and edited templates fail without changing history.
- DFS snapshots persist and replay with graph history.
- Existing BFS and tree traversal templates remain unchanged.
