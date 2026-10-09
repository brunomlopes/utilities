import { formatStack, type ExceptionDetails } from "./parse";
import { exceptionLabels } from "./hierarchy";

const fields = ["id", "outerId", "severityLevel", "type"] as const;
const stack = (item: ExceptionDetails) => formatStack(item.parsedStack) || "No stack frames available.";

function escapeHtml(value: string | number): string {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!);
}

function escapeWiki(value: string | number): string {
  return String(value).replace(/\\/g, "\\\\").replace(/([|{}\[\]*_+~^!#-])/g, "\\$1").replace(/\r\n|\r|\n/g, "\\\\ ");
}

export function toPlainText(items: ExceptionDetails[]): string {
  const labels = exceptionLabels(items);
  return items.map((item, index) => `${labels[index]}\n${fields.map((field) => `${field}: ${item[field]}`).join(" | ")}\n\nmessage\n${item.message}\n\nparsedStack\n${stack(item)}`).join("\n\n");
}

export function toRichText(items: ExceptionDetails[]): string {
  const labels = exceptionLabels(items);
  return items.map((item, index) => {
    const content = `<h3>${escapeHtml(labels[index])}</h3><table border="1" style="border-collapse:collapse;width:100%"><tbody><tr>${fields.map((field) => `<td><strong>${field}</strong><br>${escapeHtml(item[field])}</td>`).join("")}</tr><tr><td colspan="4"><strong>message</strong><p>${escapeHtml(item.message).replace(/\r\n|\r|\n/g, "<br>")}</p></td></tr><tr><td colspan="4"><strong>parsedStack</strong><pre>${escapeHtml(stack(item))}</pre></td></tr></tbody></table>`;
    return content;
  }).join("<p><br></p>");
}

function wikiCode(value: string): string {
  // Keep literal macro delimiters in telemetry from closing the generated code block.
  return value.split(/(\{code(?::[^}\r\n]*)?\})/gi).map((part, index) =>
    index % 2 ? escapeWiki(part) : `{code:none}\n${part}\n{code}`,
  ).join("\n");
}

export function toWikiMarkup(items: ExceptionDetails[]): string {
  const labels = exceptionLabels(items);
  // Jira wiki tables cannot merge cells; put long fields below the metadata table.
  return items.map((item, index) => `h3. ${escapeWiki(labels[index])}\n\n|${fields.map((field) => `*${field}*: ${escapeWiki(item[field])}`).join("|")}|\n\n*message*\n${escapeWiki(item.message)}\n\n*parsedStack*\n${wikiCode(stack(item))}`).join("\n\n");
}

export async function copyOutput(items: ExceptionDetails[], format: "rich" | "wiki"): Promise<void> {
  if (format === "wiki") {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(toWikiMarkup(items));
    return;
  }
  if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Rich-text clipboard unavailable");
  await navigator.clipboard.write([new ClipboardItem({
    "text/html": new Blob([toRichText(items)], { type: "text/html" }),
    "text/plain": new Blob([toPlainText(items)], { type: "text/plain" }),
  })]);
}
