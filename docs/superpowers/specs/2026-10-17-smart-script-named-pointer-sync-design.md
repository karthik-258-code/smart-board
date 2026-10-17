# Smart Script Named Pointer Sync Design

## Goal

Let array traversal scripts drive multiple named board pointers from declared numeric variables, so common `left`/`right` and similar algorithm roles stay visible on the board.

## Design

During array traversal, allow `highlight(variableName);` when the name refers to the loop index or a declared numeric script variable. The expression value selects the highlighted array index. A declared variable also moves its matching named pointer on that statement. Preserve the existing loop-index pointer behavior. Non-highlighted numeric variables do not move pointers. Duplicate pointer names for the highlighted variable fail with `ambiguous_mapping` before a run is returned. Container and linked-list execution remain unchanged.

Each pointer operation gets the statement's source line and a copy of that statement's variable snapshot. The normal dispatcher validates and records operations, so undo, redo, persistence, and script trace behavior remain consistent. Highlight indices must be finite integer indices within the selected structure; invalid values produce a line-specific error without returning partial history.

## Validation

- Tests prove multiple named pointers follow their variables when highlighted.
- Tests prove unrelated numeric accumulators do not move pointers.
- Tests prove duplicate mappings and invalid indices fail cleanly.
- Existing loop-index pointer, container, and linked-list tests remain unchanged and pass.
- Full tests, build, lint, and diff check pass.
