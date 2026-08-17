import type { JsonValue } from "./filter";

type JsonObject = { [key: string]: JsonValue };

export interface TableModel {
  columns: string[];
  columnKeys: string[];
  rows: string[][];
  sortValues: (JsonValue | undefined)[][];
}

interface TableColumn {
  label: string;
  parent: string;
  child?: string;
}

interface ObjectArrayCandidate {
  items: JsonValue[];
  rows: JsonObject[];
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

function findFirstObjectArray(value: JsonObject): ObjectArrayCandidate | null {
  const queue: JsonObject[] = [value];

  for (let index = 0; index < queue.length; index += 1) {
    const current = queue[index];

    for (const child of Object.values(current)) {
      if (!Array.isArray(child)) continue;

      const rows = child.filter(isJsonObject);
      if (rows.length > 0) return { items: child, rows };
    }

    for (const child of Object.values(current)) {
      enqueueDescendantObjects(child, queue);
    }
  }

  return null;
}

function findPreferredObjectArray(value: JsonValue): JsonObject[] | null {
  if (Array.isArray(value)) {
    if (value.length <= 1) return null;

    const rows = value.filter(isJsonObject);
    return rows.length > 0 ? rows : null;
  }

  if (!isJsonObject(value)) return null;

  let candidate = findFirstObjectArray(value);

  while (candidate?.items.length === 1) {
    const nestedCandidate = findFirstObjectArray(candidate.rows[0]);
    if (!nestedCandidate) break;
    candidate = nestedCandidate;
  }

  return candidate?.rows ?? null;
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
  const value = readCellValue(row, column);
  return value === undefined ? "" : formatCell(value);
}

function readCellValue(row: JsonObject, column: TableColumn): JsonValue | undefined {
  if (!hasOwn(row, column.parent)) return undefined;

  const parentValue = row[column.parent];
  if (column.child === undefined) return parentValue;
  if (!isJsonObject(parentValue) || !hasOwn(parentValue, column.child)) return undefined;

  return parentValue[column.child];
}

function createColumnKey(column: TableColumn): string {
  return JSON.stringify([column.parent, column.child ?? null]);
}

export function createTableModel(value: JsonValue | null): TableModel | null {
  const objectRows = findPreferredObjectArray(value);
  if (!objectRows) return null;

  const columns = createColumns(objectRows);

  return {
    columns: columns.map((column) => column.label),
    columnKeys: columns.map(createColumnKey),
    rows: objectRows.map((row) => columns.map((column) => readCell(row, column))),
    sortValues: objectRows.map((row) =>
      columns.map((column) => readCellValue(row, column)),
    ),
  };
}
