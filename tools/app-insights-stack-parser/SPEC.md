# App Insights Stack Parser

## Purpose and route

Provide a browser-only utility at `/app-insights-stack-parser`, linked from the Utilities catalog. Accept the JSON details array copied from Azure Application Insights and render one table for each exception, preserving input order.

## Input contract

- The input must be a JSON array of objects. Each object requires `id`, `outerId`, `severityLevel`, `type`, `message`, and `parsedStack`.
- `id`, `outerId`, and `severityLevel` accept strings or numbers. `type` and `message` are strings.
- `parsedStack` is an array of frames. Each frame requires a string `method`; optional `fileName` is a string and optional `line` is a non-negative integer.
- Additional properties such as `assembly` and `level` are accepted but do not appear in the formatted trace. Frames retain their array order.
- Empty arrays are valid. Empty input shows an initial prompt. Invalid JSON or invalid item/frame fields produce a readable error, including the item/frame position where applicable, and clear previous results.

## Output contract

Each table has an exception-number caption and exactly three rows:

1. Four cells, in order: `id`, `outerId`, `severityLevel`, `type`. Each cell contains its field label and value.
2. A full-width cell labeled `message`, preserving the original text and line breaks.
3. A full-width cell labeled `parsedStack`, containing a monospace C#-style trace.

Stack frames render as `   at Method in /path/File.cs:line 202`. Omit the file suffix when no filename is available and omit the line suffix when the line is absent or zero. Preserve method names exactly; do not invent parameter signatures or parentheses that are not present in telemetry. Display an explicit empty-state message for an empty stack.

Keep the four metadata cells in a single row at all sizes, allowing long values to wrap. Wrap long messages, paths, and stack frames to avoid horizontal page overflow.

## Interaction and architecture

Recompute the output when input changes. Provide a labeled multiline input, accessible error and item-count status, and a Clear button. Use React Client Components, local state, and no network calls, storage, server endpoints, or new runtime dependencies. Support the existing static export and visual theme.

## Verification

Test frame formatting, numeric metadata, multiline messages, invalid input, empty arrays, the exact three-row table structure, replacement of stale output, clearing, and the catalog route. Run repository tests, lint, type checking, and the static build.
