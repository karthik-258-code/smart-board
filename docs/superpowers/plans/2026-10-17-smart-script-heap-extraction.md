# Smart Script Heap Extraction Implementation Plan

> **For agentic workers:** Executed autonomously under the user's project-wide instruction.

**Goal:** Add reversible min/max heap extraction to the constrained Smart Script runner.

**Architecture:** Validate one fixed template, read the current heap root before each extraction, and dispatch existing `heap/extract-top` operations. Save each extracted root and remaining heap size in the standard script snapshot.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, Vite.

**Spec:** `docs/superpowers/specs/2026-10-17-smart-script-heap-extraction-design.md`

## Global Constraints
- Never evaluate source code.
- Use existing reversible heap operations and bounded history events.
- Preserve legacy saved boards and trace validation.

## Review Focus
- Min/max heaps extract in their respective priority orders.
- Empty heaps produce no operations.
- Edited templates and non-heap targets fail cleanly.
- Saved inspections point at the value present before the extraction operation.

### Task 1: Interpreter and validation
- Test: `src/execution/smartScript.test.ts`
- Test: `src/domain/history.test.ts`
- Modify: `src/execution/smartScript.ts`
- Modify: `src/domain/history.ts`
- [x] Add failing min/max, empty, edited-template, undo/redo, and saved-inspection tests.
- [x] Implement bounded fixed-template extraction through history dispatch.
- [x] Run focused tests.

### Task 2: Panel integration
- Modify: `src/app/App.tsx`
- Modify: `src/app/SmartScriptPanel.tsx`
- Test: `src/app/SmartScriptPanel.test.tsx`
- Test: `src/app/App.test.tsx`
- Modify: `README.md`
- Modify: `docs/smart-script-execution.md`
- [x] Add heap targets, template control, mode label, and saved trace restoration coverage.
- [x] Run full suite (257 passing), build, lint, and `git diff --check`.

### Task 3: Commit and push
- [x] Commit and push the verified milestone.
