export function parseExcludedAttributes(filterText: string): string[] {
  return [...new Set(filterText.split(",").map((name) => name.trim().toLowerCase()).filter(Boolean))];
}

function stripAttributes(root: ParentNode, excludedAttributes: readonly string[]) {
  const excluded = new Set(excludedAttributes);

  root.querySelectorAll("*").forEach((element) => {
    for (const attribute of Array.from(element.attributes)) {
      if (excluded.has(attribute.name.toLowerCase())) {
        element.removeAttribute(attribute.name);
      }
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
  const excludedAttributes = parseExcludedAttributes(filterText);
  if (!html || excludedAttributes.length === 0) return html;

  if (isCompleteDocument(html)) {
    const document = new DOMParser().parseFromString(html, "text/html");
    stripAttributes(document, excludedAttributes);
    const doctype = serializeDoctype(document.doctype);
    return `${doctype}${doctype ? "\n" : ""}${document.documentElement.outerHTML}`;
  }

  const template = document.createElement("template");
  template.innerHTML = html;
  stripAttributes(template.content, excludedAttributes);
  return template.innerHTML;
}
