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

  it("unions heterogeneous keys, flattens leaf objects, and formats arrays", () => {
    const value: JsonValue = {
      records: [
        { name: "Ada", active: true, details: { role: "admin" } },
        "ignored",
        { count: 0, name: "Grace", tags: ["compiler", 1952], empty: null },
      ],
    };

    expect(createTableModel(value)).toEqual({
      columns: ["name", "active", "details.role", "count", "tags", "empty"],
      rows: [
        ["Ada", "true", "admin", "", "", ""],
        ["Grace", "", "", "0", '["compiler",1952]', "null"],
      ],
    });
  });

  it("implements specification example 4", () => {
    const value: JsonValue = {
      pagedResults: {
        results: [
          {
            id: 2081,
            multiLanguageContent: { title: "abcd" },
            owner: { id: 4988, userName: "190172" },
          },
          {
            id: 791,
            multiLanguageContent: { title: "efg" },
            owner: { id: 1040, userName: "204253" },
          },
        ],
      },
    };

    expect(createTableModel(value)).toEqual({
      columns: ["id", "multiLanguageContent.title", "owner.id", "owner.userName"],
      rows: [
        ["2081", "abcd", "4988", "190172"],
        ["791", "efg", "1040", "204253"],
      ],
    });
  });

  it("implements specification example 5 by drilling through a singleton array", () => {
    const value: JsonValue = {
      items: {
        "34": [
          {
            key: "idsrv",
            value: [
              { type: "nbf", value: "1785405758" },
              { type: "exp", value: "1785406058" },
            ],
          },
        ],
      },
    };

    expect(createTableModel(value)).toEqual({
      columns: ["type", "value"],
      rows: [
        ["nbf", "1785405758"],
        ["exp", "1785406058"],
      ],
    });
  });

  it("recursively drills through consecutive singleton object arrays", () => {
    const value: JsonValue = {
      outer: [{ middle: [{ inner: [{ id: 1 }, { id: 2 }] }] }],
    };

    expect(createTableModel(value)).toEqual({
      columns: ["id"],
      rows: [["1"], ["2"]],
    });
  });

  it("renders the deepest terminal singleton when no deeper array exists", () => {
    const value: JsonValue = {
      outer: [{ inner: [{ id: 7, name: "terminal" }] }],
    };

    expect(createTableModel(value)).toEqual({
      columns: ["id", "name"],
      rows: [["7", "terminal"]],
    });
  });

  it("keeps singleton drill-down inside the initially selected branch", () => {
    const value: JsonValue = {
      selected: [{ nested: [{ id: "selected" }] }],
      laterSibling: [{ id: "ignored-1" }, { id: "ignored-2" }],
    };

    expect(createTableModel(value)).toEqual({
      columns: ["id"],
      rows: [["selected"]],
    });
  });

  it("unions flattened child keys and leaves missing or null parents blank", () => {
    const value: JsonValue = {
      records: [
        { id: 1, owner: { id: 10, userName: "Ada" }, metadata: { reviewed: null } },
        { id: 2, owner: null, metadata: null },
        { id: 3, owner: { userName: "Grace" } },
        { id: 4 },
      ],
    };

    expect(createTableModel(value)).toEqual({
      columns: ["id", "owner.id", "owner.userName", "metadata.reviewed"],
      rows: [
        ["1", "10", "Ada", "null"],
        ["2", "", "", ""],
        ["3", "", "Grace", ""],
        ["4", "", "", ""],
      ],
    });
  });

  it("retains compact JSON for non-leaf, empty, array, and inconsistent columns", () => {
    const value: JsonValue = {
      records: [
        {
          nested: { profile: { name: "Ada" } },
          empty: {},
          list: [1, 2],
          inconsistent: { id: 1 },
        },
        {
          nested: { profile: { name: "Grace" } },
          empty: {},
          list: [3],
          inconsistent: "raw",
        },
      ],
    };

    expect(createTableModel(value)).toEqual({
      columns: ["nested", "empty", "list", "inconsistent"],
      rows: [
        ['{"profile":{"name":"Ada"}}', "{}", "[1,2]", '{"id":1}'],
        ['{"profile":{"name":"Grace"}}', "{}", "[3]", "raw"],
      ],
    });
  });

  it("keeps literal and derived dotted labels as separate columns", () => {
    const value: JsonValue = {
      records: [{ owner: { id: 1 }, "owner.id": "literal" }],
    };

    expect(createTableModel(value)).toEqual({
      columns: ["owner.id", "owner.id"],
      rows: [["1", "literal"]],
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
