const INDENT = "    ";
const HTML_WHITESPACE = /[\t\n\f\r ]+/g;
const WHITESPACE_SENSITIVE_TAGS = new Set(["pre", "textarea", "script", "style"]);
const INLINE_TAGS = new Set([
  "a",
  "abbr",
  "b",
  "bdi",
  "bdo",
  "br",
  "button",
  "cite",
  "code",
  "data",
  "del",
  "dfn",
  "em",
  "i",
  "img",
  "input",
  "ins",
  "kbd",
  "label",
  "mark",
  "q",
  "s",
  "samp",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "time",
  "u",
  "var",
  "wbr",
]);
const VOID_TAGS = new Set([
  "area",
  "base",
  "br",
  "col",
  "embed",
  "hr",
  "img",
  "input",
  "link",
  "meta",
  "param",
  "source",
  "track",
  "wbr",
]);

interface InlineSegment {
  html: string;
  leadingSpace: boolean;
  trailingSpace: boolean;
}

function indentation(level: number) {
  return INDENT.repeat(level);
}

function openingTag(element: Element) {
  const outerHtml = (element.cloneNode(false) as Element).outerHTML;
  let quote: '"' | "'" | null = null;

  for (let index = 1; index < outerHtml.length; index += 1) {
    const character = outerHtml[index];
    if (quote) {
      if (character === quote) quote = null;
    } else if (character === '"' || character === "'") {
      quote = character;
    } else if (character === ">") {
      return outerHtml.slice(0, index + 1);
    }
  }

  return outerHtml;
}

function escapeText(text: string) {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function textSegment(text: string): InlineSegment {
  const normalized = text.replace(HTML_WHITESPACE, " ");
  return {
    html: escapeText(normalized.replace(/^ /, "").replace(/ $/, "")),
    leadingSpace: normalized.startsWith(" "),
    trailingSpace: normalized.endsWith(" "),
  };
}

function isInlineContent(node: ChildNode) {
  return (
    node.nodeType === Node.TEXT_NODE ||
    node.nodeType === Node.COMMENT_NODE ||
    (node.nodeType === Node.ELEMENT_NODE &&
      INLINE_TAGS.has((node as Element).tagName.toLowerCase()))
  );
}

function serializeInlineNode(node: ChildNode): InlineSegment {
  if (node.nodeType === Node.TEXT_NODE) return textSegment(node.textContent ?? "");

  if (node.nodeType === Node.COMMENT_NODE) {
    return {
      html: `<!--${(node as Comment).data}-->`,
      leadingSpace: false,
      trailingSpace: false,
    };
  }

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  if (WHITESPACE_SENSITIVE_TAGS.has(tagName)) {
    return { html: element.outerHTML, leadingSpace: false, trailingSpace: false };
  }
  if (VOID_TAGS.has(tagName)) {
    return { html: element.outerHTML, leadingSpace: false, trailingSpace: false };
  }

  const content = serializeInlineSequence(Array.from(element.childNodes));
  return {
    html: `${openingTag(element)}${content.html}</${tagName}>`,
    leadingSpace: content.leadingSpace,
    trailingSpace: content.trailingSpace,
  };
}

function serializeInlineSequence(nodes: readonly ChildNode[]): InlineSegment {
  let html = "";
  let hasContent = false;
  let leadingSpace = false;
  let pendingSpace = false;

  nodes.forEach((node) => {
    const segment = serializeInlineNode(node);
    const segmentHasWhitespace = segment.leadingSpace || segment.trailingSpace;

    if (!segment.html) {
      if (hasContent) pendingSpace ||= segmentHasWhitespace;
      else leadingSpace ||= segmentHasWhitespace;
      return;
    }

    const needsSpace = pendingSpace || segment.leadingSpace;
    if (hasContent && needsSpace) html += " ";
    else if (!hasContent) leadingSpace ||= needsSpace;

    html += segment.html;
    hasContent = true;
    pendingSpace = segment.trailingSpace;
  });

  return { html, leadingSpace, trailingSpace: pendingSpace };
}

function formatNode(node: ChildNode, level: number): string | null {
  const prefix = indentation(level);

  if (isInlineContent(node)) {
    const inline = serializeInlineSequence([node]);
    return inline.html ? `${prefix}${inline.html}` : null;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  if (WHITESPACE_SENSITIVE_TAGS.has(tagName)) return `${prefix}${element.outerHTML}`;
  if (VOID_TAGS.has(tagName)) return `${prefix}${element.outerHTML}`;

  const childNodes = Array.from(element.childNodes);
  if (childNodes.length === 0) return `${prefix}${openingTag(element)}</${tagName}>`;

  if (childNodes.every(isInlineContent)) {
    const inline = serializeInlineSequence(childNodes);
    return `${prefix}${openingTag(element)}${inline.html}</${tagName}>`;
  }

  const children: string[] = [];
  let inlineBuffer: ChildNode[] = [];

  function flushInlineBuffer() {
    const inline = serializeInlineSequence(inlineBuffer);
    if (inline.html) children.push(`${indentation(level + 1)}${inline.html}`);
    inlineBuffer = [];
  }

  childNodes.forEach((child) => {
    if (isInlineContent(child)) {
      inlineBuffer.push(child);
      return;
    }

    flushInlineBuffer();
    const formattedChild = formatNode(child, level + 1);
    if (formattedChild) children.push(formattedChild);
  });
  flushInlineBuffer();

  if (children.length === 0) return `${prefix}${openingTag(element)}</${tagName}>`;
  return `${prefix}${openingTag(element)}\n${children.join("\n")}\n${prefix}</${tagName}>`;
}

function isCompleteDocument(html: string) {
  return /^\s*(?:<!doctype\b|<html\b)/i.test(html);
}

function serializeDoctype(doctype: DocumentType | null) {
  if (!doctype) return null;

  const publicId = doctype.publicId ? ` PUBLIC \"${doctype.publicId}\"` : "";
  const systemId = doctype.systemId
    ? `${doctype.publicId ? "" : " SYSTEM"} \"${doctype.systemId}\"`
    : "";

  return `<!DOCTYPE ${doctype.name}${publicId}${systemId}>`;
}

export function formatHtml(html: string): string {
  if (!html) return html;

  if (isCompleteDocument(html)) {
    const parsedDocument = new DOMParser().parseFromString(html, "text/html");
    return [serializeDoctype(parsedDocument.doctype), formatNode(parsedDocument.documentElement, 0)]
      .filter((part): part is string => part !== null)
      .join("\n");
  }

  const template = document.createElement("template");
  template.innerHTML = html;
  return Array.from(template.content.childNodes)
    .map((node) => formatNode(node, 0))
    .filter((part): part is string => part !== null)
    .join("\n");
}
