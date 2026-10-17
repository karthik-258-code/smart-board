# Share Links Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Share and open complete Smart Board timelines with compressed, validated URLs.

**Architecture:** Reuse `serializeBoardFile` and `parseBoardFile`. Add a bounded gzip/base64url codec, then connect it to accessible copy/link UI and guarded startup import.

**Tech Stack:** TypeScript, React, browser `CompressionStream`, `DecompressionStream`, Clipboard API, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-17-share-links-design.md`

## Global Constraints

- Keep board state changes inside validated `HistoryState` flows.
- Do not add backend or runtime package dependencies.
- Keep existing local saves and board-file behavior backward compatible.
- Cap compressed payload at 256 KiB and decompressed board data at 8 MiB.
- Confirm before replacing an existing local board.
- Report unsupported browser compression and invalid payloads clearly.

## Review Focus

- Malformed URL-safe base64 or truncated gzip returns a typed error without throwing.
- Decompression stops once the 8 MiB limit is exceeded.
- Rejected replacement leaves board and local storage unchanged.
- Clipboard failure still exposes a selectable URL.
- Valid shared history preserves event cursors and replay state after import.

---

### Task 1: Bounded share payload codec

**Files:**
- Create: `src/persistence/shareLink.ts`
- Test: `src/persistence/shareLink.test.ts`

**Interfaces:**
- `createBoardShareUrl(history: HistoryState, baseUrl: string): Promise<Result<string, ShareLinkError>>`
- `parseBoardShareFragment(fragment: string): Promise<Result<HistoryState, ShareLinkError>>`

- [x] Write tests for round-trip, malformed fragment, unavailable compression, payload limit, and decompression size limit.
- [x] Run codec tests and verify failures.
- [x] Implement validated serializer integration, gzip, base64url, and bounded decompression.
- [x] Run codec tests and build.

### Task 2: Share and copy controls

**Files:**
- Modify: `src/app/BoardFileControls.tsx`
- Modify: `src/app/App.css`
- Test: `src/app/BoardFileControls.test.tsx`

**Interfaces:**
- `BoardFileControls` receives current history and existing error callback.
- Share UI calls `createBoardShareUrl`, attempts clipboard write, and always shows a selectable link after success.

- [x] Test link creation, successful copy, clipboard rejection, and codec errors.
- [x] Run component tests and verify failures.
- [x] Add accessible share button, link input, and status text.
- [x] Run component tests and build.

### Task 3: Guarded share-link import

**Files:**
- Modify: `src/app/App.tsx`
- Modify: `src/app/App.test.tsx`

- [x] Test accept, decline, invalid link, and URL cleanup.
- [x] Run app tests and verify failures.
- [x] Parse fragment on startup; confirm replacement; import and persist validated history only after acceptance.
- [ ] Run app tests, full suite, build, lint, and `git diff --check`.
- [x] Commit and push the completed milestone.

**Verification:** `npx vitest run --pool=forks --maxWorkers=1 --isolate=false`, `npm run build`, `npm run lint`, and `git diff --check`.
