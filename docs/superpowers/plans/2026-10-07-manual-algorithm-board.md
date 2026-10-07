# Manual Algorithm Board Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver first usable Smart Board slice: add dynamic objects, build an algorithm explanation manually, save it locally, and undo, redo, and replay its steps.

**Architecture:** Use one typed board document and pure operation engine as canonical state. React/SVG renders the document and sends named operations to the engine; history and local persistence remain separate modules behind small interfaces.

**Tech Stack:** React + TypeScript + Vite; SVG canvas; `localStorage` persistence; Vitest and React Testing Library. Use Node.js >=22.12.0 and Vite >=6.4.0 to meet [current Vitest requirements](https://vitest.dev/guide/). React documents TypeScript support, and Vite provides a React TypeScript template ([React](https://react.dev/learn/typescript), [Vite](https://vite.dev/guide/)). Pin resolved dependency versions in `package-lock.json` during setup.

**Spec:** `docs/superpowers/specs/2026-10-07-smart-board-architecture-design.md`

## Global Constraints

- One canonical board document owns semantic object data and presentation data.
- Every board change uses a named, deterministic operation.
- Invalid operations leave board state unchanged and return an actionable error.
- Objects use stable IDs, a type, a type version, semantic data, and presentation data.
- Freeform objects and structured objects coexist on the same board.
- Support light and dark themes with readable text and non-color state cues.
- Code execution, collaboration, cloud accounts, and external plugin loading are outside this milestone.
- Freehand paths, connectors, advanced structures, teaching/practice tools, and code connection are follow-on plans.

## Review Focus

- Missing object IDs and incompatible targets: reject without partial mutation; test in Task 3.
- History branching after undo: discard redo branch on a new operation; test in Task 4.
- Empty arrays, duplicate values, and range boundaries: preserve valid semantics; test in Task 6.
- Corrupt or unsupported saved documents: show a recoverable error and preserve stored source; test in Task 7.
- Mixed object types through save/reopen/replay: preserve IDs, values, and positions; test in Task 8.

---

## File Map

- `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig*.json`, `index.html`: application and test tooling.
- `src/domain/model.ts`: versioned board and object types.
- `src/domain/result.ts`: typed success/error result.
- `src/domain/operations.ts`: operation types and pure state transition function.
- `src/domain/history.ts`: operation entries, undo, redo, and replay cursor.
- `src/domain/objectRegistry.ts`: object type metadata and validation.
- `src/persistence/localBoardStore.ts`: versioned JSON save/load boundary.
- `src/app/`: application state wiring, toolbar, inspector, timeline, and error presentation.
- `src/canvas/`: SVG canvas and typed object renderers.
- `src/styles/`: responsive board shell and object styling.
- `src/**/*.test.ts` and `src/**/*.test.tsx`: focused unit and interaction tests colocated by responsibility.

## Task 1: Scaffold application and test runner

**Files:**
- Create: `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`
- Create: `src/main.tsx`, `src/app/App.tsx`, `src/app/App.test.tsx`, `src/test/setup.ts`

**Interfaces:**
- Produces: `App` root component and scripts `npm run dev`, `npm run build`, `npm run test`.

- [ ] **Step 1: Scaffold React, TypeScript, and Vite**

Generate the official React TypeScript Vite starter as setup code, then install Vitest, jsdom, React Testing Library, `user-event`, and jest-dom. Configure Vitest in `vite.config.ts` with `src/test/setup.ts`. Add strict TypeScript checking and the three package scripts. Keep generated app markup unchanged until the failing test runs.

- [ ] **Step 2: Write failing app-shell test**

Create `src/app/App.test.tsx`. Assert the rendered app contains a `Smart Board` heading, an accessible board region, and an `Add object` control.

- [ ] **Step 3: Run test and confirm it fails**

Run: `npm run test -- --run src/app/App.test.tsx`
Expected: FAIL on assertions because generated starter UI lacks Smart Board heading, board region, and Add object control.

- [ ] **Step 4: Implement minimal semantic app shell**

Implement `App` with a heading, labeled board region, and toolbar containing `Add object`. Keep board content empty in this task.

- [ ] **Step 5: Run test and production build**

Run: `npm run test -- --run src/app/App.test.tsx`
Expected: PASS.

Run: `npm run build`
Expected: Vite build succeeds with strict type checking.

- [ ] **Step 6: Commit**

Commit message: `feat: scaffold smart board app`

## Task 2: Define versioned object model and registry

**Files:**
- Create: `src/domain/result.ts`, `src/domain/model.ts`, `src/domain/model.test.ts`
- Create: `src/domain/objectRegistry.ts`, `src/domain/objectRegistry.test.ts`

**Interfaces:**
- Produces: `Result<T, E> = { ok: true; value: T } | { ok: false; error: E }`, `BoardDocument`, `BoardObject`, `createEmptyBoard(id: string): BoardDocument`, `ObjectDefinition`, `validateBoard(document: unknown): Result<BoardDocument, BoardError>`.
- Object union variants: `note`, `shape`, `array`, `pointer`, and `range`. Each has stable `id`, `typeVersion: 1`, and `position: { x: number; y: number }`.
- `note` stores `text`; `shape` stores `shapeKind: "rectangle"`, `width`, and `height`.
- `array` stores `values: Array<string | number>`; `pointer` stores `targetObjectId: string` and `index: number`; `range` stores `targetObjectId: string`, `start: number`, and `endExclusive: number`.
- `pointer` and `range` also store a user-visible `name`; `array` stores `highlightedIndices: number[]`.
- `BoardDocument` is `{ id: string; schemaVersion: 1; objects: BoardObject[] }`. `BoardError` is `{ code: string; message: string }`. `ObjectDefinition` exposes `type`, `typeVersion`, and `validate(value: unknown): Result<BoardObject, BoardError>`. `ObjectRegistry` is `Record<BoardObject["type"], ObjectDefinition>`.

- [ ] **Step 1: Write model and registry tests**

Test empty board schema version 1, valid variants, unique IDs, supported object type versions, and rejection of malformed input. Confirm empty arrays are valid, highlight indices are in bounds, and ranges use `start <= endExclusive` with `endExclusive <= array length` when attached to an array.

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm run test -- --run src/domain/model.test.ts src/domain/objectRegistry.test.ts`
Expected: FAIL because model and registry modules do not exist.

- [ ] **Step 3: Implement board and object types**

Define discriminated TypeScript unions and `createEmptyBoard`. Keep semantic fields separate from `position` presentation data.

- [ ] **Step 4: Implement object registry and document validation**

Register the five initial object variants. `validateBoard` checks unique IDs and cross-object references, then returns a typed success or error result. Do not coerce unknown fields or silently discard unknown object data.

- [ ] **Step 5: Run model and registry tests**

Run: `npm run test -- --run src/domain/model.test.ts src/domain/objectRegistry.test.ts`
Expected: PASS, including malformed input and boundary cases.

- [ ] **Step 6: Commit**

Commit message: `feat: define board document and object registry`

## Task 3: Implement validated board operations

**Files:**
- Create: `src/domain/operations.ts`, `src/domain/operations.test.ts`

**Interfaces:**
- Consumes: `BoardDocument`, `BoardObject`, `ObjectRegistry` from Task 2.
- Produces: `BoardOperation` union and `applyOperation(document: BoardDocument, operation: BoardOperation): Result<{ document: BoardDocument; inverse: BoardOperation }, OperationError>`.
- Initial operation payloads: `object/add { object }`, `object/remove { objectId }`, `object/update-position { objectId, position }`, `note/update-text { objectId, text }`, `array/set-value { objectId, index, value }`, `array/set-highlight { objectId, indices }`, `pointer/move { objectId, index }`, and `range/set { objectId, start, endExclusive }`.
- `OperationError` and `HistoryError` use `{ code: string; message: string; objectId?: string; index?: number }`.

- [ ] **Step 1: Write operation tests**

Test each operation's state result and inverse. Include `array/set-highlight`. Test missing object IDs, invalid array indices, duplicate object IDs, incompatible pointer/range targets, and malformed values. Assert every failure preserves the original document.

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm run test -- --run src/domain/operations.test.ts`
Expected: FAIL because operation types and reducer do not exist.

- [ ] **Step 3: Implement operation union and pure reducer**

Implement all operations as immutable state transitions. Validate the full operation before returning a new document and its inverse. Preserve unrelated object references and values.

- [ ] **Step 4: Run operation tests**

Run: `npm run test -- --run src/domain/operations.test.ts`
Expected: PASS, including error atomicity.

- [ ] **Step 5: Commit**

Commit message: `feat: add validated board operations`

## Task 4: Add undo, redo, and replay history

**Files:**
- Create: `src/domain/history.ts`, `src/domain/history.test.ts`

**Interfaces:**
- Consumes: `applyOperation` and operation inverse from Task 3.
- Produces: `HistoryState { initialDocument: BoardDocument; entries: HistoryEntry[]; cursor: number }`, `dispatch(state, operation): Result<HistoryState, OperationError>`, `undo(state): HistoryState`, `redo(state): HistoryState`, `stateAt(state, cursor): Result<BoardDocument, HistoryError>`.
- `HistoryEntry` stores `operation` and `inverse`. Cursor is count of applied operations, from `0` through `entries.length`; `stateAt` accepts only that range.

- [ ] **Step 1: Write history tests**

Test dispatch, undo, redo, state at each cursor, replay determinism, undo at start, redo at end, and branch truncation when a new operation follows undo.

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm run test -- --run src/domain/history.test.ts`
Expected: FAIL because history module does not exist.

- [ ] **Step 3: Implement history transitions**

Use `cursor` as the count of applied entries. Dispatch applies the operation and truncates entries after cursor. Undo decrements cursor when possible; redo increments it when possible. `stateAt` replays operations from the initial document.

- [ ] **Step 4: Run history tests**

Run: `npm run test -- --run src/domain/history.test.ts`
Expected: PASS, including identical state after replay and branch truncation.

- [ ] **Step 5: Commit**

Commit message: `feat: add reversible board history`

## Task 5: Render and manage dynamic board objects

**Files:**
- Create: `src/canvas/BoardCanvas.tsx`, `src/canvas/BoardCanvas.test.tsx`
- Create: `src/canvas/ObjectRenderer.tsx`, `src/canvas/objectRenderers/NoteRenderer.tsx`, `src/canvas/objectRenderers/ShapeRenderer.tsx`, `src/canvas/objectRenderers/ArrayRenderer.tsx`
- Create: `src/app/BoardToolbar.tsx`, `src/app/BoardInspector.tsx`
- Create: `src/app/ThemeControl.tsx`, `src/styles/themes.css`
- Modify: `src/app/App.tsx`, `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `BoardDocument`, `BoardOperation`, `dispatch` from Tasks 2–4.
- Produces: `<BoardCanvas document={document} selectedId={selectedId} onSelect={id => void} onOperation={operation => void} />`.
- Toolbar adds note, rectangle, and array objects using generated stable IDs and default positions.

- [ ] **Step 1: Write object interaction tests**

Test that toolbar adds note, shape, and array objects; renderer displays each type; selecting an object opens inspector; editing note text and moving object dispatch correct operations; adding objects repeatedly yields unique IDs. Test theme control switches between light and dark with readable labels and a non-color selected-state cue.

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm run test -- --run src/canvas/BoardCanvas.test.tsx src/app/App.test.tsx`
Expected: FAIL because object renderers and controls do not exist.

- [ ] **Step 3: Implement SVG canvas and type renderers**

Render objects from document data in one SVG board region. Keep renderer components pure; route selection and edits to app callbacks. Give each selectable object an accessible role, label, and keyboard focus. Add labeled controls.

- [ ] **Step 4: Implement toolbar, inspector, and object lifecycle**

Wire add, select, move, edit, duplicate, and remove actions through named operations. Provide default positions that do not stack new objects exactly over one another. Add light and dark theme tokens and a labeled theme control; both themes must retain readable object labels and visible pointer, range, and selection states.

- [ ] **Step 5: Run interaction tests and build**

Run: `npm run test -- --run src/canvas/BoardCanvas.test.tsx src/app/App.test.tsx`
Expected: PASS.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 6: Commit**

Commit message: `feat: add dynamic board objects`

## Task 6: Add algorithm primitives and timeline controls

**Files:**
- Create: `src/canvas/objectRenderers/PointerRenderer.tsx`, `src/canvas/objectRenderers/RangeRenderer.tsx`
- Create: `src/app/HistoryControls.tsx`, `src/app/HistoryControls.test.tsx`
- Modify: `src/canvas/ObjectRenderer.tsx`, `src/app/BoardToolbar.tsx`, `src/app/BoardInspector.tsx`, `src/app/App.tsx`
- Create: `src/app/algorithm-primitives.test.tsx`

**Interfaces:**
- Consumes: operation and history contracts from Tasks 3–4.
- Produces: controls for add pointer/range, move pointer, set range, set array highlight, undo, redo, previous step, next step, and replay from start.
- Pointer indices are zero-based. Ranges use half-open `[start, endExclusive)` bounds.

- [ ] **Step 1: Write primitive and timeline tests**

Test pointer name and targeting, range display, array highlights, empty array behavior, duplicate values, valid first/last indices, half-open empty range, range ending at array length, and rejection of negative or out-of-bounds indices. Test timeline controls reflect and change history cursor.

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm run test -- --run src/app/algorithm-primitives.test.tsx src/app/HistoryControls.test.tsx`
Expected: FAIL because pointer/range renderers and timeline controls do not exist.

- [ ] **Step 3: Implement pointer and range creation and rendering**

Allow pointers and ranges to reference arrays. Render pointer name/index and range boundaries with text so state is not conveyed by color alone.

- [ ] **Step 4: Implement history controls**

Wire undo/redo and previous/next/restart controls to history. Disable controls at their valid boundaries. Keep pointer and range updates in operation history.

- [ ] **Step 5: Run primitive tests and build**

Run: `npm run test -- --run src/app/algorithm-primitives.test.tsx src/app/HistoryControls.test.tsx`
Expected: PASS, including empty and boundary inputs.

Run: `npm run build`
Expected: production build succeeds.

- [ ] **Step 6: Commit**

Commit message: `feat: add indexed primitives and replay controls`

## Task 7: Persist boards locally and handle invalid saves

**Files:**
- Create: `src/persistence/localBoardStore.ts`, `src/persistence/localBoardStore.test.ts`
- Create: `src/app/SaveStatus.tsx`
- Modify: `src/app/App.tsx`, `src/app/App.test.tsx`

**Interfaces:**
- Consumes: `BoardDocument`, `validateBoard`, and `HistoryState` from Tasks 2–4.
- Produces: `saveBoard(storage: Storage, key: string, document: BoardDocument): Result<void, StorageError>` and `loadBoard(storage: Storage, key: string): Result<BoardDocument | null, StorageError>`.
- Storage key: `smart-board:document:v1`.

- [ ] **Step 1: Write persistence tests**

Test save/load round trip, missing document, malformed JSON, schema validation failure, quota/storage exception, and that failed loads do not overwrite stored source.

- [ ] **Step 2: Run tests and confirm they fail**

Run: `npm run test -- --run src/persistence/localBoardStore.test.ts`
Expected: FAIL because persistence module does not exist.

- [ ] **Step 3: Implement versioned storage adapter**

Serialize the document as JSON. Validate parsed unknown values before returning them. Catch parse and Storage errors; never clear or rewrite invalid source during load.

- [ ] **Step 4: Integrate save and load with app lifecycle**

Load at startup; save after successful operations. Display save status and a recoverable message when stored data is invalid or unavailable. For invalid data, offer `Keep saved data` or `Start new board`; preserve the stored source until the user chooses to replace it.

- [ ] **Step 5: Run persistence and app tests**

Run: `npm run test -- --run src/persistence/localBoardStore.test.ts src/app/App.test.tsx`
Expected: PASS, including preservation of corrupt stored data.

- [ ] **Step 6: Commit**

Commit message: `feat: persist board documents locally`

## Task 8: Verify first usable algorithm workflow

**Files:**
- Create: `src/app/manual-algorithm-workflow.test.tsx`
- Modify: `README.md`

**Interfaces:**
- Consumes: complete app flow from Tasks 1–7.
- Produces: a documented first milestone and one passing end-to-end interaction test.

- [ ] **Step 1: Write full workflow test**

In `manual-algorithm-workflow.test.tsx`, create an array, add pointers `l` and `r`, add a half-open range, change pointer positions, undo one change, redo it, move to earlier and later history states, reload the saved document, and assert stable IDs and values persist.

- [ ] **Step 2: Run workflow test and inspect failures**

Run: `npm run test -- --run src/app/manual-algorithm-workflow.test.tsx`
Expected: FAIL only for any missing integrated behavior; fix failures in the owning module before continuing.

- [ ] **Step 3: Add README implementation status and run instructions**

Update README to distinguish implemented first milestone from future roadmap. Add exact install, dev, test, and build commands. Do not claim code execution, collaboration, or sharing exists.

- [ ] **Step 4: Run full verification**

Run: `npm run test -- --run`
Expected: all unit and interaction tests pass.

Run: `npm run build`
Expected: production build succeeds with no TypeScript errors.

- [ ] **Step 5: Commit**

Commit message: `feat: complete manual algorithm board milestone`

## Follow-on plans

Create separate plans after this milestone is reviewed and working:

1. Teaching and learner practice: presentation, annotations, prediction checkpoints, hints, and exercises.
2. Freehand drawing and additional structures: strokes, connectors, matrices, lists, stacks, queues, trees, and graphs.
3. Code connection: one language adapter, source mapping, selected variables, and unsupported mapping behavior.
4. Sharing and extension: portable documents, templates, migrations, and internal object type extensions.

