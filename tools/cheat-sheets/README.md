# Cheat Sheets

Static, browser-only command references at `/cheat-sheets`, with individual pages for `/cheat-sheets/tmux` and `/cheat-sheets/vim`.

The pages use default bindings, explain command notation, and link to the tmux manual and Vim reference. There is no data fetching or server runtime. Tables adapt to narrow screens and support printing.

To add a sheet, add its content to `sheets.ts` and create an explicit client page under `app/cheat-sheets/<slug>/page.tsx` rendering `CheatSheetPage`. The index and sheet navigation use the shared catalog automatically.
