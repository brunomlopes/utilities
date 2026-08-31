import { describe, expect, it } from "vitest";
import { formatHtml } from "./format-html";

describe("formatHtml", () => {
  it("formats nested HTML using four spaces per level", () => {
    expect(formatHtml("<main><section><h1>Title</h1><p>Copy</p></section></main>")).toBe(
      [
        "<main>",
        "    <section>",
        "        <h1>Title</h1>",
        "        <p>Copy</p>",
        "    </section>",
        "</main>",
      ].join("\n"),
    );
  });

  it("keeps inline text and elements together", () => {
    expect(formatHtml("<p>Hello <strong>brave</strong> world.</p>")).toBe(
      "<p>Hello <strong>brave</strong> world.</p>",
    );
  });

  it("collapses ordinary whitespace while preserving inline word boundaries", () => {
    expect(
      formatHtml(
        [
          "<div>",
          "    Hello      <strong>world</strong> !",
          "",
          "    <p>  A   short   paragraph.  </p>",
          "</div>",
        ].join("\n"),
      ),
    ).toBe(
      [
        "<div>",
        "    Hello <strong>world</strong> !",
        "    <p>A short paragraph.</p>",
        "</div>",
      ].join("\n"),
    );
  });

  it("moves meaningful whitespace outside inline tags", () => {
    expect(formatHtml("<p>Hello<strong>   world   </strong>again</p>")).toBe(
      "<p>Hello <strong>world</strong> again</p>",
    );
  });

  it("does not collapse non-breaking spaces", () => {
    expect(formatHtml("<p>Hello&nbsp;&nbsp;world</p>")).toBe("<p>Hello  world</p>");
  });

  it("preserves greater-than signs inside attributes", () => {
    expect(formatHtml('<div data-comparison="a>b"><p>Content</p></div>')).toBe(
      '<div data-comparison="a>b">\n    <p>Content</p>\n</div>',
    );
  });

  it.each([
    ["pre", "  first\n    second"],
    ["textarea", "first\n  second"],
    ["script", "if (ready) {\n  run();\n}"],
    ["style", ".card {\n  color: red;\n}"],
  ])("preserves whitespace inside <%s>", (tagName, content) => {
    const html = `<main><${tagName}>${content}</${tagName}></main>`;
    const output = formatHtml(html);

    expect(output).toContain(`<${tagName}>${content}</${tagName}>`);
  });

  it("formats complete documents and keeps the doctype", () => {
    expect(
      formatHtml(
        "<!DOCTYPE html><html><head><title>Test</title></head><body><main>Content</main></body></html>",
      ),
    ).toBe(
      [
        "<!DOCTYPE html>",
        "<html>",
        "    <head>",
        "        <title>Test</title>",
        "    </head>",
        "    <body>",
        "        <main>Content</main>",
        "    </body>",
        "</html>",
      ].join("\n"),
    );
  });
});
