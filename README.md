# JSON Visualizer

A browser-only Next.js application for pruning JSON documents by property name. JSON parsing and filtering happen entirely in the current browser tab; there are no API routes, server actions, or runtime server dependencies.

## Development

```sh
npm install
npm run dev
```

Run validation with:

```sh
npm run lint
npm run typecheck
npm test
npm run build
```

## Filter syntax

- `a,b,c` keeps properties with any of those names, wherever they occur, plus the ancestor structure needed to reach them.
- `x[a,b,c]` finds `x` properties anywhere and keeps matching direct children of object-valued `x` properties.
- Forms can be mixed as a union: `a,z[b],"x,y"[c,d]`.
- Names match case-insensitively. Bare names are trimmed. Double-quoted names use JSON string escaping and allow commas, brackets, or significant surrounding whitespace.
- A matching property retains its complete value. Within arrays, unmatched elements are removed and matching elements keep their original order.

## Static deployment

`npm run build` creates the static site in `out/`. Serve that directory from any HTTP static file server; Node.js is not needed after the build.

For a domain-root deployment:

```sh
npm run build
```

For a subpath deployment, provide the public mount path at build time:

```sh
APP_BASE_PATH=/json-visualizer npm run build
```

On PowerShell:

```powershell
$env:APP_BASE_PATH = "/json-visualizer"
npm run build
```

Mount the resulting `out/` directory at the same URL path. `APP_BASE_PATH` must begin with `/`, must not end with `/`, and requires a rebuild when changed.
