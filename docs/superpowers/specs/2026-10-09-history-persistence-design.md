# History Persistence Design

**Status:** Approved by project owner’s standing instruction to continue autonomously  
**Date:** 2026-10-09

## Purpose

Preserve authored explanations, not only their current visual state. Local saves and shared board files should retain initial state, operations, inverse operations, and timeline cursor.

## Data format

Store a versioned `HistoryState` envelope containing `initialDocument`, operation/inverse entries, and cursor. Continue reading existing version 1 BoardDocument values by wrapping them as empty history at cursor zero. Export new envelopes; import both legacy documents and history envelopes.

## Validation

Validate every document and cursor. Replay every operation, including redo branch, from initial document. Confirm each stored inverse matches the inverse produced by deterministic application. Reject unknown fields, unknown operations, malformed operations, and invalid branches without changing saved bytes or current state.

## Behavior

Every operation, undo, redo, step, restart, and autoplay cursor change saves complete HistoryState. Successful file import restores the full history and cursor; legacy board import starts with empty history. Invalid storage remains preserved through existing recovery controls. No cloud sync is added.

## Acceptance

- Local reload restores cursor, undo/redo, step navigation, and playback.
- File export/import restores the full timeline and redo branch.
- Legacy version 1 boards still load and export as new history envelopes.
- Tampered cursor, operations, inverses, or branch leave app and storage unchanged.
- Deterministic replay yields same document at every cursor.
