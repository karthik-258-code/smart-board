# Linked List Object Design

## Goal
Add a singly linked list that learners can edit step by step and replay on the Smart Board.

## Design
Represent each node as `{ id, value, nextId }` inside one draggable `linked-list` board object. The list object owns ordering and links; the renderer lays nodes horizontally and draws arrows from each node to its `nextId`. IDs remain stable when nodes move in the sequence. Empty lists render an explicit empty state.

## Operations and UI
Add a linked list with three sample nodes. Inspector controls append, prepend, insert after an existing node, and remove a node. Each user action becomes a reversible domain operation and therefore a timeline step. Validation requires 1–20 unique non-empty node IDs, scalar values, valid next references, and exactly one acyclic chain covering every node (or no nodes for empty).

## Compatibility
This is an additive type-version-1 object. Existing board documents remain valid. Portable files and history replay use the existing validators and operation system.

## Verification
Cover model validation, operation inverses, undo/redo, drawing links, toolbar creation, inspector edits, and save/reload behavior in focused tests, then run the full suite and production build.
