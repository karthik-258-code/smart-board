# Practice Checkpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add portable prediction checkpoint objects and a simple learner practice flow.

**Architecture:** Store authored prompt/answer/hint in the canonical board object. Render and edit through existing object modules. Keep attempt, feedback, and reveal state inside a transient modal.

**Tech Stack:** React, TypeScript, SVG, native dialog semantics, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-08-practice-checkpoints-design.md`

## Constraints

- Preserve strict object validation and operation-driven edits.
- Learner response state is transient and never enters BoardDocument.
- Exact answer comparison trims and folds case only.
- Keep no answer visible in practice until learner checks or reveals it.
- Add no runtime dependencies.

## Review Focus

- Blank answer: allow prompt practice but never mark empty input correct.
- Blank hint: hide hint control.
- Whitespace and case: ignore both for correctness; punctuation remains significant.
- Cancel or close dialog: discard response and reveal state.
- Imported checkpoint: generic file validator preserves all authored fields.

### Task 1: Checkpoint model and operation

**Files:** `src/domain/model.ts`, `src/domain/objectRegistry.ts`, `src/domain/operations.ts`, tests.

- Add `checkpoint` object with `prompt`, `answer`, `hint` fields.
- Validate all fields as strings; add reversible `checkpoint/update` operation.
- Test validation, update/undo, invalid fields, and object lifecycle.

### Task 2: Authoring and board rendering

**Files:** `src/app/BoardToolbar.tsx`, `src/app/App.tsx`, `src/app/BoardInspector.tsx`, new renderer, CSS, tests.

- Add checkpoint toolbar action and accessible board-card renderer.
- Inspector edits prompt, expected answer, and hint through one reversible operation.
- Test add/edit/undo/save/restore and file export round trip.

### Task 3: Learner practice dialog

**Files:** new practice dialog component, `src/app/App.tsx`, CSS, tests.

- Add Practice button for selected checkpoint.
- Support answer submission, case/whitespace-insensitive exact match, optional hint, answer reveal, close/reset.
- Test correct, incorrect, blank input, hint/reveal, close reset, and no board mutation.

### Task 4: Docs and verification

- Update README current features and Phase 4 remainder.
- Run focused tests, full suite, build, and diff check.
- Commit as `feat: add practice checkpoints`.
