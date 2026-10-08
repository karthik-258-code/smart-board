# DP Table Design

**Status:** Approved by project owner’s standing instruction to continue autonomously  
**Date:** 2026-10-08

## Purpose

Add a reusable dynamic-programming table primitive to Smart Board. Learners should see how cells are filled and which earlier cells support a result, while keeping each change editable, reversible, and saveable.

## User flow

1. Add a 3×3 empty DP table from the board toolbar.
2. Select a cell, enter a number or label, and see the value in the grid.
3. Highlight one or more cells to show the current computation.
4. Add dependency arrows between cells to show recurrence inputs.
5. Undo, redo, step, save, and reopen the explanation with table state intact.

## Data model

Add a versioned `table` board object with stable ID, board position, dimensions, row and column labels, nullable string-or-number cells, highlighted cell coordinates, and directed dependency edges. Coordinates use zero-based row and column indices. Every cell and edge endpoint must be in bounds. Table dimensions are fixed at creation for this first slice; resizing can follow after core interactions are proven.

## Operations and behavior

All table changes use validated named operations. Cell assignment and highlight changes are reversible. Adding or removing dependencies is reversible. Invalid coordinates or duplicate dependencies must leave the board unchanged and surface the normal operation error. Document validation rejects malformed tables and unsupported object types without discarding saved data.

The renderer presents a readable grid with row/column labels, values, highlight state, and arrows. The inspector edits the selected cell and exposes dependency controls. Board add, move, duplicate, remove, selection, local persistence, and timeline replay use existing generic object flows.

## Acceptance checks

- Add an empty table; edit cells; add/remove dependencies; undo and redo every change.
- Reject out-of-bounds cells and edge endpoints without changing board state.
- Save and reopen a table with values, labels, highlights, position, and dependencies intact.
- Render accessible table semantics and meaningful names for cells and dependency controls.
- Existing board objects and operations retain behavior.

## Scope limits

No dynamic resizing, computed formulas, matrix multiplication, custom row/column counts, or code synchronization in this slice. Dependency arrows are explanatory links, not automatic computation.
