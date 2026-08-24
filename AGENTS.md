# Agent Instructions

## Next.js applications

- Always create Next.js applications as client-side-only applications unless the specification explicitly requires server-side functionality.
- Keep application logic, data fetching, state, and rendering in Client Components (using `"use client"` where required).
- Do not introduce Server Actions, server-only data fetching, Route Handlers, API routes, middleware/proxy logic, or other server-runtime dependencies unless the specification explicitly requests them.
- Prefer static-export-compatible implementations by default.
- Do not treat an agent's architectural preference or an inferred optimization as an explicit server-side requirement.

## Node/npm location

- Use the node runtime available at `C:\utils\nodejs\tools` to run code and tests

## Agent behaviour

- Always ask any questions regarding the work to be done and wait for an answer. Do not assume or timeout.
- When an implementation is done, commit it.