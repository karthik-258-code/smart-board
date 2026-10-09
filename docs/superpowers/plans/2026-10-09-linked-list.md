# Linked List Implementation Plan

> **For agentic workers:** This plan is executed autonomously under the user's project-wide instruction. Steps use checkbox syntax.

**Goal:** Add editable, replayable singly linked lists to the board.

**Architecture:** Add a typed board object whose ordered nodes have stable IDs and explicit next links. Use reversible operations, validation, SVG rendering, and inspector controls following existing object patterns.

**Tech Stack:** TypeScript, React, SVG, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-linked-list-design.md`

## Global Constraints
- Keep object type version 1 and board schema version 1.
- Keep all edits in BoardOperation history.
- No new runtime dependencies.

## Review Focus
- Reject duplicate node IDs, dangling links, cycles, and multiple roots.
- Empty and one-node lists render safely.
- Undo/redo restores exact node order and IDs.
- Removing a node repairs the predecessor link.
- Invalid operations leave document unchanged.

### Task 1: Model and operations
**Files:** `src/domain/model.ts`, `src/domain/objectRegistry.ts`, `src/domain/operations.ts`, `src/domain/operations.test.ts`, linked list domain tests.

- [x] Add linked-list data type, strict shape validation, unique IDs, bounded length, single-chain invariants.
- [x] Add insert/remove/reverse operations and exact inverses.
- [x] Write failing tests first; confirm invalid mutations and undo/redo behavior.
- [x] Run focused domain tests and commit.

### Task 2: Rendering and app controls
**Files:** `src/canvas/objectRenderers/LinkedListRenderer.tsx`, `src/canvas/ObjectRenderer.tsx`, `src/app/BoardToolbar.tsx`, `src/app/BoardInspector.tsx`, `src/app/App.tsx`, app/canvas tests, CSS.

- [x] Add toolbar action and SVG nodes/arrows with accessible object label.
- [x] Add inspector controls for append, prepend, insert-after, reverse, and remove.
- [x] Test default list, links, interaction, persistence and replay; empty state is rendered explicitly.
- [x] Run focused tests and commit.

### Task 3: Docs and verification
- [x] Update README and plan completion record.
- [ ] Run full test suite, build, and `git diff --check`.
- [ ] Commit as `feat: add linked list board object`.

## Completion record

- Added a version-1 linked-list object with stable node IDs and validated, acyclic next links.
- Added append, prepend, insert-after, remove, and reverse operations with exact inverses.
- Added SVG node/link rendering, inspector controls, toolbar creation, persistence, and replay coverage.
- Updated strict history validation so linked-list operations persist and reload correctly.
- Verification: focused tests passed; full suite passed (123 tests across 14 files), production build passed, and `git diff --check` passed.
