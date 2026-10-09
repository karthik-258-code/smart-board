# Graph Object Design

## Goal
Let algorithm explanations show graph structure, traversal state, and reversible graph edits directly on the board.

## Data and validation
A draggable graph object owns up to 30 vertices `{ id, label, position }`, up to 60 undirected edges `{ id, from, to }`, and highlighted vertex IDs. Vertex coordinates are local to the graph. IDs are unique, every edge endpoint exists, self-edges and duplicate undirected edges are rejected, and highlights reference existing vertices.

## Interaction
The toolbar adds a small sample graph. Inspector controls add/remove vertices, connect selected endpoints, remove edges, and highlight vertices. Each edit is a reversible graph operation. SVG rendering draws edges behind labeled vertices and shows selected/highlighted state with text and shape cues.

## Compatibility and verification
Additive type-version-1 object. Existing board schema, history, local storage, and board-file format remain unchanged. Tests cover validation, mutation inverses, replay, rendering, controls, and persistence.
