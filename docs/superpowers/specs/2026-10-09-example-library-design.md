# Example Library Design

**Status:** Approved by project owner’s standing instruction to continue autonomously  
**Date:** 2026-10-09

## Purpose

Help new users learn Smart Board by loading small, replayable algorithm explanations built from existing board primitives.

## Initial examples

- **Array traversal:** move an index pointer and highlight each visited value.
- **Binary search:** show interval, midpoint, comparisons, and narrowing.
- **Sliding window:** advance range bounds and highlights over a sample array.
- **Fibonacci DP:** fill table values and draw recurrence dependencies.

Each example has a title, short learning goal, initial BoardDocument, and deterministic operation sequence. `dispatchHistory` builds full reversible history; all steps use regular board operations. Examples can be edited, undone, replayed, saved, and exported like authored boards.

## User flow

Select an example and choose Load. If current board contains content, confirm replacement. Loading resets selection, playback, recovery preservation, and cursor to the start; it saves complete history locally. User can press Play or step through the explanation.

## Validation and limits

Every example history must pass `validateHistory`; invalid definitions are omitted with visible error rather than partially loaded. Initial library is local and static. No remote catalog, server, course system, or separate tutorial runtime.

## Acceptance

- All examples replay deterministically and validate.
- Loading an example with existing board content requires confirmation.
- Loaded example starts at step zero and persists full redo history.
- Users can edit, undo, redo, play, export, and reload examples normally.
