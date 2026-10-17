# Smart Script Binary Tree Level-Order Implementation Plan

> **For agentic workers:** Executed autonomously under the user's project-wide instruction.

**Goal:** Add safe breadth-first level-order traversal for binary-tree objects.

**Architecture:** Validate an exact fixed template, traverse child IDs with a FIFO queue, and record reversible cumulative highlights and queue snapshots through existing history operations.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, Vite.

**Spec:** `docs/superpowers/specs/2026-10-17-smart-script-tree-level-order-design.md`

## Global Constraints
- Never evaluate script source.
- Route highlights through `tree/set-highlighted` history operations.
- Preserve bounded event limits, deterministic snapshots, and saved trace compatibility.

## Review Focus
- Sparse tree children visit in left-before-right breadth-first order.
- Empty root produces no visit events.
- Edited or extra source lines fail with a precise diagnostic.
- Queue length reflects the remaining queue after dequeue.

### Task 1: Interpreter
- Test: `src/execution/smartScript.test.ts`
- Modify: `src/execution/smartScript.ts`
- [x] Add failing level-order sequence, queue snapshot, empty tree, altered-template, and shared-dispatch tests; run focused tests.
- [x] Implement FIFO traversal and pass focused tests.

### Task 2: Panel and persistence integration
- Test: `src/app/SmartScriptPanel.test.tsx`
- Test: `src/app/App.test.tsx`
- Modify: `src/app/SmartScriptPanel.tsx`
- Modify: `README.md`
- Modify: `docs/smart-script-execution.md`
- [x] Add template selection and mode/help coverage; verify saved trace restoration.
- [x] Run full suite (251 passing), build, lint, and `git diff --check`.

### Task 3: Commit and push
- [x] Commit the completed feature and push the current branch.
