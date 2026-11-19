
# Agent instructions for this repository

This repository contains **HTML cheat sheets**. When adding or updating content, follow these rules:

- **One topic per file:** Each cheat sheet is a standalone HTML file named `[topic].html`.
- **Location:** All cheat sheets live under `src/`.
- **Shared styling:** Every HTML file must use the shared stylesheet at `src/cheatsheet.css`.
- **Consistency:** Keep layout and formatting consistent across topics so all sheets feel like a unified set.
- **Format pattern:** Follow the layout pattern in `src/tmux.html` (header, section labels, grid of cards, footer note, and tip) so new sheets match the same structure.

Use this **format checklist** (mirrors `src/tmux.html`):

1. **Document shell**
   - `<!DOCTYPE html>` + `<html lang="en">`
   - `<head>` with `meta charset`, `meta viewport`, `<title>`, Google Fonts link, and `<link rel="stylesheet" href="cheatsheet.css">`.
2. **Body container**
   - `<div class="container">` wraps the entire page.
3. **Header block**
   - `<header>` with an icon `<div class="terminal-icon">` (SVG) and text block containing `<h1>` and `<p class="subtitle">`.
4. **Sections**
   - Each section starts with `<div class="section-label">Section Name</div>`.
   - Followed by `<div class="grid">` containing multiple `.card` elements.
5. **Cards**
   - `.card` uses `style="--card-accent: var(--accent...)"`.
   - Inside: `.card-num`, `.card-body` with `.card-title` and `.card-keys` (use `<kbd>` for keys), plus a `.tooltip`.
   - Optional `.flip-tip` class when needed (see tmux example).
6. **Footer note**
   - `<div class="footer-note">` with an inline SVG icon and short guidance text.
7. **Tip block**
   - `<div class="tip">` containing a bold “Pro tip” label and inline `<kbd>` snippets.
8. **Closing tags**
   - Close `.container`, `</body>`, `</html>`.

If you add a new topic, create `src/[topic].html` and link to `cheatsheet.css` using a relative path.
