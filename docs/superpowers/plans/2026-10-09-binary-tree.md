# Binary Tree Implementation Plan

> **For agentic workers:** Executed autonomously under the user's project-wide instruction.

**Goal:** Add an editable, replayable binary tree.

**Architecture:** Store parent-child IDs and local node positions in one validated board object. Perform structural edits through reversible history operations and render links/nodes in SVG.

**Tech Stack:** TypeScript, React, SVG, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-binary-tree-design.md`

## Global Constraints
- Preserve board schema version 1 and all existing objects.
- All edits use BoardOperation history.
- No runtime dependencies.

## Review Focus
- Reject cycles, multiple parents, missing children, and invalid root states.
- Removing a node removes its full descendant subtree; undo restores it.
- Empty trees render and can receive a root.
- Full trees and occupied child slots reject edits atomically.

### Task 1: Model, operations, and tests
- [ ] Add failing tests for valid/invalid trees, insert, remove-subtree, and inverse history.
- [ ] Implement strict object validation and reversible operations.
- [ ] Register strict history fields; run focused tests and commit.

### Task 2: Canvas and controls
- [ ] Add sample tree toolbar control and accessible SVG renderer.
- [ ] Add inspector controls for root/child insertion, subtree removal, and highlighting.
- [ ] Test app edits, persistence, undo, and redo; run focused tests and commit.

### Task 3: Docs and verification
- [ ] Update README and completion record.
- [ ] Run full tests, production build, and diff check.
- [ ] Commit as `feat: add binary tree board object`.
