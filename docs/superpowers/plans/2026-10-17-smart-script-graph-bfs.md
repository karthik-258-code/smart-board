# Smart Script Graph BFS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Execute bounded BFS against editable graph objects and connect each visit to the board timeline.

**Architecture:** Add an exact-source BFS interpreter branch that dispatches reversible graph highlighting. Extend saved execution validation and the existing target selector without changing the trace envelope.

**Tech Stack:** TypeScript, React, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-17-smart-script-graph-bfs-design.md`

## Global Constraints

- Never evaluate source with `eval`, `Function`, or host APIs.
- Use normal `dispatch` operations for every graph mutation.
- Keep source length at or below 10,000 characters and events at or below 5,000.
- Require a unique starting label; edges are undirected and preserve stored edge order.
- Preserve the existing saved execution envelope and old history compatibility.

## Review Focus

- Empty graph, missing start, and duplicate labels fail or complete without invalid state.
- Cycles and duplicate queue entries terminate with unique visits.
- Disconnected nodes stay unhighlighted.
- Invalid saved node indices/labels are rejected.
- Undo/redo and file reload preserve highlight prefixes and inspection snapshots.

---

### Task 1: BFS interpreter and history validation

**Files:**
- Modify: `src/execution/smartScript.ts`
- Test: `src/execution/smartScript.test.ts`
- Modify: `src/domain/history.ts`
- Test: `src/domain/history.test.ts`

- [x] Add failing graph BFS order, cycle, disconnected, line mapping, invalid-label, and history validation tests.
- [x] Run tests and confirm they fail for missing behavior.
- [x] Add fixed BFS template parser and reversible graph operations.
- [x] Extend saved execution validation for graph targets and node inspections.
- [x] Run focused tests for the interpreter and history validation.

### Task 2: Panel and app integration

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/SmartScriptPanel.tsx`
- Test: `src/app/SmartScriptPanel.test.tsx`
- Test: `src/app/App.test.tsx`

- [x] Add graph target and BFS template controls.
- [x] Test template selection, source editor, run results, and history stepping.
- [x] Verify built-in BFS graph trace persistence.
- [x] Run the graph BFS flow in a clean local browser session.
- [x] Update Smart Script docs and README roadmap status.
- [ ] Run full tests, build, lint, and `git diff --check`; commit and push milestone.
