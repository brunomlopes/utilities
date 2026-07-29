import { describe, expect, it } from "vitest";
import type { JsonValue } from "./filter";
import { createTableModel } from "./table-model";

describe("createTableModel", () => {
  it("builds the table from specification example 3", () => {
    const value: JsonValue = {
      pagedResults: {
        results: [
          { a: 1, b: 2 },
          { a: 1, b: 42 },
        ],
        totalCount: 42,
        currentPage: 27,
      },
    };

    expect(createTableModel(value)).toEqual({
      columns: ["a", "b"],
      rows: [
        ["1", "2"],
        ["1", "42"],
      ],
    });
  });

  it("selects arrays breadth-first and respects property insertion order", () => {
    const value: JsonValue = {
      firstBranch: { nested: { earlierDepthFirst: [{ wrong: true }] } },
      laterBranch: { breadthFirst: [{ right: true }] },
      firstAtSameDepth: [{ selected: 1 }],
      secondAtSameDepth: [{ ignored: 2 }],
    };

    expect(createTableModel(value)).toEqual({
      columns: ["selected"],
      rows: [["1"]],
    });
  });

  it("skips primitive-only arrays and selects a later object array", () => {
    const value: JsonValue = {
      primitiveValues: [1, "two", null],
      nested: { records: [{ id: 7 }] },
    };

    expect(createTableModel(value)).toEqual({
      columns: ["id"],
      rows: [["7"]],
    });
  });

  it("unions heterogeneous keys and formats nested values", () => {
    const value: JsonValue = {
      records: [
        { name: "Ada", active: true, details: { role: "admin" } },
        "ignored",
        { count: 0, name: "Grace", tags: ["compiler", 1952], empty: null },
      ],
    };

    expect(createTableModel(value)).toEqual({
      columns: ["name", "active", "details", "count", "tags", "empty"],
      rows: [
        ["Ada", "true", '{"role":"admin"}', "", "", ""],
        ["Grace", "", "", "0", '["compiler",1952]', "null"],
      ],
    });
  });

  it.each<JsonValue>([
    { primitiveValues: [1, 2, 3] },
    [],
    [{ id: 1 }],
    "text",
    42,
    null,
  ])("returns no table when no eligible array property exists", (value) => {
    expect(createTableModel(value)).toBeNull();
  });
});
