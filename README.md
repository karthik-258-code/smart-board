# Smart Board

**An interactive visual workspace for explaining competitive programming, algorithms, data structures, and code execution.**

Smart Board is envisioned as a teaching and presentation environment where an explanation can be built from data structures, pointers, ranges, annotations, and execution state. Instead of drawing a new diagram for every algorithm, users compose reusable visual primitives and connect them to code when useful.

> **Project status:** The first manual board milestone is implemented. Current features and verified run commands are listed below; remaining vision and roadmap sections describe future work.

## Run locally

Requirements: Node.js and npm.

```sh
npm install
npm run dev
```

Run the test suite and production build with:

```sh
npm run test -- --run
npm run build
```

## Implemented first milestone

The current app supports a manually authored board with:

- Notes, rectangles, arrays, and empty arrays that can be added, selected, dragged, duplicated, and removed.
- Editable arrays with indexed insertion and removal, assignment, comparison, swapping, and highlights. Comparisons, swaps, and assignments are reversible timeline steps; pointer and range positions stay valid as arrays change.
- Named pointers and half-open ranges with target-array validation.
- Reversible operations with undo, redo, step back, step forward, and restart controls.
- Local browser saving and restore. Invalid saved data stays untouched until the user chooses to start a new board.
- Light and dark themes, with accessible names and visible selection states.

This milestone does **not** run code or synchronize runtime variables. Freehand drawing, collaboration, and external sharing are also future work.

## Project description

Smart Board aims to make it easier to explain what an algorithm is doing at each step. A presenter can create a visual workspace, add an array or graph, place named pointers, highlight a range, and annotate relationships. The same primitives can illustrate ordinary traversal, two pointers, sliding windows, binary search, dynamic programming, graph search, and many other techniques.

Explanations should work in two ways:

- **Manual explanation:** Build and manipulate a visualization directly, without writing or running code.
- **Code-connected explanation:** Connect a program to the board so execution state and visual state can be inspected together.

The board is intended for live teaching, peer discussion, interview preparation, and creating clear explanations of competitive-programming solutions.

## Product goals

- Make algorithm state visible and understandable, one step at a time.
- Let users explain many algorithms with a small set of general-purpose visual tools.
- Keep manual teaching useful even when code execution is unavailable or unnecessary.
- Connect code, variables, data structures, and visual changes in a coherent workspace.
- Support clear explanations for beginners while remaining flexible enough for advanced competitive-programming topics.
- Preserve the freedom of a whiteboard: users should be able to annotate, arrange, and explain ideas in their own way.

## Modes of use

These modes describe the intended interaction model. They are conceptual product modes, not implemented features.

### Drawing mode

A freeform canvas for explaining ideas with familiar whiteboard tools:

- Freehand strokes, text, shapes, connectors, and arrows
- Highlights, labels, and annotations
- Direct placement and arrangement of visual objects
- A persistent canvas that supports informal explanation as well as structured diagrams

Drawing should remain available alongside structured objects so users are not forced to model every thought as data.

### Interactive mode

A structured workspace for creating and manipulating data and algorithm state:

- Create data structures and edit their values
- Add named pointers and move them between valid positions
- Select ranges and windows over indexed data
- Highlight values, cells, nodes, edges, or regions
- Apply operations and inspect how the visual state changes
- Mix structured objects with freeform notes and drawings

### Execution mode

A code-connected workspace for stepping through a program and relating its execution to the board:

- Run, pause, continue, restart, step forward, and step backward
- Inspect a timeline of execution states and return to earlier steps
- Highlight the current source line
- Inspect variable values and relevant data-structure state
- Synchronize supported code events with board objects and visual changes

The long-term goal is to make the connection between code and visualization explicit and inspectable. Code synchronization will depend on language and runtime support; it should not be assumed to work for every program or language.

## Visual primitives

The central design principle is **reusable primitives rather than a separate hardcoded visualizer for every algorithm**. A primitive represents a useful piece of state or an operation. Algorithms are explanations composed from those pieces.

### Data structures

Planned visual objects include:

- Arrays and vectors
- Strings
- Matrices and grids
- Dynamic-programming tables
- Linked lists
- Stacks and queues
- Trees and binary search trees (BSTs)
- Heaps
- Graphs
- Tries
- Hash tables

Each object should expose relevant structure. For example, an array has indexed cells, a graph has vertices and edges, and a DP table has row and column coordinates.

