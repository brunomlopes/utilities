import { describe, expect, it } from "vitest";
import type { JsonValue } from "./filter";
import { createTableModel, type TableModel } from "./table-model";
import { getSortedRowIndices, type SortDirection } from "./table-sort";

function createModel(records: { value?: JsonValue; row: string }[]): TableModel {
  const model = createTableModel({ records });
  if (!model) throw new Error("Expected a table model.");
  return model;
}

function sortedRowLabels(model: TableModel, direction: SortDirection): string[] {
  const valueColumn = model.columns.indexOf("value");
  const rowColumn = model.columns.indexOf("row");
  const indices = getSortedRowIndices(
    model,
    model.columnKeys[valueColumn],
    direction,
  );

  return indices.map((rowIndex) => model.rows[rowIndex][rowColumn]);
}

describe("getSortedRowIndices", () => {
  it("sorts numbers numerically in both directions and keeps equal values stable", () => {
    const model = createModel([
      { value: 10, row: "ten" },
      { value: 2, row: "first two" },
      { value: 2, row: "second two" },
    ]);

    expect(sortedRowLabels(model, "ascending")).toEqual([
      "first two",
      "second two",
      "ten",
    ]);
    expect(sortedRowLabels(model, "descending")).toEqual([
      "ten",
      "first two",
      "second two",
    ]);
  });

  it("sorts strings case-insensitively and leaves empty strings last", () => {
    const model = createModel([
      { value: "beta", row: "beta" },
      { value: "Alpha", row: "first alpha" },
      { value: "alpha", row: "second alpha" },
      { value: "", row: "empty" },
    ]);

    expect(sortedRowLabels(model, "ascending")).toEqual([
      "first alpha",
      "second alpha",
      "beta",
      "empty",
    ]);
  });

  it("sorts booleans false before true", () => {
    const model = createModel([
      { value: true, row: "true" },
      { value: false, row: "false" },
    ]);

    expect(sortedRowLabels(model, "ascending")).toEqual(["false", "true"]);
  });

  it("uses displayed text for an entire mixed-type column", () => {
    const model = createModel([
      { value: false, row: "boolean" },
      { value: "2", row: "string" },
      { value: 10, row: "number" },
    ]);

    expect(sortedRowLabels(model, "ascending")).toEqual([
      "number",
      "string",
      "boolean",
    ]);
  });

  it("keeps missing and empty values last while treating null as populated", () => {
    const model = createModel([
      { row: "missing" },
      { value: "", row: "empty" },
      { value: null, row: "null" },
      { value: "z", row: "z" },
    ]);

    expect(sortedRowLabels(model, "ascending")).toEqual([
      "null",
      "z",
      "missing",
      "empty",
    ]);
    expect(sortedRowLabels(model, "descending")).toEqual([
      "z",
      "null",
      "missing",
      "empty",
    ]);
  });

  it("returns original order when the column key no longer exists", () => {
    const model = createModel([
      { value: 2, row: "first" },
      { value: 1, row: "second" },
    ]);

    expect(getSortedRowIndices(model, "missing-column", "ascending")).toEqual([0, 1]);
  });
});
