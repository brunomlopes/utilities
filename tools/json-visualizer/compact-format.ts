import type { JsonValue } from "./filter";

const INDENT_SIZE = 2;

function inlineSingleton(value: JsonValue): string | null {
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    if (value.length !== 1) return null;

    const item = inlineSingleton(value[0]);
    return item === null ? null : `[ ${item} ]`;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    if (entries.length !== 1) return null;

    const [key, childValue] = entries[0];
    const child = inlineSingleton(childValue);
    return child === null ? null : `{ ${JSON.stringify(key)}: ${child} }`;
  }

  return JSON.stringify(value);
}

function renderValue(
  value: JsonValue,
  depth: number,
  prefix: string,
  maximumColumns: number,
): string[] {
  const indent = " ".repeat(depth * INDENT_SIZE);
  const inline = inlineSingleton(value);

  if (inline !== null && indent.length + prefix.length + inline.length <= maximumColumns) {
    return [`${indent}${prefix}${inline}`];
  }

  if (Array.isArray(value)) {
    const lines = [`${indent}${prefix}[`];
    value.forEach((item, index) => {
      const itemLines = renderValue(item, depth + 1, "", maximumColumns);
      if (index < value.length - 1) {
        itemLines[itemLines.length - 1] += ",";
      }
      lines.push(...itemLines);
    });
    lines.push(`${indent}]`);
    return lines;
  }

  if (value !== null && typeof value === "object") {
    const entries = Object.entries(value);
    const lines = [`${indent}${prefix}{`];
    entries.forEach(([key, childValue], index) => {
      const childLines = renderValue(
        childValue,
        depth + 1,
        `${JSON.stringify(key)}: `,
        maximumColumns,
      );
      if (index < entries.length - 1) {
        childLines[childLines.length - 1] += ",";
      }
      lines.push(...childLines);
    });
    lines.push(`${indent}}`);
    return lines;
  }

  return [`${indent}${prefix}${JSON.stringify(value)}`];
}

export function formatCompactJson(value: JsonValue, maximumColumns = Infinity): string {
  return renderValue(value, 0, "", maximumColumns).join("\n");
}
