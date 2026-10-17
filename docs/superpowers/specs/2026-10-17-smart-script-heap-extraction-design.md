# Smart Script Heap Extraction Design

## Goal

Connect the existing min/max heap object to Smart Script with a replayable extraction trace.

## Design

Add a single exact template that repeatedly extracts the heap top until empty. The interpreter reads the current root value, applies existing reversible `heap/extract-top` operations through history, and emits one event per extraction with `extractedValue`, remaining `heapSize`, source line, and inspected root value. Min heaps produce ascending extraction order; max heaps produce descending order. Empty heaps produce no events. Source is validated against the fixed template and never evaluated.

Expose heaps as Smart Script targets with a heap-specific template button and mode/help label. Extend saved execution validation to recognize heap targets and inspection values so full traces survive reload and file round trips.

## Validation

- Tests cover min/max extraction order and variable snapshots.
- Undo/redo restores both heap values and extraction history.
- Empty heaps complete with no events; edited templates are rejected.
- App tests cover target selection and saved trace restoration.
