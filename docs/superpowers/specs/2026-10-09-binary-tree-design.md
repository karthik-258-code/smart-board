# Binary Tree Object Design

## Goal
Add a structured binary tree for explaining traversals, search, and recursive algorithms.

## Data and invariants
A draggable tree owns an optional root ID and up to 30 nodes `{ id, value, leftId, rightId, position }`, plus highlighted node IDs. Each child has one parent, left/right slots are unique, every referenced node exists, all nodes are reachable from the root, and cycles are rejected. Empty trees have a null root and no nodes.

## Interaction
Add a sample tree. Inspector selects a parent, inserts a left or right child, removes a node and its descendants, and highlights nodes. Changes are reversible. SVG renders parent-child links behind labeled nodes using stored local coordinates.

## Compatibility and verification
Additive type-version 1. Tests cover strict validation, subtree removal and inverse, replay, empty/sample rendering, inspector edits, and persistence.
