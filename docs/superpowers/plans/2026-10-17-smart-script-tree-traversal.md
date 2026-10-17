# Smart Script Binary Tree Traversal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add safe preorder, inorder, and postorder Smart Script templates for binary trees.

**Architecture:** Validate one of three fixed source templates, traverse the selected `BinaryTreeObject` by node IDs, and emit reversible `tree/set-highlighted` history entries. Extend target selection and saved inspection validation.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, Vite.

**Spec:** `docs/superpowers/specs/2026-10-17-smart-script-tree-traversal-design.md`

## Global Constraints

- Never evaluate user source with `eval`, `Function`, or host APIs.
- Route every tree mutation through validated history operations.
- Keep the existing source and event limits.
- Preserve existing board and execution serialization compatibility.

## Review Focus

- Sparse trees must visit only reachable nodes in correct order.
- Empty trees must complete without invalid history.
- Invalid templates and invalid saved inspection values must fail validation.
- Numeric and string node values must both round-trip.

---

### Task 1: Tree traversal interpreter

**Files:**
- Modify: `src/execution/smartScript.ts`
- Test: `src/execution/smartScript.test.ts`
- Modify: `src/domain/history.ts`
- Test: `src/domain/history.test.ts`

- [x] Add failing preorder, inorder, postorder, empty-tree, unsupported-source, and history inspection tests.
- [x] Run focused tests and confirm failures identify missing tree support.
- [x] Implement fixed templates and deterministic traversal events.
- [x] Validate tree inspection snapshots against saved tree nodes.
- [x] Run focused tests.

### Task 2: App target and template integration

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/SmartScriptPanel.tsx`
- Test: `src/app/App.test.tsx`
- Test: `src/app/SmartScriptPanel.test.tsx`
- Modify: `README.md`
- Modify: `docs/smart-script-execution.md`

- [x] Add binary trees as Smart Script targets.
- [x] Add three template controls and context labels.
- [x] Verify execution, inspection, undo/redo, and saved-board restoration.
- [x] Update current feature and roadmap status.
- [x] Run full tests (238 passing), production build, lint, and `git diff --check`; commit and push milestone.
