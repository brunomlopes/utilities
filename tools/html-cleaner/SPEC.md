## Overview

This repository contains a javascript web app in nextjs that takes html on the left, using a large text area, and on the right at the top has a filter, and shows on the bottom another text area with the same html, but filtered.

The UI and UX should be similar to the one used on the json-visualizer tool.

This should be a client side application in react, using the current best practices.

## Features

Feature.1- Allow filtering html from input into output based on a filter
Feature.2- Output can be re-formatted, based on a checkbox marked "Format output". This checkbox is set by default. When this is set, the output, after filtering, is re-formatted using 4 spaces per tab.
Feature.2.1- Any extraneous whitespace is removed when formatting.

## Filter Features

Filter.1 - There is a filter to exclude html tags, separated by comma (,).
Filter.1.1 - A tag can be just the name, or the name as an html tag (<div>)
Filter.2 - There is a filter to exclude html attributes on each tag, separated by comma (,), as part of each tag
Filter.2.1 - To remove a tag from all nodes, use * as the tag name

### Examples

Feature.2.1.Example.1 - With "Format output" enabled, ordinary whitespace is collapsed while meaningful spaces around inline tags are preserved.

Input:

```html
<div>
    Hello      <strong>world</strong> !

    <p>  A   short   paragraph.  </p>
</div>
```

Output:

```html
<div>
    Hello <strong>world</strong> !
    <p>A short paragraph.</p>
</div>
```

Feature.2.1.Example.2 - Whitespace inside `pre`, `textarea`, `script`, and `style` remains unchanged.

Input:

```html
<div><pre>  keep
    this exactly</pre></div>
```

Output:

```html
<div>
    <pre>  keep
    this exactly</pre>
</div>
```

Filter.1.Example.1 - `meta,table` removes all nodes named meta and table. Children of each node gets attributed to the parent of the node
Filter.1.1.Example.1 - `<meta>,table` removes all nodes named meta and table. Children of each node gets attributed to the parent of the node
Filter.2.Example.1 - `meta,<table style,class>` removes all tags named meta and all attributes named style and class from nodes named table. table nodes remain
Filter.2.1.Example.1 - `meta,<* style,class>` removes all tags named meta and all attributes named style and class from all nodes.
