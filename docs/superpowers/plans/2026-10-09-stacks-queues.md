# Stacks and Queues Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add stack and queue board objects with reversible LIFO/FIFO operations.

**Architecture:** Share a strict container object model and operation engine. Kind determines removal end and renderer orientation; the UI uses the same model and history contracts.

**Tech Stack:** React, TypeScript, SVG, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-09-stacks-queues-design.md`

## Constraints

- Keep all state in BoardDocument and route changes through BoardOperation.
- Values are finite numbers or strings; maximum 20 entries per container.
- Empty removal leaves state unchanged and returns actionable error.
- Every successful push/remove has exact inverse.
- No runtime dependency.

## Review Focus

- Empty stack/queue: render clear labels and disable remove action.
- Duplicate values: remove correct end by index, not by value equality.
- Numeric zero and blank text: parse and preserve without truthiness loss.
- Full capacity: disable push and reject extra values.
- Undo after removal: restore exact order and value types.

### Task 1: Model, validation, operations

**Files:** `src/domain/model.ts`, `src/domain/objectRegistry.ts`, `src/domain/operations.ts` and tests.

- Add `container` object with kind and values.
- Add reversible `container/push`, `container/remove`, and `container/restore-values` operations.
- Test validation, capacity, LIFO/FIFO order, duplicate values, invalid removals, and undo/redo.

### Task 2: Render and toolbar creation

**Files:** toolbar, App creation, ObjectRenderer, new ContainerRenderer, CSS, tests.

- Add stack and queue tools; display vertical stack and horizontal queue with endpoint labels.
- Test accessible labels, empty state, create, move, duplicate, and persisted content.

### Task 3: Inspector actions

**Files:** BoardInspector, app tests.

- Add value input, Push/Enqueue, and Pop/Dequeue actions with capacity and empty-state disabling.
- Test numeric/text parsing, operation history, replay, and empty/full boundary behavior.

### Task 4: Docs and verification

- Update README.
- Run focused tests, full suite, build, and diff check.
- Commit as `feat: add stacks and queues`.
