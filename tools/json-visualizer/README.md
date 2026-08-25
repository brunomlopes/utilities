# JSON Visualizer

A browser-only utility for pruning JSON documents by property name. It is part of the Utilities suite and is available at `/json-visualizer/`. JSON parsing and filtering happen entirely in the current browser tab.

## Filter syntax

- `a,b,c` keeps properties with any of those names, wherever they occur, plus the ancestor structure needed to reach them.
- `x[a,b,c]` finds `x` properties anywhere and keeps matching direct children. When `x` is an array, the child filter is applied to every object item and unmatched items are removed.
- Brackets can be nested to any depth. Each ordinary nested selector matches only direct children, as in `FollowUps[Content[Title]]`.
- A nested standalone wildcard crosses descendant levels recursively. For example, `Stages[*[Content[Title]]]` finds matching `Content.Title` branches at any depth beneath each property in `Stages`.
- `$[FollowUps]` anchors the selector to the root object, so nested properties named `FollowUps` are not matched. When the JSON root is an array, it applies independently to every direct object item, retaining matching items in their original order and removing nonmatching objects and primitives. Nested arrays are not treated as additional roots. The brackets are required; `$FollowUps` is not the root-selector form.
- `x[status=active]` keeps only `x` objects whose `status` is `active`, retaining their other properties but omitting the predicate-only `status` property. Add selectors such as `x[id,status=active]` to project only those properties from matching objects.
- Add a plain selector to project a predicate property: `x[status,status=active]` keeps and shows `status`.
- Repeating predicates uses OR logic: `x[status,status=active,status=paused]` keeps items with either value.
- Predicate values may be bare (`status=active`) or quoted with JSON string escaping (`status="keep active"`). Values compare by their scalar text, so `value=true`, `value=42`, and `value=null` each match both the corresponding JSON scalar and the same text stored as a string.
- Forms can be mixed as a union: `a,z[b],"x,y"[c,d]`.
- Names without `*` match complete property names. For example, `id` matches `id`, but not `ideaSubmissionId` or `templateId`.
- `*` matches zero or more characters anywhere in a name. For example, `id*` matches `id` and `ideaSubmissionId`, while `*id` matches `id`, `ideaSubmissionId`, and `templateId`; wildcards also work in bracket parents and children.
- Append `!` to a bare property selector to pull its complete value all the way to the output root, removing empty ancestor branches. For example, `config[enabled!]` produces `{ "enabled": ... }`. When the JSON root is an array, each direct object item is a separate output root and pull destination.
- Append `^` to pull a property one containing-object level up, `^^` to pull it two levels up, and so on. Array containers do not count as levels, so `a[value^]` pulls `value` from an item in `{ "a": [{ "value": 1 }] }` to the root. Against `{ "a": { "b": { "enabled": true } } }`, `a[b[enabled^]]` produces `{ "a": { "enabled": true } }`, while `a[b[enabled^^]]` produces `{ "enabled": true }`. Excess carets clamp the destination at the output root.
- Add a bare destination name after the complete operator to rename a pulled property, as in `config[enabled!isEnabled]` or `a[b[enabled^^isEnabled]]`. Quote the entire source name to treat `!` or `^` literally: `"enabled!"` and `"enabled^"` select those exact property names without pulling them.
- Pull selectors support wildcard source names, such as `settings[feature*!selectedFeature]`, but cannot be combined with equality predicates or bracket children.
- Destination values use JSON encounter order. The first value assigned to a destination property wins. Every later assignment that would replace it leaves the first value intact and reports a separate `Property X would be overwritten with value Y.` filter error; this includes wildcard matches and collisions with normally selected properties at the pull destination.
- For a root array, overwrite errors use the one-based position in the original input, such as `[Item #2] Property X would be overwritten with value Y.` In the table view, the surviving destination cell is highlighted and exposes all of that cell's overwrite errors in a hover or keyboard-focus tooltip. If the destination is flattened, every derived cell is highlighted.
- All names match case-insensitively. Bare names are trimmed. Double-quoted names use JSON string escaping and allow commas, brackets, or significant surrounding whitespace.
- A matching property retains its complete value. Within arrays, unmatched elements are removed and matching elements keep their original order.

## Development

Run commands from the repository root. The tool implementation, filtering engine, tests, specification, and styles are colocated in this directory.

```sh
npm run dev
npm test
```
