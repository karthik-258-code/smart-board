# Hash Table Object Design

## Goal
Show key/value storage and hash collisions as an editable, replayable board object.

## Model
A hash table stores a fixed bucket count from 3 to 13 and up to 50 unique `{ key, value }` entries. Bucket placement is derived by summing Unicode code points modulo bucket count, using separate chaining for collisions. Keys are non-empty strings; values are strings or finite numbers.

## Interaction
The toolbar adds a seven-bucket table. Inspector controls set/update a key, remove a key, and list the computed bucket. SVG shows every bucket and its chained entries; empty buckets remain visible. Operations capture exact prior entries so undo restores insertions, updates, and removals.

## Compatibility
Additive type-version 1 with no schema migration or dependencies. Existing history validation remains strict and replayable.
