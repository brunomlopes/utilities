# Utilities

A collection of focused, browser-only utilities built with Next.js, React, and TypeScript. Every utility runs locally in the browser and the complete suite exports as static HTML, CSS, and JavaScript.

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

## Utilities

- [JSON Visualizer](tools/json-visualizer/README.md) — filter JSON by property name while preserving matching structure.

Each utility keeps its implementation, tests, styles, README, and optional specification under `tools/<slug>/`. Its static App Router page lives at `app/<slug>/page.tsx`, and its homepage metadata is registered in `tools/registry.ts`.

## Adding a utility

1. Create `tools/<slug>/` with the utility implementation, tests, README, and optional `SPEC.md`.
2. Add a static route under `app/<slug>/` that renders the utility.
3. Add its title, description, slug, and route to `tools/registry.ts`.
4. Verify tests, type checking, linting, and the static export.

## Static deployment

`npm run build` creates the deployable site in `out/`. Serve that directory with any HTTP static file server; Node.js is not required after the build.

For a domain-root deployment:

```sh
npm run build
```

For a subpath deployment:

```sh
APP_BASE_PATH=/utilities npm run build
```

On PowerShell:

```powershell
$env:APP_BASE_PATH = "/utilities"
npm run build
```

Mount `out/` at the same URL path. `APP_BASE_PATH` must begin with `/`, must not end with `/`, and requires a rebuild when changed.
