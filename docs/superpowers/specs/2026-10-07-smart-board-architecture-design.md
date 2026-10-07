# Smart Board Architecture Design

**Status:** Draft for review  
**Date:** 2026-10-07

## Purpose

Smart Board is a flexible visual workspace for making changing systems understandable. Algorithm explanations are the first use case. The product should also support learning, teaching, debugging, interview practice, and reusable interactive tutorials over time.

This document defines a technology-neutral architecture and staged build roadmap. It does not select a programming language, framework, or code execution service. The repository currently contains a product concept, not an implementation.

## Product principles

- A board remains useful without code execution.
- Users can add and edit objects while explaining an idea.
- Visual objects and freeform notes can coexist.
- State changes are explicit, inspectable, and reversible.
- Features use shared contracts instead of reaching into each other's internals.
- New capabilities arrive in stages; the first milestone is a useful manual algorithm board.

## Recommended architecture

Use a shared state engine with modular feature boundaries. A board document is the canonical model. The engine validates and applies named operations to that model, then records those operations in history. The canvas and product features read the model and request changes through the engine.

The first version should be a modular application, not a distributed service or a general-purpose plugin marketplace. Keep extension points narrow and add them where a real second consumer needs them.

### Main components

| Component | Responsibility | Depends on |
| --- | --- | --- |
| Board document | Own board identity, schema version, objects, and document metadata. | Object definitions |
| Object registry | Resolve object types and their validation and supported operations. | Object type definitions |
| State engine | Validate and apply operations, return updated state, and report errors. | Board document, object registry |
| History | Track applied operations and cursor for undo, redo, and replay. | State engine |
| Canvas and interaction layer | Render objects, manage selection and viewport, and turn user actions into operation requests. | Board document, state engine |
| Feature modules | Add learning, teaching, presentation, or code connection behavior through defined interfaces. | State engine contracts |
| Persistence adapter | Save and load versioned board documents. | Board document, history format |

Keep rendering separate from board state. Canvas position and visual appearance belong to object presentation data; semantic values and relationships belong to object state. This lets multiple views use the same board model.

### Board document and dynamic objects

The board is a collection of typed objects. Each object has a stable ID, type, type version, semantic data, and presentation data such as position and size. The document has its own schema version and may contain board-level metadata.

Users can add, move, edit, duplicate, and remove objects at any time. Initial object types should include freeform text and shapes, plus a small structured set such as arrays. Later types can include pointers, ranges, tables, graphs, and linked structures.

Object types declare their data validation and supported operations. For example, an array validates indexed values and supports cell edits or swaps; a pointer validates its target against a compatible object. Invalid operations return a visible, actionable error and do not partially change the board.

Object type registration should be internal to the application at first. A type may provide a schema, renderer, and operation handlers through a stable interface. Do not load untrusted executable plugins in the initial product.

### Operations, state, and history

All meaningful board changes go through named operations, including adding or removing an object, editing a value, moving an object, or changing an annotation. An operation identifies its target, carries the required input, and can be validated before application.

Applying an operation produces either a complete updated board state and a history entry, or an error with the original state unchanged. Operation application must be deterministic for the same document and input. History keeps the applied operation sequence and a cursor. Undo moves the cursor to the prior state; redo moves it forward. A new operation after undo discards the redo branch.

The history model is local to a board in the first milestone. It should not depend on a backend, collaboration service, or language runtime. If saved history becomes large, snapshots can be introduced without changing operation meaning.

### Data flow

1. User acts on the canvas or a feature control.
2. Interaction layer creates a named operation request.
3. State engine checks object existence, operation support, and input validity.
4. On success, engine produces updated document state; history records the operation and advances its cursor.
5. Views observe the new state and render it. On failure, state remains unchanged and the user receives an actionable message.
6. Undo, redo, or replay asks history to derive the selected state through the same operation semantics.

Feature modules may request operations and observe state changes. They must not mutate document objects directly.

### Feature boundaries

- **Manual board:** Available from the start; supports drawing, object placement, and structured objects.
- **Teaching and presentation:** Uses board state and history to present a sequence, add annotations, and prepare lessons.
- **Learning and practice:** Adds prompts, prediction checkpoints, hints, and exercises without owning a separate board model.
- **Code adapter:** Later translates supported runtime events into board operation requests and associates events with source lines. It does not bypass validation or mutate state directly.
- **Persistence and sharing:** Stores versioned documents. Sharing and collaboration are later capabilities, not prerequisites for a useful local board.

