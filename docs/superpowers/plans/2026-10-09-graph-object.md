# Graph Object Implementation Plan

> **For agentic workers:** This plan is executed autonomously under the user's project-wide instruction. Steps use checkbox syntax.

**Goal:** Add a small editable undirected graph object with replayable operations.

**Architecture:** Store vertex and edge records in a graph board object. Apply strict invariants at the registry boundary and route edits through reversible history operations. Render with SVG using per-vertex local coordinates.

**Tech Stack:** TypeScript, React, SVG, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-graph-object-design.md`

## Global Constraints
- Preserve schema version 1 and existing version-1 objects.
- Keep edits in reversible BoardOperation history.
- Add no runtime dependencies.

## Review Focus
- Reject missing endpoints, duplicate IDs/edges, self edges, invalid highlights, and over-capacity graphs.
- Removing a vertex removes incident edges and highlights.
- Undo restores exact graph state.
- Empty and disconnected graphs render without failure.
- Reject invalid operations atomically.

### Task 1: Graph model and operations
- [ ] Write validation and operation tests; verify expected failures.
- [ ] Add graph types, strict registry validation, reversible add/remove/highlight operations.
- [ ] Register operation fields with strict history validation; test replay and inverses.
- [ ] Run focused domain tests and commit.

### Task 2: SVG graph and inspector
- [ ] Add toolbar sample graph, accessible node/edge rendering, and creation controls.
- [ ] Add inspector controls to add/remove vertices, connect/remove edges, and highlight.
- [ ] Test save/reload, interaction, empty state, and undo/redo.
- [ ] Run focused app tests and commit.

### Task 3: Documentation and verification
- [ ] Update README and completion record.
- [ ] Run full tests, build, and diff check.
- [ ] Commit as `feat: add graph board object`.
