import { describe, expect, it } from "vitest";
import { formatStack, parseDetails } from "./parse";

const exception = { id: "20350564", outerId: "0", severityLevel: "Error", type: "System.Exception", message: "Error\r\n\r\nDetails", parsedStack: [] };

describe("App Insights details parsing", () => {
  it("preserves exception order, numeric metadata, and message line breaks", () => {
    const items = [exception, { ...exception, id: 47047218, outerId: exception.id, severityLevel: 3 }];
    expect(parseDetails(JSON.stringify(items))).toEqual(items);
  });

  it("formats source locations and dynamic methods without invented signatures", () => {
    expect(formatStack([
      { method: "Funq.Container.ResolveImpl", fileName: "/src/Container.cs", line: 202 },
      { method: "lambda_method", line: 0 },
      { method: "ServiceEntry`2.InitializeInstance", fileName: "/src/ServiceEntry.Generic.cs", line: 0 },
      { method: "Program.Main(String[] args)", line: 7 },
    ])).toBe("   at Funq.Container.ResolveImpl in /src/Container.cs:line 202\n   at lambda_method\n   at ServiceEntry`2.InitializeInstance in /src/ServiceEntry.Generic.cs\n   at Program.Main(String[] args)");
  });

  it("accepts empty arrays and ignores assembly and level metadata", () => {
    expect(parseDetails("[]")).toEqual([]);
    expect(formatStack([])).toBe("");
    const [item] = parseDetails(JSON.stringify([{ ...exception, parsedStack: [{ method: "M", level: 0, assembly: "Assembly" }] }]));
    expect(formatStack(item.parsedStack)).toBe("   at M");
  });

  it.each([
    ["[", "Invalid JSON"],
    ["{}", "JSON array"],
    ["[null]", "Item 1"],
    [JSON.stringify([{ ...exception, id: null }]), "id must"],
    [JSON.stringify([{ ...exception, message: 7 }]), "message must"],
    [JSON.stringify([{ ...exception, parsedStack: {} }]), "parsedStack must"],
    [JSON.stringify([{ ...exception, parsedStack: [null] }]), "frame 1"],
    [JSON.stringify([{ ...exception, parsedStack: [{ method: "M", line: -1 }] }]), "line must"],
    [JSON.stringify([{ ...exception, parsedStack: [{ method: "M", fileName: 2 }] }]), "fileName must"],
  ])("rejects invalid input %s", (input, message) => {
    expect(() => parseDetails(input)).toThrow(message);
  });
});
