# History Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Save and share complete, validated timeline history while reading legacy board snapshots.

**Architecture:** Add a canonical history validator that replays every entry and checks stored inverses. Use a versioned envelope in local storage and board files; convert legacy BoardDocuments into empty history states.

**Tech Stack:** TypeScript, browser storage/File APIs, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-history-persistence-design.md`

## Constraints

- Apply operations through existing deterministic state engine.
- Validate every branch entry and inverse before accepting data.
- Preserve old BoardDocument storage/file format as read-only compatibility.
- Do not alter BoardDocument schema version 1.
- Do not add dependencies.

## Review Focus

- Cursor before, at, or after history bounds: accept only integer in `[0, entries.length]`.
- Invalid future redo entry: reject whole history even when current cursor precedes it.
- Wrong inverse or unknown operation field: reject history.
- Legacy board snapshot: load as empty history, keep document values/IDs.
- Storage write failure: keep in-memory history and show existing error state.

### Task 1: History validation

**Files:** `src/domain/history.ts`, `history.test.ts`.

- Add `validateHistory(unknown): Result<HistoryState, HistoryError>`.
- Strictly check envelope/entry keys, supported operation fields, cursor, replay, inverse equality, and branch validity.
- Test valid branches, malformed ops, stale inverse, invalid cursor, unknown fields, and divergent redo branch.

### Task 2: Local storage migration

**Files:** `src/persistence/localBoardStore.ts`, store tests, `src/app/App.tsx`.

- Add history load/save helpers using versioned envelope; continue loading legacy BoardDocument.
- Save complete history on edits and cursor movement.
- Test legacy migration, undo cursor reload, invalid-history byte preservation, and storage failure.

### Task 3: Board-file history

**Files:** `src/persistence/boardFile.ts`, tests, `BoardFileControls.tsx`, `App.tsx`, app tests.

- Export HistoryState envelope; parse both envelope and legacy BoardDocument.
- Import full cursor/redo state or wrap legacy document; preserve replacement confirmation.
- Test full round trip, legacy import, and tampered history rejection.

### Task 4: Docs, verification, commit

- Update README to describe timeline persistence and legacy compatibility.
- Run focused tests, full suite, build, and diff check.
- Commit as `feat: persist board history`.

## Completion record

- Added strict timeline replay validation, local storage envelopes with legacy snapshot loading, and board files that preserve full history.
- Verified reload restores undo/redo cursor; imported legacy files start at step zero; imported timeline files retain redo branches.
- Full suite passed (109 tests); production build succeeded; `git diff --check` passed.
