# Smart Script Graph BFS Design

**Status:** Approved under the project owner's standing instruction to continue autonomously
**Date:** 2026-10-17

## Intent

Connect supported code to an existing graph algorithm example. People should run and step through breadth-first traversal on their own editable graph while preserving the bounded, deterministic Smart Script model.

## Design

Add a fixed BFS template, similar to the existing fixed binary-search template. The only editable input is a JSON-quoted starting node label. Do not evaluate JavaScript or accept arbitrary graph code. Require an exact normalized template match.

Build undirected adjacency from the graph's edge order. Resolve the starting label to exactly one node. Reject a missing or duplicate label with a line-specific error before creating operations. BFS visits reachable nodes in FIFO order and only highlights each visited node once. Disconnected nodes stay unhighlighted.

For each visited node, dispatch a reversible `graph/set-highlighted` operation containing the complete visited prefix. Emit one execution event on the `highlight(current)` source line. The event records the current graph node's index and label, plus numeric `visitedCount` and `queueLength` variables. Use the existing execution trace envelope and target ID field to preserve save, undo/redo, and board-file compatibility.

Add graphs to the Smart Script target selector. Show a graph-specific template button, disable the binary-search template for graphs, and describe BFS behavior. Keep existing array, container, linked-list, and binary-search paths unchanged.

## Limits and validation

- Graph size stays within existing graph schema caps: 30 nodes and 60 edges.
- Source stays within the existing 10,000-character and 5,000-event execution limits.
- Start labels resolve to exactly one graph node.
- Saved graph trace inspections point to a valid node index and match its label.
- Graph traces cannot target non-graph objects; binary search remains array-only.
- Empty graphs and unreachable nodes produce no invalid operations.

## Acceptance

- BFS on the built-in graph visits `A, B, C, D` in that order.
- Cycles and disconnected components visit reachable vertices once and terminate.
- Each timeline step adds the current node to the highlighted prefix; undo and redo restore that prefix.
- Variables and inspected node appear at the selected source line and survive board-file round-trip.
- Missing/ambiguous start labels and source edits fail without changing history.
- Existing Smart Script, array, and binary-search tests remain green.