### Named pointers and indices

Users should be able to create arbitrary named pointers instead of choosing from a fixed set of algorithm-specific controls. Examples include `i`, `j`, `l`, `r`, `slow`, `fast`, `mid`, `prev`, and `curr`, as well as custom names.

A pointer can be moved manually or updated by an operation. On indexed data, it should make its current position and referenced value clear. The same pointer concept should be reusable across traversal, searching, linked-list reasoning, and other explanations.

### Ranges and windows

A range represents a selected region of indexed data, commonly with inclusive or exclusive endpoints chosen explicitly. A window is a range that can be expanded, shrunk, or shifted as an explanation progresses.

Where the underlying values permit it, the board could display derived information such as range length, sum, minimum, or maximum. The chosen endpoint convention and any derived values should remain visible so the visualization does not hide important assumptions.

### Operations and visual state

Planned operations include:

- Move a pointer forward or backward, or assign it a position
- Swap two indexed values
- Compare values or pointers
- Highlight an index, cell, node, edge, or range
- Set a value at an index or cell
- Expand, shrink, or move a range
- Add or remove graph and tree elements
- Connect related cells or objects with dependency arrows

Operations should produce understandable state changes that can be shown manually or, where supported, synchronized with program execution.

## What the primitives can explain

The examples below illustrate how general-purpose tools could compose into familiar topics. They are demonstrations of the product concept, not a list of implemented visualizers.

### Array traversal

Create an array, add a pointer named `i`, and advance it one index at a time. Highlight the current cell and optionally show the current index and value. This models a loop such as `for (i = 0; i < n; i++)` without requiring an algorithm-specific traversal widget.

### Two pointers

Place `l` and `r` at opposite ends of an array. Move either or both pointers, compare their referenced values, and highlight the active interval. The same setup can illustrate inward-moving pointers, partition boundaries, or other two-index techniques.

### Sliding window

Create a range bounded by `l` and `r`. Expand or shrink the range as the explanation proceeds, and display its elements and optional summary values such as size or sum. This makes the current window and its boundaries visible together.

### Binary search

Place `l` and `r` around the current search interval and add `mid`. Highlight the midpoint, compare its value with a target, then update a boundary. Repeating these operations explains how the candidate interval narrows.

### Sorting and partitioning

Use index pointers and operations such as compare, swap, and highlight to show how elements move. For a partitioning explanation, the user can add pointers for the scan position and boundary, then update them as values are classified.

### Prefix and suffix techniques

Represent prefix and suffix regions as ranges or highlights over an array. Add pointers for their boundaries and annotate computed values. This can show how regions relate to individual indices and to each other.

### Dynamic programming

Create a DP table with labeled row and column indices. Highlight the cell currently being computed, highlight the cells it depends on, and draw dependency arrows between them. Values can be filled in step by step so the order of computation and recurrence relationships are visible.

### Graphs and trees

Add or move vertices, connect or remove edges, and label nodes with values or state. Highlight the active node, frontier, path, or visited set. Tree layouts can support parent-child relationships and operations; graph layouts can support the topology and traversal state needed for an explanation.

## Code and visualization synchronization

A code-connected explanation should help answer: **What is the program doing right now, and how does that change the problem state?**

The intended execution panel includes:

- A source view with the current line highlighted
- Run and pause controls
- Step forward and step backward controls
- Restart and timeline navigation
- A current snapshot of variables and selected data structures
- Visual updates associated with relevant code events

A useful design will need a clear mapping between program state and board objects. Users should be able to understand which variable or operation controls a pointer, cell, range, node, or edge. Unsupported or ambiguous mappings should remain visible rather than silently producing misleading visuals.

## Example workflow

A typical explanation might follow these steps:

1. Create an array and enter its values.
2. Add pointers `l`, `r`, and `mid`.
3. Mark the active search interval as a range.
4. Highlight and compare the midpoint value.
5. Move a boundary and update the highlighted interval.
6. Add a short annotation explaining the decision.
7. Optionally connect the visualization to code and step through the corresponding execution.
8. Rewind or restart to review the explanation from the beginning.

The same approach should work without step 7: manual mode is a complete way to construct and present an explanation.

## Conceptual architecture

The following modules describe a possible separation of responsibilities. They are architectural concepts, not a statement about the current codebase or a chosen technology stack.

