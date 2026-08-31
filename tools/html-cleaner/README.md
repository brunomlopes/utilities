# HTML Cleaner

A browser-only utility for removing selected nodes or attributes from HTML. Enter tag names such as `meta,table`, tag-specific attribute rules such as `<table style,class>`, or wildcard rules such as `<* style,class>`. Removed nodes are unwrapped, preserving their children in the parent node.

All parsing and filtering happens locally in the browser.

Output formatting is enabled by default, uses four spaces per indentation level, and collapses ordinary whitespace while preserving meaningful spaces around inline elements. Disable **Format output** to keep the browser serializer's compact output. Content inside `pre`, `textarea`, `script`, and `style` elements is not reformatted.
