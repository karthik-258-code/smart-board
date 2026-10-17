# Share Links Design

**Status:** Approved under the project owner's standing instruction to continue autonomously
**Date:** 2026-10-17

## Intent

People need to share a complete, replayable Smart Board with another person or device. Keep the current local-first app useful without an account, server, or new dependency. Preserve the board and timeline format already used by file export.

## Design

Create a self-contained URL fragment containing a gzip-compressed, URL-safe base64 encoding of the validated board-file envelope. The fragment is not sent in the HTTP request. The payload contains the board and full timeline, so a recipient can inspect and replay the shared work.

The share control creates the link from the current history and copies it when the Clipboard API is available. It also displays a selectable read-only link so users can copy it manually. Creation reports clear errors when browser compression is unavailable or payload exceeds the supported limit.

On startup, detect the share fragment, decompress it with an output-size limit, parse it through the existing board-file validator, and ask before replacing the current local board. Accepting creates a new local history from the shared history and saves it. Declining or invalid input leaves local board and storage unchanged. Remove the fragment after handling it so refresh does not repeat the import prompt.

Use native browser compression only. Reject malformed base64, invalid gzip, oversized compressed or decompressed payloads, invalid board files, and unsupported versions with typed errors. The payload is not encrypted or access-controlled; anyone who obtains a link can read its board data. Share links are intended for modest boards. Use file export for larger payloads.

Real-time collaboration, access control, expiring links, and server-backed short links are out of scope for this milestone.

## Acceptance

- Link creation round-trips a validated history, including timeline entries and execution metadata.
- The URL fragment uses URL-safe characters and stays within the configured payload limit.
- Invalid, truncated, oversized, unsupported, or decompression-bomb payloads fail without changing the current board.
- Opening a valid share link prompts before replacement; cancel preserves local state, accept imports and persists it.
- The application removes a handled share fragment from the address bar.
- Clipboard failure leaves a visible, selectable link.
- Existing board-file import/export behavior remains unchanged.
