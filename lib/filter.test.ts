import { describe, expect, it } from "vitest";
import { FilterSyntaxError, filterJson, parseFilter, type JsonValue } from "./filter";

const example: JsonValue = {
  sjaiodf: [
    { a: 42, k: [1, 2] },
    { b: 27 },
  ],
  basfsdf: "jas sadf s",
  z: { b: 1, c: 8 },
};

describe("parseFilter", () => {
  it("parses mixed plain and bracket clauses", () => {
    expect(parseFilter(' a, z[b, c], "x,y"["c[d]", Name] ')).toEqual([
      { type: "plain", name: "a" },
      { type: "bracket", name: "z", children: ["b", "c"] },
      { type: "bracket", name: "x,y", children: ["c[d]", "Name"] },
    ]);
  });

  it("supports JSON escapes and quoted empty property names", () => {
    expect(parseFilter('"line\\nname", root[""]')).toEqual([
      { type: "plain", name: "line\nname" },
      { type: "bracket", name: "root", children: [""] },
    ]);
  });

  it.each(["a,", "a[]", "a[b,]", "a[b", "a[[b]]", '"open', 'a"b']) (
    "rejects malformed expression %s",
    (expression) => expect(() => parseFilter(expression)).toThrow(FilterSyntaxError),
  );
});

describe("filterJson", () => {
  it("implements the plain selector example", () => {
    expect(filterJson(example, parseFilter("a,b")).value).toEqual({
      sjaiodf: [{ a: 42 }, { b: 27 }],
      z: { b: 1 },
    });
  });

  it("implements the bracket selector example", () => {
    expect(filterJson(example, parseFilter("z[b]")).value).toEqual({ z: { b: 1 } });
  });

  it("matches case-insensitively while preserving keys and complete values", () => {
    const input: JsonValue = { Wrapper: { NAME: { nested: [1, 2] }, other: true } };
    expect(filterJson(input, parseFilter("name")).value).toEqual({
      Wrapper: { NAME: { nested: [1, 2] } },
    });
  });

  it("unions mixed and duplicate bracket clauses", () => {
    const input: JsonValue = { outer: { Meta: { First: 1, second: 2, third: 3 } } };
    expect(filterJson(input, parseFilter("meta[first],META[second],third")).value).toEqual({
      outer: { Meta: { First: 1, second: 2, third: 3 } },
    });
  });

  it("applies bracket children only to direct object properties", () => {
    const input: JsonValue = {
      x: { nested: { a: 1 }, a: { complete: true } },
      arrayParent: [{ a: 2 }],
    };
    expect(filterJson(input, parseFilter("x[a],arrayParent[a]")).value).toEqual({
      x: { a: { complete: true } },
    });
  });

  it("keeps matching array elements in order and removes the rest", () => {
    const input: JsonValue = [{ a: 1 }, { no: 2 }, [{ A: 3 }, 4], 5];
    expect(filterJson(input, parseFilter("a")).value).toEqual([{ a: 1 }, [{ A: 3 }]]);
  });

  it("returns root-shaped values when there are no matches", () => {
    expect(filterJson({ a: 1 }, parseFilter("missing"))).toEqual({ matched: false, value: {} });
    expect(filterJson([1, 2], parseFilter("missing"))).toEqual({ matched: false, value: [] });
    expect(filterJson("text", parseFilter("missing"))).toEqual({ matched: false, value: null });
  });

  it("returns the original value for an empty filter", () => {
    expect(filterJson(example, parseFilter("   "))).toEqual({ matched: true, value: example });
  });
});
