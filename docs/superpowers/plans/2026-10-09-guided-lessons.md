# Guided Lessons Implementation Plan

> **For agentic workers:** Executed autonomously under the user's project-wide instruction.

**Goal:** Add ordered, objective-driven lessons built from existing replayable examples.

**Architecture:** Keep lesson metadata separate from board state; load lesson steps using the existing example history flow.

**Tech Stack:** TypeScript, React, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-guided-lessons-design.md`

## Global Constraints
- Reuse existing examples and confirmation flow.
- Lesson selection is transient and does not overwrite the saved board.
- No dependencies.

## Review Focus
- Missing example references are caught by catalog tests.
- First/last step controls disable correctly.
- Cancelled example replacement preserves selected lesson step and board.

### Task 1: Lesson metadata
- [ ] Add three ordered lessons and catalog validation tests.

### Task 2: Lesson panel
- [ ] Add accessible picker, objective, navigation, and load action.
- [ ] Test graph lesson loading and navigation.

### Task 3: Verification
- [ ] Update README and completion record.
- [ ] Run full suite, build, diff check, and commit.
