# JSON Visualizer

A browser-only utility for pruning JSON documents by property name. It is part of the Utilities suite and is available at `/json-visualizer/`. JSON parsing and filtering happen entirely in the current browser tab.

## Filter syntax

- `a,b,c` keeps properties with any of those names, wherever they occur, plus the ancestor structure needed to reach them.
- `x[a,b,c]` finds `x` properties anywhere and keeps matching direct children. When `x` is an array, the child filter is applied to every object item and unmatched items are removed.
- Brackets can be nested to any depth. Each ordinary nested selector matches only direct children, as in `FollowUps[Content[Title]]`.
- A nested standalone wildcard crosses descendant levels recursively. For example, `Stages[*[Content[Title]]]` finds matching `Content.Title` branches at any depth beneath each property in `Stages`.
- `$[FollowUps]` anchors the selector to the root object, so nested properties named `FollowUps` are not matched. A root array is not treated as a collection of root objects.
- `x[status=active]` keeps only `x` objects whose `status` is `active`, retaining their other properties but omitting the predicate-only `status` property. Add selectors such as `x[id,status=active]` to project only those properties from matching objects.
- Add a plain selector to project a predicate property: `x[status,status=active]` keeps and shows `status`.
- Repeating predicates uses OR logic: `x[status,status=active,status=paused]` keeps items with either value.
- Predicate values may be bare (`status=active`) or quoted with JSON string escaping (`status="keep active"`). Values compare by their scalar text, so `value=true`, `value=42`, and `value=null` each match both the corresponding JSON scalar and the same text stored as a string.
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
