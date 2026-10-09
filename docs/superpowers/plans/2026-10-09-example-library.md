# Example Library Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add validated, replayable examples for common algorithm explanations.

**Architecture:** Keep examples as typed initial documents and operation lists. Build HistoryState through `dispatch`, validate before exposure, and load through existing App history replacement/save path.

**Tech Stack:** TypeScript, React, existing domain operation/history system, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-example-library-design.md`

## Constraints

- Use existing BoardObject and BoardOperation types; add no example-only domain types.
- Build every sequence through dispatchHistory and validateHistory.
- Keep examples local and deterministic.
- Confirm before replacing a non-empty board.
- Store complete history and reset cursor to zero.

## Review Focus

- Invalid example operation: do not load partial history; show an error.
- Empty board: load without confirmation.
- Non-empty board or undo history: confirmation appears before replacement.
- Cancel: preserve current board, history, and local bytes.
- Example edits: branch history normally and survive reload.

### Task 1: Example definitions and tests

**Files:** Create `src/examples/catalog.ts`, `catalog.test.ts`.

- Define traversal, binary search, sliding-window, and Fibonacci-DP operation sequences.
- Export list metadata and `buildExampleHistory(id)` returning a validated Result.
- Test every example, cursor/entry count, key primitives, invalid IDs, replayed terminal states.

### Task 2: Picker and App loading

**Files:** Create `src/app/ExamplePicker.tsx`, modify App and CSS, App tests.

- Add accessible picker, Load button, and replacement confirmation.
- Reset selection/playback and save history at cursor zero.
- Keep current board and saved bytes when canceled or when example invalid.
- Test replacement, cancel, replay, and reload.

### Task 3: Docs and verification

- Update README with example catalog.
- Run focused tests, full suite, build, and diff check.
- Commit as `feat: add replayable algorithm examples`.

## Completion record

- Added four deterministic examples: array traversal, binary search, sliding window, and Fibonacci DP.
- Examples are built through domain dispatch, validated as complete histories, and load at cursor zero.
- Loading replaces populated boards only after confirmation; cancellation preserves the document and saved timeline.
- Added replay and persisted-history interaction coverage.
- Verification: focused tests passed (26), full suite passed (114 tests across 13 files), production build passed, and `git diff --check` passed.
- Commit: `feat: add replayable algorithm examples`.
