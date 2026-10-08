# Timeline Run/Pause Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add reliable autoplay to the existing board timeline without changing document or operation formats.

**Architecture:** Keep playback state in `App` and keep `HistoryControls` presentational. A single 700 ms timeout advances one existing history cursor step, then schedules the next; manual navigation, board edits, end-of-history, and unmount stop or clean up playback.

**Tech Stack:** React 19, TypeScript 6, Vite 8, Vitest 5, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-07-smart-board-architecture-design.md`, Phase 2 (operations and history), plus `README.md`, Phase 3 (run/pause/step/restart).

## Global Constraints

- Keep the operation and document contracts independent of rendering.
- Validate operations before changing state; invalid operations leave state unchanged.
- Preserve local save behavior and invalid-save recovery behavior.
- Add no runtime dependencies for timeline playback.
- Keep manual board workflows available when playback is stopped.

## Review Focus

- Empty history: Play is disabled and no timer is scheduled.
- Cursor at history end: playback cannot start and stops after reaching the end.
- Manual next, previous, restart, undo, and redo: cancel pending playback before moving.
- Board edits during playback: stop playback and preserve normal history branching.
- Timer cleanup: unmounting the app leaves no pending timer or state update.

### Task 1: Add timeline autoplay

**Files:**
- Modify: `src/app/HistoryControls.tsx`
- Test: `src/app/HistoryControls.test.tsx`
- Modify: `src/app/App.tsx`
- Test: `src/app/App.test.tsx`
- Modify: `src/app/App.css`

**Interfaces:**
- `HistoryControls` consumes `playing: boolean` and `onTogglePlayback: () => void`.
- The Play button is disabled when history is empty or cursor equals total; Pause remains enabled while playing.
- `App` owns the timer and advances through existing `redo`/history cursor state every 700 ms.

- [ ] **Step 1: Write failing controls and playback tests**
  - In `HistoryControls.test.tsx`, add `shows Play when stopped and Pause when playing` and assert Play is disabled for empty history/end cursor.
  - In `App.test.tsx`, add `plays one timeline step every 700 milliseconds and stops at the end` using fake timers and assert no move at 699 ms, one move at 700 ms, and playback stops on the last entry.
  - Add `pauses autoplay on manual navigation or board edits` and assert no later timer changes the cursor or the edit branch.
  - Add `clears the playback timer when the app unmounts` and assert the fake timer queue is empty after unmount.
- [ ] **Step 2: Run focused tests and confirm the missing controls/playback fail**

Run: `npm run test -- --run src/app/HistoryControls.test.tsx src/app/App.test.tsx --maxWorkers=1`

Expected: failures identify missing playback control behavior, not test setup errors.
- [ ] **Step 3: Implement playback state and a cleaned-up 700 ms timeout in `App.tsx`**
- [ ] **Step 4: Add accessible Play/Pause control and disabled states in `HistoryControls.tsx`**
- [ ] **Step 5: Run focused tests, then full tests, build, and diff check**

Run: `npm run test -- --run src/app/HistoryControls.test.tsx src/app/App.test.tsx --maxWorkers=1`

Expected: focused tests pass.

Run: `npm run test -- --run --maxWorkers=1`

Expected: all tests pass.

Run: `npm run build`

Expected: TypeScript and Vite production build succeed.
- [ ] **Step 6: Commit the verified timeline playback change**

Commit message: `feat: add timeline play and pause`
