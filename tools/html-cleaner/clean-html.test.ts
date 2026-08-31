import { describe, expect, it } from "vitest";
import { cleanHtml, parseExcludedAttributes } from "./clean-html";

describe("parseExcludedAttributes", () => {
  it("trims, normalizes, removes blanks, and deduplicates names", () => {
    expect(parseExcludedAttributes(" style, CLASS, ,style,data-ID ")).toEqual([
      "style",
      "class",
      "data-id",
    ]);
  });
});

describe("cleanHtml", () => {
  it("removes every matching attribute from an HTML fragment", () => {
    const html = '<section class="card" style="color:red"><p class="copy" id="intro">Hi</p></section>';

    expect(cleanHtml(html, "style,class")).toBe(
      '<section><p id="intro">Hi</p></section>',
    );
  });

  it("matches HTML attribute names case-insensitively", () => {
    expect(cleanHtml('<div DATA-ID="42" title="Answer"></div>', "data-ID")).toBe(
      '<div title="Answer"></div>',
    );
  });

  it("returns the original input when the filter is empty", () => {
    const html = "  <p class='lead'>Hello</p>\n";
    expect(cleanHtml(html, " , ")).toBe(html);
  });

  it("handles complete documents without adding a wrapper", () => {
    const output = cleanHtml(
      '<!doctype html><html class="root"><head><title>Test</title></head><body style="margin:0">Hi</body></html>',
      "class,style",
    );

    expect(output).toBe(
      "<!DOCTYPE html>\n<html><head><title>Test</title></head><body>Hi</body></html>",
    );
  });
});