| Module | Responsibility |
| --- | --- |
| **Board and workspace** | Own the canvas, viewport, object placement, selection, and board-level interaction. |
| **Visual primitives** | Define reusable objects such as arrays, pointers, ranges, tables, nodes, edges, and annotations. |
| **State and operations** | Represent board state and apply operations in a consistent, inspectable way. |
| **Rendering and themes** | Render the board and interface in light or dark mode while preserving clear visual hierarchy. |
| **Execution controller** | Coordinate run, pause, stepping, restart, and timeline navigation. |
| **Code adapter** | Translate supported runtime events into source-line, variable, and data-state updates. |
| **Presentation controls** | Provide controls and state summaries appropriate for teaching and demonstration. |
| **Persistence and sharing** | A future capability for saving, reopening, and sharing board documents. |

A key architectural goal is to keep algorithm explanations composable. A two-pointer example should use arrays, pointers, comparisons, ranges, and highlights; it should not require those primitives to be implemented only inside a dedicated two-pointer visualizer.

## Visual design and themes

The board and surrounding interface should follow the selected theme consistently:

- **Light mode:** a white board background with a light interface.
- **Dark mode:** a near-black board background with a dark interface.

Both themes should preserve readable text, visible selection and pointer states, and sufficient contrast between data, annotations, highlights, and background. Color should communicate state consistently and should not be the only way to distinguish important information.

## UX principles

- **Explain state clearly:** Show the values, indices, boundaries, and relationships relevant to the current step.
- **Keep manual control:** A presenter should be able to make and explain changes without writing code.
- **Prefer composition:** Build algorithm explanations from reusable objects and operations.
- **Make execution reversible:** Stepping backward and revisiting earlier states should be part of the intended teaching workflow.
- **Keep code and visuals connected:** When synchronization is available, make the relationship between a code event and its visual effect understandable.
- **Support freeform explanation:** Structured objects should coexist with drawing, text, and annotations.
- **Use consistent visual language:** Pointer, range, selection, comparison, and execution states should behave consistently across data types.
- **Make the canvas readable:** Board controls and visual objects should support clear presentation in both themes.

## Planned feature areas

The product vision includes the following areas, which should be developed incrementally:

1. **Board essentials:** Canvas interaction, text and drawing, selection, object placement, and theme support.
2. **Indexed data:** Arrays, strings, matrices, editable cells, named pointers, ranges, and basic operations.
3. **Step-based explanations:** A consistent operation model with inspectable state and forward/backward navigation.
4. **Additional structures:** DP tables, lists, stacks, queues, trees, heaps, graphs, tries, and hash tables.
5. **Code connection:** Current-line highlighting, variable inspection, and synchronization for a clearly defined subset of code execution.
6. **Teaching and sharing:** Save and reopen explanations, prepare reusable examples, and share board documents.

## Roadmap

This roadmap is a proposed sequence, not a delivery commitment.

### Phase 1: Define the board model

Settle the document and object model, interaction basics, theme behavior, and a minimal canvas experience.

### Phase 2: Build indexed primitives

Add arrays, strings, matrices, pointers, ranges, highlights, comparisons, assignments, and swaps. Use these to compose traversal and two-pointer explanations.

### Phase 3: Add step history

Represent changes as reversible steps and provide controls to run, pause, step, restart, and review a timeline. Apply this model to manually authored explanations first.

### Phase 4: Expand structures and examples

Add DP tables and dependency arrows, followed by linked structures, stacks, queues, trees, heaps, graphs, tries, and hash tables. Provide examples that demonstrate how primitives combine.

### Phase 5: Connect supported code

Choose an initial language and execution approach, then map source lines and selected runtime state to board objects. Extend support only where synchronization can remain predictable and useful.

### Phase 6: Persist and share

Add durable saving, reopening, and sharing workflows once the board document model is stable.

## Current status

The manual board described in **Implemented first milestone** is present in the app and covered by tests. The larger product vision and phases below remain proposals. Code execution, runtime variable synchronization, freehand drawing, collaboration, and external sharing are not implemented.

Future work should build on the reusable object, operation, and history contracts without treating planned capabilities as shipped features.

## Suggested repository sections

As implementation begins, the repository may benefit from sections such as:

- `docs/` for product decisions, interaction notes, and architecture details
- `examples/` for reusable algorithm explanations
- `src/` for the application and board modules

These are suggestions only; no directory structure or technology stack is implied by this README.
