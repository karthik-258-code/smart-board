# Trie Object Design

## Goal
Teach prefix sharing and word lookup through a live trie diagram.

## Model
A trie stores up to 50 unique non-empty lowercase alphabetic words, each at most 24 characters. The SVG prefix tree is derived from this word set: common prefixes share nodes and complete words mark terminal nodes. Keeping the word set canonical avoids duplicated edge state.

## Interaction
Create an empty trie, insert words, remove words, and inspect the rendered prefix tree. Each word edit is a reversible operation, persisted in history. The canvas shows root, character nodes, parent-child edges, and terminal markers.

## Compatibility
Additive type-version 1, strict history fields, no runtime dependencies.
