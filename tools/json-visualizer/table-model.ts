import type { JsonValue } from "./filter";

type JsonObject = { [key: string]: JsonValue };

export interface TableModel {
  columns: string[];
  rows: string[][];
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function formatCell(value: JsonValue): string {
  if (typeof value === "string") return value;
  if (value !== null && typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function enqueueDescendantObjects(value: JsonValue, queue: JsonObject[]): void {
  if (isJsonObject(value)) {
    queue.push(value);
    return;
  }

  if (Array.isArray(value)) {
    for (const item of value) enqueueDescendantObjects(item, queue);
  }
}

export function createTableModel(value: JsonValue | null): TableModel | null {
  if (!isJsonObject(value)) return null;

  const queue: JsonObject[] = [value];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    for (const child of Object.values(current)) {
      if (!Array.isArray(child)) continue;

      const objectRows = child.filter(isJsonObject);
      if (objectRows.length === 0) continue;

      const columns: string[] = [];
      const seenColumns = new Set<string>();

      for (const row of objectRows) {
        for (const key of Object.keys(row)) {
          if (seenColumns.has(key)) continue;
          seenColumns.add(key);
          columns.push(key);
        }
      }

      return {
        columns,
        rows: objectRows.map((row) =>
          columns.map((column) =>
            Object.prototype.hasOwnProperty.call(row, column) ? formatCell(row[column]) : "",
          ),
        ),
      };
    }

    for (const child of Object.values(current)) {
      enqueueDescendantObjects(child, queue);
    }
  }

  return null;
}
