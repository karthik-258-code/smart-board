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
- [ ] Add code snippets and cursor-to-line resolver with tests.

### Task 2: Panel and integration
- [ ] Add accessible source panel tied to current history cursor.
- [ ] Test mapping behavior, undo/redo, and example replacement.

### Task 3: Verification
- [ ] Update README and completion record.
- [ ] Run full suite, build, diff check, and commit.
