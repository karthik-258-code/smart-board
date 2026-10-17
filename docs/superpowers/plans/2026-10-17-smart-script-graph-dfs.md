# Smart Script Graph Depth-First Search Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a bounded iterative graph DFS template to Smart Script.

**Architecture:** Match a fixed DFS template with editable start label, traverse by stable graph node IDs using a LIFO stack, and emit reversible graph highlight events. Add a graph DFS control to the Smart Script panel.

**Tech Stack:** TypeScript, React, Vitest, Testing Library, Vite.

**Spec:** `docs/superpowers/specs/2026-10-17-smart-script-graph-dfs-design.md`

## Global Constraints

- Never evaluate user source with `eval`, `Function`, or host APIs.
- Route all graph changes through validated `BoardOperation` history.
- Keep existing source and event limits.
- Preserve saved execution metadata compatibility.

## Review Focus

- Cycles and duplicate stack entries must not duplicate visits.
- Disconnected nodes must stay unhighlighted.
- Missing or duplicate start labels and edited templates must fail cleanly.
- Neighbor ordering must stay deterministic.

---

### Task 1: DFS interpreter

**Files:**
- Modify: `src/execution/smartScript.ts`
- Test: `src/execution/smartScript.test.ts`

- [x] Add failing order, cycle, disconnected-node, invalid-label, and edited-template tests.
- [x] Run focused tests and confirm missing DFS behavior.
- [x] Implement the fixed LIFO traversal template and snapshots.
- [x] Run focused tests.

### Task 2: Panel integration and docs

**Files:**
- Modify: `src/app/SmartScriptPanel.tsx`
- Test: `src/app/SmartScriptPanel.test.tsx`
- Test: `src/app/App.test.tsx`
- Modify: `README.md`
- Modify: `docs/smart-script-execution.md`

- [x] Add DFS template control and mode label.
- [x] Verify graph target, run, timeline, and persistence behavior.
- [x] Update roadmap documentation.
- [x] Run full tests (244 passing with one worker), production build, lint, and `git diff --check`; commit and push milestone.
