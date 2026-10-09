# Hash Table Implementation Plan

> **For agentic workers:** Executed autonomously under the user's project-wide instruction.

**Goal:** Add an editable hash table with visible collisions and reversible key/value operations.

**Architecture:** Store unique entries and bucket count; derive bucket indices deterministically from keys. Route writes through exact-state reversible operations.

**Tech Stack:** TypeScript, React, SVG, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-hash-table-design.md`

## Global Constraints
- Preserve schema version 1.
- All edits are undoable and saved in existing history.
- No runtime dependencies.

## Review Focus
- Reject duplicate/blank keys in persisted objects, invalid bucket counts, and non-finite values.
- Updating existing key preserves one entry and returns exact prior state on undo.
- Collision bucket order remains deterministic.
- Empty buckets and empty tables render accessibly.

### Task 1: Domain
- [ ] Write failing model, hash function, and operation tests.
- [ ] Add strict validation, deterministic bucket hashing, and reversible set/remove.
- [ ] Add history field schemas and verify replay.

### Task 2: UI
- [ ] Add toolbar, SVG buckets, and key/value controls.
- [ ] Test collisions, updating, removal, persistence, undo/redo.

### Task 3: Verification
- [ ] Update README and completion record.
- [ ] Run full suite, build, diff check, and commit.
