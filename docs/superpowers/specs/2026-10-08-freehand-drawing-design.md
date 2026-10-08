# Freehand Drawing Design

**Status:** Approved by project owner’s standing instruction to continue autonomously  
**Date:** 2026-10-08

## Purpose

Add a pen workflow so people can explain ideas with sketches alongside structured board objects.

## User flow

- Toggle Draw mode from board tools.
- Draw strokes on blank canvas with mouse, pen, or touch.
- Leave Draw mode to select, drag, duplicate, or remove strokes like other objects.
- Undo and redo each completed stroke as one timeline operation.
- Save, reopen, import, and export strokes as part of the board document.

## Model and interaction

Add a strict `stroke` object containing an origin position and a non-empty sequence of finite local points, plus a stable stroke color token. Capture points in viewBox coordinates. Ignore clicks and strokes shorter than two points. Each completed gesture adds one object through the existing operation engine. Rendering uses SVG paths; object moves translate the stroke as a group. Draw mode only begins on the empty canvas so object gestures remain available.

## Acceptance

- Pointer movement creates a smooth visible stroke in board coordinates.
- Completed stroke is one undoable operation; undo/redo and persistence retain exact points.
- Draw mode is keyboard accessible and has visible active state.
- Existing object drag, selection, and file formats continue working.
- Invalid points/colors fail document validation and cannot partially update state.

## Limits

No eraser, pressure sensitivity, brushes, layers, or collaborative cursors in this slice. Users can remove a selected stroke with the existing Remove action.
