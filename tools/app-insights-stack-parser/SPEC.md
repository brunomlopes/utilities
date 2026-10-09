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

Display one vertical guide per ancestor and indent the caption and table together by 16 pixels per level. Resolve `outerId` against `id` across the entire array, preserving display order and treating numeric/string equivalents as the same ID. Roots have no guides; siblings share depth. An outer ID of zero, an unresolved parent, or an ambiguous duplicate parent ID establishes a root. Cycle members (including self-links) are roots; their non-cyclic descendants still receive relative depth. Use an iterative traversal to support deep chains, expose the level to assistive technology, and contain horizontal overflow for very deep indentation. This visual hierarchy does not change clipboard formats.

Recompute the output when input changes. Provide a labeled multiline input, accessible error and item-count status, and a Clear button. Use React Client Components, local state, and no network calls, storage, server endpoints, or new runtime dependencies. Support the existing static export and visual theme.

## Clipboard exports

- Provide **Copy rich text** and **Copy wiki markup** buttons above the output; each exports all exceptions in order.
- Rich text writes `text/html` and `text/plain` in one clipboard item. HTML preserves the three-row table layout, multiline messages, and preformatted stack frames. Escape all telemetry before embedding it in HTML.
- Wiki markup writes plain text with an exception heading, a four-cell metadata row, the message, and a `{code:none}` stack block. Long fields follow the table rather than using unsupported merged-cell syntax. Escape wiki syntax in metadata/messages and isolate literal code-macro delimiters inside stack data.
- Disable copy buttons for empty/invalid output and while a write is pending. Report success only after clipboard completion; report failures without discarding output. Clear copy feedback when input changes, and ignore stale completion feedback after input changes.
- Clipboard writes require a supported browser and secure context. Actual formatting on paste is controlled by the receiving editor; plain-text fallback is available for rich-text exports.

## Verification

Test HTML escaping and table structure, wiki escaping and code blocks, exception order, both clipboard MIME types, disabled buttons, and clipboard failure/success feedback.

Test frame formatting, numeric metadata, multiline messages, invalid input, empty arrays, the exact three-row table structure, replacement of stale output, clearing, and the catalog route. Run repository tests, lint, type checking, and the static build.
