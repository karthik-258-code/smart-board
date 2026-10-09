# Guided Lessons Design

## Goal
Help teachers and learners move through prepared examples in a useful order with a clear objective for each step.

## Lesson catalog
Lessons are static, version-controlled metadata: title, description, and ordered steps. Each step references one validated replayable example and provides a short objective. Initial lessons cover array foundations, windows/DP, and graph traversal. No new persistence format or lesson authoring interface is introduced.

## UI
A toolbar panel selects a lesson and lesson step, displays the objective, and loads that step through the existing example replacement flow. Previous/next step controls only change the selected lesson step; loading remains explicit. Existing board replacement confirmation and cancellation behavior remains authoritative.

## Verification
Test catalog references, order, boundaries, accessible controls, loaded examples, and confirmation behavior.
