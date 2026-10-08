# Freehand Drawing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add freehand strokes as movable, reversible, persistent board objects.

**Architecture:** Model strokes as validated objects whose points are local to an origin. BoardCanvas captures background pointer gestures only in Draw mode and emits one object/add operation at completion.

**Tech Stack:** React pointer events, TypeScript, SVG, Vitest, Testing Library.

**Spec:** `docs/superpowers/specs/2026-10-08-freehand-drawing-design.md`

## Constraints

- Keep stroke data in canonical BoardDocument; do not introduce a separate drawing store.
- Validate finite coordinates, minimum two points, and fixed color tokens.
- Emit exactly one operation per completed stroke.
- Preserve normal object drag and selection when pointer begins on an object.
- Add no runtime dependency.

## Review Focus

- Click or one-point gesture: do not add an invisible stroke.
- Responsive canvas scaling: client coordinates map into 1200×720 board viewBox.
- Pointer cancellation or capture loss: discard unfinished gesture.
- Invalid stored point or color: reject whole document and preserve saved bytes.
- Repeated fast gestures: each stroke has unique ID and undo step.

### Task 1: Stroke model and operation tests

**Files:** `src/domain/model.ts`, `src/domain/objectRegistry.ts`, tests.

- Add `StrokeObject` with `points: BoardPosition[]` local to `position` and `color: 'ink'`.
- Validate at least two finite points and only allowed fields.
- Test valid stroke, invalid point, one-point path, invalid color, round trip through document validation.

### Task 2: Renderer and toolbar mode

**Files:** new stroke renderer, `ObjectRenderer.tsx`, `BoardToolbar.tsx`, CSS, tests.

- Add Draw mode toggle with `aria-pressed`.
- Render stroke as a non-filled SVG path with rounded joins/caps and accessible object label.
- Test renderer path, label, selection, and active mode.

### Task 3: Canvas gesture and app integration

**Files:** `BoardCanvas.tsx`, `App.tsx`, app/canvas tests.

- Capture background pointerdown/move/up in viewBox coordinates; normalize points relative to first point.
- Discard gesture with fewer than two distinct points or on pointer cancel.
- Emit one stroke object/add operation and use existing history/persistence.
- Test coordinates under scaled canvas, one-operation undo/redo, cancellation, and object drags in Draw mode.

### Task 4: Docs and verification

- Update README implemented features and limits.
- Run focused tests, full suite, build, and diff check.
- Commit as `feat: add freehand board drawing`.
