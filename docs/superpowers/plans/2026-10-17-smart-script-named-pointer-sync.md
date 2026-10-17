# Smart Script Named Pointer Sync Implementation Plan

> **For agentic workers:** Executed autonomously under the user's project-wide instruction.

**Goal:** Synchronize array pointers named after script variables during supported traversal steps.

**Architecture:** Keep mapping inside the constrained Smart Script interpreter. `highlight(variableName);` selects a cell and emits an ordinary reversible pointer operation when a pointer with that name targets the selected array.

**Tech Stack:** TypeScript, React, Vitest.

**Spec:** `docs/superpowers/specs/2026-10-17-smart-script-named-pointer-sync-design.md`

## Global Constraints
- Do not evaluate source as JavaScript.
- Route board changes through validated, reversible operations.
- Preserve bounded execution and deterministic snapshots.

## Review Focus
- Duplicate named pointers return `ambiguous_mapping`.
- Negative, fractional, and one-past-end highlight values return line-specific errors.
- Non-array targets retain their existing behavior.
- Pointer operations preserve source line and variable snapshot.

### Task 1: Interpreter mapping

**Files:**
- Modify: `src/execution/smartScript.ts`
- Test: `src/execution/smartScript.test.ts`

**Interfaces:**
- Consumes parsed numeric variables and selected array object.
- Produces reversible pointer moves for explicitly highlighted matching names.

- [x] Write failing test for two named pointers and run it to confirm `highlight(left)` is accepted but fails to move named pointers.
- [x] Implement named-index highlighting and route pointer moves through normal reversible operations.
- [x] Verify named pointer sync, unrelated accumulators, invalid indices, and duplicate mappings with focused tests.
- [x] Run focused interpreter tests (39 passed).
- [x] Run full suite (248 passing), production build, lint, and `git diff --check`.
- [x] Commit and push the milestone.
