# Example Source Traces Implementation Plan

> **For agentic workers:** Executed autonomously under the user's project-wide instruction.

**Goal:** Map built-in example history steps to highlighted TypeScript source lines.

**Architecture:** Keep source snippets and cursor mappings as static metadata keyed by example board ID. Derive the current line directly from HistoryState.cursor and render a read-only code panel.

**Tech Stack:** TypeScript, React, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-example-source-traces-design.md`

## Global Constraints
- Never execute code from the panel.
- Unknown or unmapped operations show no active line.
- No storage schema changes or dependencies.

## Review Focus
- Every example has a mapping with in-range line numbers.
- Cursor zero and cursor beyond mapping show no current line.
- Undo/redo updates the highlighted source line.
- Loading an unrelated board removes the panel.

### Task 1: Trace catalog
- [x] Add code snippets and cursor-to-line resolver with tests.

### Task 2: Panel and integration
- [x] Add accessible source panel tied to current history cursor.
- [x] Test mapping behavior, undo/redo, and example replacement.

### Task 3: Verification
- [x] Update README and completion record.
- [ ] Run full suite, build, diff check, and commit.

## Completion record

- Added TypeScript source and per-operation line mappings for all six built-in examples.
- Added an accessible source panel that follows timeline cursor changes, undo/redo, lesson loads, and saved example histories.
- Validates the applied operation prefix before showing a mapping; manual branches do not display stale source highlights.
- Source snippets are read-only and are not executed.
- Verification: full suite passed (167 tests across 21 files), production build passed, and `git diff --check` passed.

- [x] Run full suite, build, diff check, and commit.
