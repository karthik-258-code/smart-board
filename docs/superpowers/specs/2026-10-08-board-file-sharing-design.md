# Board File Sharing Design

**Status:** Approved by project owner’s standing instruction to continue autonomously  
**Date:** 2026-10-08

## Purpose

Let people carry Smart Board explanations between devices and share them as ordinary files, while keeping local-first use and version validation.

## User flow

- Export current board as a readable `.smart-board.json` download.
- Import a previously exported JSON board.
- Validate the entire document before changing current state.
- Warn before replacing the current board; cancel leaves it untouched.
- Save successful imports locally and begin a fresh timeline for the imported snapshot.

## Design

Use the canonical versioned `BoardDocument` JSON format already used by local storage. A persistence utility serializes and parses through `validateBoard`; malformed JSON and invalid documents return typed errors. UI downloads with a temporary object URL and imports through a hidden file input. An accessible confirmation dialog guards replacement. Successful import becomes the new initial history snapshot, clears selection and playback, and updates local storage. Invalid input never changes board or storage.

## Acceptance

- Export/import round trip preserves all supported object types and positions.
- Invalid JSON, unsupported versions, malformed objects, and duplicate IDs keep current board and saved data unchanged.
- Canceling replacement preserves current board; accepting replacement loads and saves the imported board.
- Export and import controls have accessible labels and keyboard operation.
- No server or runtime dependency is required.

## Limits

This shares a file manually. It does not add cloud links, collaborative editing, or automatic conflict resolution.
