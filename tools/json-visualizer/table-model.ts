import type { JsonValue } from "./filter";

type JsonObject = { [key: string]: JsonValue };

export interface TableModel {
  columns: string[];
  rows: string[][];
}

interface TableColumn {
  label: string;
  parent: string;
  child?: string;
}

function isJsonObject(value: JsonValue): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isJsonPrimitive(value: JsonValue): boolean {
  return value === null || typeof value !== "object";
}

function isFlattenableObject(value: JsonValue): value is JsonObject {
  if (!isJsonObject(value)) return false;
  const children = Object.values(value);
  return children.length > 0 && children.every(isJsonPrimitive);
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

function hasOwn(object: JsonObject, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function createColumns(rows: JsonObject[]): TableColumn[] {
  const parentKeys: string[] = [];
  const seenParentKeys = new Set<string>();

  for (const row of rows) {
    for (const key of Object.keys(row)) {
      if (seenParentKeys.has(key)) continue;
      seenParentKeys.add(key);
      parentKeys.push(key);
    }
  }

  return parentKeys.flatMap((parent): TableColumn[] => {
    const nonNullValues = rows.flatMap((row) =>
      hasOwn(row, parent) && row[parent] !== null ? [row[parent]] : [],
    );

    if (
      nonNullValues.length === 0 ||
      !nonNullValues.every((value) => isFlattenableObject(value))
    ) {
      return [{ label: parent, parent }];
    }

    const childKeys: string[] = [];
    const seenChildKeys = new Set<string>();

    for (const value of nonNullValues) {
      if (!isFlattenableObject(value)) continue;
      for (const child of Object.keys(value)) {
        if (seenChildKeys.has(child)) continue;
        seenChildKeys.add(child);
        childKeys.push(child);
      }
    }

    return childKeys.map((child) => ({
      label: `${parent}.${child}`,
      parent,
      child,
    }));
  });
}

function readCell(row: JsonObject, column: TableColumn): string {
  if (!hasOwn(row, column.parent)) return "";

  const parentValue = row[column.parent];
  if (column.child === undefined) return formatCell(parentValue);
  if (!isJsonObject(parentValue) || !hasOwn(parentValue, column.child)) return "";

  return formatCell(parentValue[column.child]);
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

      const columns = createColumns(objectRows);

      return {
        columns: columns.map((column) => column.label),
        rows: objectRows.map((row) => columns.map((column) => readCell(row, column))),
      };
    }

    for (const child of Object.values(current)) {
      enqueueDescendantObjects(child, queue);
    }
  }

  return null;
}
