# Practice Checkpoint Design

**Status:** Approved by project owner’s standing instruction to continue autonomously  
**Date:** 2026-10-08

## Purpose

Turn a board into a lightweight learning activity. Authors can place prediction prompts beside visual state; learners can answer, check, use a hint, and reveal the expected answer.

## User flow

1. Add a checkpoint object to the board.
2. Set prompt, expected answer, and optional hint in inspector.
3. Learner opens Practice on that checkpoint.
4. Learner enters a prediction and checks it; feedback is case/whitespace insensitive.
5. Learner can reveal hint or answer, then close and return to the board.

## Data and boundaries

Checkpoint is a versioned BoardObject with prompt, answer, and hint strings. The object follows generic placement, drag, duplicate, remove, undo, persistence, and board-file flows. Practice attempt state is transient and never saved. Correctness checks only exact normalized text; no semantic grading or learner analytics.

## Acceptance

- Empty and configured checkpoint documents validate; malformed fields reject atomically.
- Author edits are reversible and survive reload, import, and export.
- Practice dialog is keyboard accessible and gives correct/incorrect feedback.
- Hint and answer reveal controls work without exposing answer before requested.
- Board state and checkpoint content remain unchanged by learner attempts.

## Limits

No lesson sequencing, LMS, accounts, analytics, automated language model grading, or answer synchronization to code execution in this slice.
