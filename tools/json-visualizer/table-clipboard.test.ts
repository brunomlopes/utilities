import { describe, expect, it } from "vitest";
import type { TableModel } from "./table-model";
import { formatTableForClipboard } from "./table-clipboard";

describe("formatTableForClipboard", () => {
  it("formats headers and rendered rows as tab-separated values", () => {
    const model = {
      columns: ["name", "notes"],
      rows: [
        ["Second", "plain"],
        ["First", 'tab\there and "quoted"'],
      ],
    } as TableModel;

    expect(formatTableForClipboard(model, [1, 0])).toBe(
      'name\tnotes\nFirst\t"tab\there and ""quoted"""\nSecond\tplain',
    );
  });
});
