import { describe, expect, it } from "vitest";
import { cleanHtml, HtmlFilterSyntaxError, parseHtmlFilter } from "./clean-html";

describe("parseHtmlFilter", () => {
  it("parses bare and wrapped tag removals", () => {
    const filter = parseHtmlFilter("meta, <table>");

    expect([...filter.removedTags]).toEqual(["meta", "table"]);
    expect(filter.attributesByTag.size).toBe(0);
  });

  it("parses tag-specific and wildcard attribute removals", () => {
    const filter = parseHtmlFilter("<table style,class>, <* data-id,aria-label>");

    expect([...filter.attributesByTag.get("table")!]).toEqual(["style", "class"]);
    expect([...filter.attributesByTag.get("*")!]).toEqual(["data-id", "aria-label"]);
  });

  it.each([
    ["<table style,class", "missing its closing"],
    ["meta,,table", "empty entries"],
    ["<table style,>", "valid attribute name"],
    ["table style", "valid tag expression"],
    ["*", "only be used"],
  ])("rejects invalid filter %s", (filterText, expectedMessage) => {
    expect(() => parseHtmlFilter(filterText)).toThrow(expectedMessage);
  });
});

describe("cleanHtml", () => {
  it("removes matching nodes and moves their children to the parent", () => {
    const html = '<main><meta charset="utf-8"><table><tbody><tr><td>Kept</td></tr></tbody></table></main>';

    expect(cleanHtml(html, "meta,table")).toBe(
      "<main><tbody><tr><td>Kept</td></tr></tbody></main>",
    );
  });

  it("accepts wrapped tag names for node removal", () => {
    expect(cleanHtml("<div><strong>Important</strong></div>", "<div>")).toBe(
      "<strong>Important</strong>",
    );
  });

  it("removes attributes only from the configured tag", () => {
    const html = '<table class="grid" style="width:100%"><tr class="row"><td>Cell</td></tr></table>';

    expect(cleanHtml(html, "<table style,class>")).toBe(
      '<table><tbody><tr class="row"><td>Cell</td></tr></tbody></table>',
    );
  });

  it("removes wildcard attributes from every node", () => {
    const html = '<section class="panel"><p style="color:red" class="copy">Hello</p></section>';

    expect(cleanHtml(html, "<* style,class>")).toBe("<section><p>Hello</p></section>");
  });

  it("combines node and attribute filters", () => {
    const html = '<main><meta name="theme"><table style="width:100%" class="grid"><tr><td>Cell</td></tr></table></main>';

    expect(cleanHtml(html, "meta,<table style,class>")).toBe(
      "<main><table><tbody><tr><td>Cell</td></tr></tbody></table></main>",
    );
  });

  it("matches tag and attribute names case-insensitively", () => {
    expect(cleanHtml('<DIV DATA-ID="42"><SPAN>Answer</SPAN></DIV>', "span,<div data-ID>")).toBe(
      "<div>Answer</div>",
    );
  });

  it("returns the original input when the filter is empty", () => {
    const html = "  <p class='lead'>Hello</p>\n";
    expect(cleanHtml(html, "")).toBe(html);
  });

  it("unwraps the root element of a complete document", () => {
    expect(
      cleanHtml(
        "<!doctype html><html><head><title>Test</title></head><body><main>Content</main></body></html>",
        "html,head,body",
      ),
    ).toBe("<!DOCTYPE html>\n<title>Test</title><main>Content</main>");
  });

  it("rejects an invalid filter without partially cleaning the HTML", () => {
    expect(() => cleanHtml('<p class="copy">Hello</p>', "p,<* class")).toThrow(
      HtmlFilterSyntaxError,
    );
  });
});
