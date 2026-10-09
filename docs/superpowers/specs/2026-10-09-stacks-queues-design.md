# Stacks and Queues Design

**Status:** Approved by project owner’s standing instruction to continue autonomously  
**Date:** 2026-10-09

## Purpose

Add stack and queue primitives for explaining LIFO and FIFO behavior with visible, reversible state changes.

## User flow

- Add a stack or queue to the board.
- Select it, enter a value, and push or enqueue.
- Pop from stack top or dequeue from queue front.
- Inspect each operation in history; undo, redo, play, save, export, and restore normally.

## Model and behavior

Represent both as a versioned `container` board object with `kind: stack | queue` and ordered string-or-number values. The first value is bottom/oldest. Push/enqueue append. Stack pop removes last; queue dequeue removes first. Empty removals are disabled in UI and rejected by the operation engine. Operations return complete prior value state as inverse, preserving duplicate values and order.

Render stack vertically with top marked; render queue horizontally with front/back marked. Inspector provides push input and one kind-specific removal action. Generic object placement, drag, duplicate, remove, persistence, and file sharing continue to work.

## Acceptance

- Empty stack and queue render clearly.
- Push/pop obey LIFO; enqueue/dequeue obey FIFO.
- Every operation is reversible and invalid empty removal is atomic.
- Values and kind survive save, reload, import, and export.
- Accessible labels identify object kind, values, and front/top controls.

## Limits

No bounded capacity, priority queue, linked nodes, or asynchronous producer/consumer behavior in this slice.
