# JSON Visualizer

A browser-only utility for pruning JSON documents by property name. It is part of the Utilities suite and is available at `/json-visualizer/`. JSON parsing and filtering happen entirely in the current browser tab.

## Filter syntax

- `a,b,c` keeps properties with any of those names, wherever they occur, plus the ancestor structure needed to reach them.
- `x[a,b,c]` finds `x` properties anywhere and keeps matching direct children. When `x` is an array, the child filter is applied to every object item and unmatched items are removed.
- Brackets can be nested to any depth. Each ordinary nested selector matches only direct children, as in `FollowUps[Content[Title]]`.
- A nested standalone wildcard crosses descendant levels recursively. For example, `Stages[*[Content[Title]]]` finds matching `Content.Title` branches at any depth beneath each property in `Stages`.
- Forms can be mixed as a union: `a,z[b],"x,y"[c,d]`.
- Names without `*` match complete property names. For example, `id` matches `id`, but not `ideaSubmissionId` or `templateId`.
- `*` matches zero or more characters anywhere in a name. For example, `id*` matches `id` and `ideaSubmissionId`, while `*id` matches `id`, `ideaSubmissionId`, and `templateId`; wildcards also work in bracket parents and children.
- All names match case-insensitively. Bare names are trimmed. Double-quoted names use JSON string escaping and allow commas, brackets, or significant surrounding whitespace.
- A matching property retains its complete value. Within arrays, unmatched elements are removed and matching elements keep their original order.

## Development

Run commands from the repository root. The tool implementation, filtering engine, tests, specification, and styles are colocated in this directory.

```sh
npm run dev
npm test
```
