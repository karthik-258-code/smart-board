# Heap Object Design

## Goal
Provide min-heap and max-heap objects that show both array order and tree structure.

## Model
A heap stores `kind: min|max` and up to 31 finite numeric values in level-order. Strict validation enforces the heap property at every parent-child relation. This representation makes the array and complete binary tree views two projections of the same data.

## Interaction
The toolbar creates an empty min-heap. Inspector allows min/max selection when empty, push, and extract-top. Operations perform sift-up/sift-down atomically and store exact prior values for undo. SVG shows indexed array cells and a compact tree with parent-child lines.

## Compatibility
Additive version-1 object, strict history operations, no dependencies. Existing files remain valid.
