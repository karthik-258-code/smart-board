# Board File Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Export and import validated Smart Board JSON files for local sharing.

**Architecture:** Reuse BoardDocument and validateBoard. Add pure serialization and parsing helpers, then connect accessible file controls to App's current snapshot and local persistence.

**Tech Stack:** React, TypeScript, browser File/Blob APIs, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-08-board-file-sharing-design.md`

## Constraints

- Keep file format identical to the versioned local BoardDocument.
- Validate before state or storage mutation.
- Imported snapshot starts fresh history.
- No runtime dependency, backend, or cloud service.

## Review Focus

- Malformed JSON, invalid schema, unsupported object types, duplicate IDs: show error and preserve current document and storage.
- Empty board file: import valid empty object list.
- Cancel replacement: preserve board.
- Storage unavailable or quota error: imported board remains available in session and save error is visible.
- File input same file twice: allow selecting same file after each import attempt.

### Task 1: Pure file format helpers

**Files:** Create `src/persistence/boardFile.ts` and `boardFile.test.ts`.

- Export stable pretty-printed JSON only after `validateBoard` succeeds.
- Parse JSON and return `Result<BoardDocument, BoardError>`; pass validation errors through.
- Test full object round trip, empty board, invalid JSON, unsupported version, malformed object, unknown field.

### Task 2: File controls and replacement flow

**Files:** Create `src/app/BoardFileControls.tsx`, modify `src/app/App.tsx`, `src/app/App.css`, and App tests.

- Add accessible export button and hidden `.json` file input behind Import board button.
- Confirm replacement; cancel must have no effect.
- On success validate first, replace history with imported initial document, clear selection/playback, preserve normal invalid-save recovery rules, save, and clear input value.
- Test export download, valid import, cancel, invalid file atomicity, local-storage reload, and error status.

### Task 3: Docs, verification, and commit

- Update README current features and scope limits.
- Run focused tests, full suite, production build, and `git diff --check`.
- Commit as `feat: import and export board files`.
