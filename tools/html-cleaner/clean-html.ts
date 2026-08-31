const TAG_NAME_PATTERN = /^[a-z][a-z0-9:-]*$/i;
const ATTRIBUTE_NAME_PATTERN = /^[^\s,<>]+$/;

export class HtmlFilterSyntaxError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "HtmlFilterSyntaxError";
  }
}

export interface HtmlFilter {
  removedTags: ReadonlySet<string>;
  attributesByTag: ReadonlyMap<string, ReadonlySet<string>>;
}

function syntaxError(detail: string): never {
  throw new HtmlFilterSyntaxError(`Invalid filter: ${detail}`);
}

function splitDirectives(filterText: string): string[] {
  if (!filterText.trim()) return [];

  const directives: string[] = [];
  let directiveStart = 0;
  let insideTag = false;

  for (let index = 0; index < filterText.length; index += 1) {
    const character = filterText[index];

    if (character === "<") {
      if (insideTag) syntaxError("nested '<' characters are not allowed.");
      insideTag = true;
    } else if (character === ">") {
      if (!insideTag) syntaxError("found '>' without a matching '<'.");
      insideTag = false;
    } else if (character === "," && !insideTag) {
      directives.push(filterText.slice(directiveStart, index));
      directiveStart = index + 1;
    }
  }

  if (insideTag) syntaxError("a tag expression is missing its closing '>'.");
  directives.push(filterText.slice(directiveStart));
  return directives;
}

function normalizeTagName(tagName: string) {
  if (!TAG_NAME_PATTERN.test(tagName)) {
    syntaxError(`'${tagName || "(empty)"}' is not a valid tag name.`);
  }
  return tagName.toLowerCase();
}

function normalizeAttributeNames(attributeText: string): string[] {
  return attributeText.split(",").map((rawName) => {
    const name = rawName.trim();
    if (!name || !ATTRIBUTE_NAME_PATTERN.test(name)) {
      syntaxError(`'${name || "(empty)"}' is not a valid attribute name.`);
    }
    return name.toLowerCase();
  });
}

export function parseHtmlFilter(filterText: string): HtmlFilter {
  const removedTags = new Set<string>();
  const mutableAttributesByTag = new Map<string, Set<string>>();

  for (const rawDirective of splitDirectives(filterText)) {
    const directive = rawDirective.trim();
    if (!directive) syntaxError("empty entries are not allowed.");

    if (!directive.startsWith("<")) {
      if (directive.includes("<") || directive.includes(">") || /\s/.test(directive)) {
        syntaxError(`'${directive}' is not a valid tag expression.`);
      }
      if (directive === "*") {
        syntaxError("'*' can only be used with one or more attributes.");
      }
      removedTags.add(normalizeTagName(directive));
      continue;
    }

    if (!directive.endsWith(">")) {
      syntaxError(`'${directive}' is not a complete tag expression.`);
    }

    const content = directive.slice(1, -1).trim();
    const whitespaceIndex = content.search(/\s/);
    const rawTagName = whitespaceIndex === -1 ? content : content.slice(0, whitespaceIndex);
    const attributeText = whitespaceIndex === -1 ? "" : content.slice(whitespaceIndex).trim();

    if (!attributeText) {
      if (rawTagName === "*") {
        syntaxError("'*' can only be used with one or more attributes.");
      }
      removedTags.add(normalizeTagName(rawTagName));
      continue;
    }

    const tagName = rawTagName === "*" ? "*" : normalizeTagName(rawTagName);
    const attributes = mutableAttributesByTag.get(tagName) ?? new Set<string>();
    normalizeAttributeNames(attributeText).forEach((attribute) => attributes.add(attribute));
    mutableAttributesByTag.set(tagName, attributes);
  }

  return { removedTags, attributesByTag: mutableAttributesByTag };
}

function applyFilter(root: ParentNode, filter: HtmlFilter) {
  const elements = Array.from(root.querySelectorAll("*"));
  const globalAttributes = filter.attributesByTag.get("*");

  elements.forEach((element) => {
    const tagName = element.tagName.toLowerCase();
    const tagAttributes = filter.attributesByTag.get(tagName);

    for (const attribute of Array.from(element.attributes)) {
      const attributeName = attribute.name.toLowerCase();
      if (globalAttributes?.has(attributeName) || tagAttributes?.has(attributeName)) {
        element.removeAttribute(attribute.name);
      }
    }
  });

  elements.forEach((element) => {
    if (filter.removedTags.has(element.tagName.toLowerCase())) {
      if (root instanceof Document && element === root.documentElement) return;
      element.replaceWith(...Array.from(element.childNodes));
    }
  });
}

function isCompleteDocument(html: string) {
  return /^\s*(?:<!doctype\b|<html\b)/i.test(html);
}

function serializeDoctype(doctype: DocumentType | null) {
  if (!doctype) return "";

  const publicId = doctype.publicId ? ` PUBLIC \"${doctype.publicId}\"` : "";
  const systemId = doctype.systemId
    ? `${doctype.publicId ? "" : " SYSTEM"} \"${doctype.systemId}\"`
    : "";

  return `<!DOCTYPE ${doctype.name}${publicId}${systemId}>`;
}

export function cleanHtml(html: string, filterText: string): string {
  const filter = parseHtmlFilter(filterText);
  if (!html || (filter.removedTags.size === 0 && filter.attributesByTag.size === 0)) return html;

  if (isCompleteDocument(html)) {
    const parsedDocument = new DOMParser().parseFromString(html, "text/html");
    applyFilter(parsedDocument, filter);
    const doctype = serializeDoctype(parsedDocument.doctype);
    const documentHtml = filter.removedTags.has("html")
      ? parsedDocument.documentElement.innerHTML
      : parsedDocument.documentElement.outerHTML;
    return `${doctype}${doctype ? "\n" : ""}${documentHtml}`;
  }

  const template = document.createElement("template");
  template.innerHTML = html;
  applyFilter(template.content, filter);
  return template.innerHTML;
}