## Error handling and compatibility

Reject an invalid operation before committing any state change. Show enough detail for the user to understand the target and reason, such as an out-of-range index or a pointer targeting an incompatible object.

Version both board documents and object types. Loading an unsupported version should produce a clear error and preserve the source data. Future migrations should be explicit and testable; never silently discard unknown object data.

Code adapters must show unsupported or ambiguous mappings. They must not imply that a visual state is synchronized when it is not.

## Build roadmap

### Phase 1: Board foundation

Define the initial document schema and object contract. Build the canvas, object registry, and add, move, edit, duplicate, and remove flows. Start with text, basic shapes, and arrays. Add local save and reopen so early boards survive a reload.

**Exit check:** Create a board with mixed objects, save and reopen it, and confirm IDs, values, and positions remain intact.

### Phase 2: Operations and history

Implement validated named operations, history cursor, undo, redo, and replay. Keep the operation model independent of canvas rendering.

**Exit check:** Replay a recorded sequence to the same final state; undo and redo every operation; confirm an invalid operation leaves state unchanged; confirm a new operation after undo creates a new history branch.

### Phase 3: Algorithm primitives

Add arrays, named pointers, ranges, highlights, tables, and essential operations. Compose traversal, two pointers, sliding window, and binary search from shared primitives rather than dedicated visualizers.

**Exit check:** Build and replay each example manually. Validate index boundaries, empty inputs, duplicate values, and inclusive or exclusive range conventions.

### Phase 4: Teaching and practice

Add presentation controls, annotations, prediction checkpoints, hints, and exercises. Keep lesson content linked to board state and history.

**Exit check:** Author a lesson, present it, let a learner predict a step, reveal the result, and resume or replay the explanation.

### Phase 5: Code connection

Choose one initial language and a constrained execution method. Add an adapter that maps selected source lines and runtime values to declared board objects and operation requests.

**Exit check:** Step through supported examples, inspect mapped variables, and clearly report unsupported or ambiguous mappings. Manual board workflows must still work when execution is unavailable.

### Phase 6: Persistence, sharing, and expansion

Add shareable board documents, templates, and additional object types. Add external extension support only after internal object contracts have proven stable. Consider collaboration as a separate design once sharing requirements are known.

**Exit check:** Open a shared document, replay its history, migrate supported older documents, and add a new internal object type without changing state engine contracts.

## Architecture validation plan

Before implementation, validate the design against these end-to-end scenarios:

1. **Manual teaching:** Add array, pointer, range, and annotation; update them step by step; undo and replay.
2. **Learner practice:** Pause at a checkpoint, record a prediction, reveal actual state, and continue.
3. **Debugging:** Map a supported code event to a board operation; locate first divergence; handle an unmapped variable visibly.
4. **Dynamic object lifecycle:** Add, edit, move, duplicate, delete, undo, save, and reopen mixed object types.
5. **Invalid action:** Attempt out-of-range edit or incompatible pointer target; preserve state and explain the error.
6. **Extension:** Add a new object type using its declared schema and operations without direct mutation or changes to unrelated feature modules.

At each implementation phase, verify operation determinism, history behavior, object validation, document compatibility, and feature boundaries. The repository has no implementation yet, so these are design acceptance checks; executable tests will be added with the corresponding code.

## Risks and decisions deferred

- **Code execution safety and language choice:** Defer until Phase 5; keep the adapter isolated so the board works without it.
- **History size:** Start with a simple operation sequence; measure before adding snapshots or compression.
- **Object schema growth:** Version schemas and define migration behavior before durable sharing.
- **Collaboration:** Defer conflict resolution and multi-user editing until concrete sharing needs are known.
- **Broad product scope:** Keep the first release centered on manual algorithm explanations, then add learning and presentation workflows on the shared state model.

## Non-goals for the first milestone

- Running arbitrary user code.
- Real-time multi-user collaboration.
- Public plugin marketplace or untrusted plugin loading.
- Dedicated visualizer for every algorithm.
- Cloud accounts or sharing infrastructure.

