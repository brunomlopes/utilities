import { describe, expect, it } from "vitest";
import {
  convertCell,
  convertTabSeparatedText,
  getConversionCultures,
  parsePreferences,
} from "./conversion";

describe("convertCell", () => {
  it("converts English and Portuguese decimals without losing precision", () => {
    expect(convertCell("001,234.5000", "en", "pt")).toBe("001234,5000");
    expect(convertCell("001.234,5000", "pt", "en")).toBe("001234.5000");
  });

  it("accepts common space characters as thousands separators", () => {
    expect(convertCell("1 234 567.8900", "en", "pt")).toBe("1234567,8900");
    expect(convertCell("-1\u00a0234\u00a0567,8900", "pt", "en")).toBe("-1234567.8900");
    expect(convertCell("+1\u202f234\u202f567,8900", "pt", "en")).toBe("+1234567.8900");
  });

  it("supports currencies around space-grouped numbers", () => {
    expect(convertCell(" € 1 234,50 ", "pt", "en")).toBe("1234.50");
    expect(convertCell("$-1\u00a0234.50", "en", "pt")).toBe("-1234,50");
  });

  it("preserves signs and supports decimals without a leading zero", () => {
    expect(convertCell("-12.50", "en", "pt")).toBe("-12,50");
    expect(convertCell("+,75", "pt", "en")).toBe("+.75");
  });

  it("removes surrounding currency symbols only from valid numbers", () => {
    expect(convertCell(" € 1.234,50 ", "pt", "en")).toBe("1234.50");
    expect(convertCell("$12,34", "en", "pt")).toBe("$12,34");
    expect(convertCell("Budget € forecast", "pt", "en")).toBe("Budget € forecast");
  });

  it("treats dash placeholders with optional currency symbols as zero", () => {
    expect(convertCell("-", "en", "pt")).toBe("0");
    expect(convertCell(" - ", "pt", "en")).toBe("0");
    expect(convertCell("$-", "en", "pt")).toBe("0");
    expect(convertCell("€ -", "pt", "en")).toBe("0");
    expect(convertCell("- £", "en", "pt")).toBe("0");
  });

  it("leaves unsupported or malformed values unchanged", () => {
    for (const value of [
      "1e3",
      "25%",
      "(1,000.00)",
      "1,23",
      "1 23.45",
      "1  234.56",
      "1 234 56.78",
      "1 234,567.89",
      "1 234.5 6",
      "forecast 1 234",
      "=SUM(A1:A2)",
      "not-available",
    ]) {
      expect(convertCell(value, "en", "pt")).toBe(value);
    }
    expect(convertCell("-1", "en", "pt")).toBe("-1");
  });
});

describe("convertTabSeparatedText", () => {
  it("preserves tabs, newlines, empty cells, and text", () => {
    const input = "Name\tAmount\t\r\nAlpha\t$1,200.50\tnote\nBeta\t-2.000,75\t";
    expect(convertTabSeparatedText(input, "en", "pt")).toBe(
      "Name\tAmount\t\r\nAlpha\t1200,50\tnote\nBeta\t-2.000,75\t",
    );
  });

  it("treats every tab and line break as a delimiter", () => {
    expect(convertTabSeparatedText('"1\t2"\n3.5', "en", "pt")).toBe('"1\t2"\n3,5');
  });

  it("converts dash placeholders without changing the TSV structure", () => {
    expect(convertTabSeparatedText("-\t$-\t\n€ -\t- £\tlabel", "en", "pt")).toBe(
      "0\t0\t\n0\t0\tlabel",
    );
  });

  it("converts space-grouped numbers without changing the TSV structure", () => {
    const input = "Name\tAmount\r\nAlpha\t1 234.50\nBeta\t€ 2\u202f345,75";
    expect(convertTabSeparatedText(input, "en", "pt")).toBe(
      "Name\tAmount\r\nAlpha\t1234,50\nBeta\t€ 2\u202f345,75",
    );
    expect(convertTabSeparatedText(input, "pt", "en")).toBe(
      "Name\tAmount\r\nAlpha\t1 234.50\nBeta\t2345.75",
    );
  });
});

describe("preferences", () => {
  it("validates stored preferences", () => {
    expect(
      parsePreferences(
        JSON.stringify({
          direction: "sheets-to-excel",
          excelCulture: "pt",
          sheetsCulture: "en",
        }),
      ),
    ).toEqual({ direction: "sheets-to-excel", excelCulture: "pt", sheetsCulture: "en" });
    expect(parsePreferences("not json")).toBeNull();
    expect(parsePreferences('{"direction":"sideways"}')).toBeNull();
  });

  it("uses direction to select source and target cultures", () => {
    expect(
      getConversionCultures({
        direction: "sheets-to-excel",
        excelCulture: "pt",
        sheetsCulture: "en",
      }),
    ).toEqual({ sourceCulture: "en", targetCulture: "pt" });
  });
});
