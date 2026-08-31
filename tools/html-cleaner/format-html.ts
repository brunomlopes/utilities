const INDENT = "    ";
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

function indentation(level: number) {
  return INDENT.repeat(level);
}

function openingTag(element: Element) {
  const outerHtml = (element.cloneNode(false) as Element).outerHTML;
  return outerHtml.slice(0, outerHtml.indexOf(">") + 1);
}

function hasMeaningfulText(nodes: readonly ChildNode[]) {
  return nodes.some((node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim());
}

function shouldKeepElementInline(element: Element, childNodes: readonly ChildNode[]) {
  const childElements = childNodes.filter((node): node is Element => node.nodeType === Node.ELEMENT_NODE);
  return (
    hasMeaningfulText(childNodes) ||
    (childElements.length > 0 && childElements.every((child) => INLINE_TAGS.has(child.tagName.toLowerCase())))
  );
}

function formatNode(node: ChildNode, level: number): string | null {
  const prefix = indentation(level);

  if (node.nodeType === Node.COMMENT_NODE) {
    return `${prefix}<!--${(node as Comment).data}-->`;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? "";
    return text.trim() ? `${prefix}${text.trim()}` : null;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) return null;

  const element = node as Element;
  const tagName = element.tagName.toLowerCase();
  if (WHITESPACE_SENSITIVE_TAGS.has(tagName)) return `${prefix}${element.outerHTML}`;
  if (VOID_TAGS.has(tagName)) return `${prefix}${element.outerHTML}`;

  const childNodes = Array.from(element.childNodes);
  if (childNodes.length === 0 || shouldKeepElementInline(element, childNodes)) {
    return `${prefix}${element.outerHTML}`;
  }

  const children = childNodes
    .map((child) => formatNode(child, level + 1))
    .filter((child): child is string => child !== null);

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
