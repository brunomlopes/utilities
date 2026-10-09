import { describe, expect, it } from "vitest";
import { exceptionDepths, exceptionLabels } from "./hierarchy";
import type { ExceptionDetails } from "./parse";

function items(links: [string | number, string | number][]): ExceptionDetails[] {
  return links.map(([id, outerId]) => ({ id, outerId, severityLevel: "Error", type: "Exception", message: "", parsedStack: [] }));
}

describe("exception nesting", () => {
  it("labels parents by exception number, matching numeric IDs and omitting unresolved parents", () => {
    expect(exceptionLabels(items([[20350564, 0], [47047218, "20350564"], ["orphan", "missing"]]))).toEqual([
      "Exception 1", "Exception 2 (outer: Exception 1)", "Exception 3",
    ]);
    expect(exceptionLabels(items([["a", "0"], ["a", "0"], ["b", "a"]]))).toEqual(["Exception 1", "Exception 2", "Exception 3"]);
  });
  it("follows parents with siblings and multiple roots, regardless of array order", () => {
    expect(exceptionDepths(items([["c", "b"], ["a", "0"], ["b", "a"], ["d", "a"], ["e", "0"]]))).toEqual([2, 0, 1, 1, 0]);
  });
  it("matches numeric and string IDs and treats zero as a root marker", () => {
    expect(exceptionDepths(items([[1, 0], ["2", "1"], [0, "2"]]))).toEqual([0, 1, 2]);
  });
  it("treats missing or ambiguous parents as roots", () => {
    expect(exceptionDepths(items([["a", "missing"], ["b", "a"], ["x", "0"], ["x", "0"], ["y", "x"]]))).toEqual([0, 1, 0, 0, 0]);
  });
  it("handles self references and cycles without hanging", () => {
    expect(exceptionDepths(items([["child", "a"], ["a", "b"], ["b", "a"], ["self", "self"]]))).toEqual([1, 0, 0, 0]);
  });
  it("supports deep chains without recursive stack overflow", () => {
    const chain = items(Array.from({ length: 12000 }, (_, index) => [index + 1, index]));
    expect(exceptionDepths(chain.reverse())[0]).toBe(11999);
    expect(exceptionDepths([])).toEqual([]);
  });
});
