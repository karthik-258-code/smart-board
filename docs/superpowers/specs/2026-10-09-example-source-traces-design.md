# Example Source Traces Design

## Goal
Show how each replayable example's board history relates to source code.

## Scope
Each built-in example gets a short TypeScript snippet and an operation-to-source-line mapping. The current history cursor selects the source line associated with the most recently applied example operation. Cursor zero has no active line. A cursor beyond the known mapping (for example, after a new manual edit) shows that the operation is not mapped. This is an explanatory trace only; the source is not executed.

## UI
Render an accessible source panel with line numbers, language label, and a visible current-line marker. It follows undo, redo, playback, and imported example histories identified by their initial document IDs. Unknown documents show no source panel.

## Verification
Check every mapping points to a valid source line, every catalog example has a trace, the panel follows timeline movement, and non-example boards do not show stale source.
