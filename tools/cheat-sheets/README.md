# Cheat Sheets

Client-side app pages at `/cheat-sheets`, with individual routes for `tmux`, `vim`, `nft` (nftables), and `conntrack`.

The content in `sheets.ts` imports the HTML bodies supplied in `app/cheat-sheets/previous/`. `cheatsheet.css` preserves their dark theme, numbered cards, colored accents, keyboard keys, tooltips, and animations. Styles are scoped to `.cheat-sheet` to avoid affecting other utilities. The original Google Fonts stylesheet is retained, with monospace fallbacks.

App navigation, keyboard-focusable tooltip cards, wrapping for long commands, and a single-column layout on small screens supplement the original layout. HTML is trusted repository content, never runtime user input. All pages support static export.

To add a sheet, add its metadata and HTML body to `sheets.ts` and an explicit client page under `app/cheat-sheets/<slug>/page.tsx` rendering `CheatSheetPage`. The index and navigation use the shared catalog.
