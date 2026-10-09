import { afterEach, describe, expect, it, vi } from "vitest";
import { copyOutput, toPlainText, toRichText, toWikiMarkup } from "./export";
import type { ExceptionDetails } from "./parse";

const item: ExceptionDetails = { id: "1", outerId: "0", severityLevel: "Error", type: "System.Exception", message: "First line\r\nSecond <line> & more", parsedStack: [{ method: "Example.Run", fileName: "C:\\src\\Example.cs", line: 12 }] };

afterEach(() => vi.unstubAllGlobals());

describe("Jira exports", () => {
  it("exports safe HTML tables with three rows, merged cells, and literal text", () => {
    const document = new DOMParser().parseFromString(toRichText([item, { ...item, message: '<img src=x onerror="alert(1)">', parsedStack: [] }]), "text/html");
    const tables = document.querySelectorAll("table");
    expect(tables).toHaveLength(2);
    expect(tables[0].rows).toHaveLength(3);
    expect(tables[0].rows[0].cells).toHaveLength(4);
    expect(tables[0].rows[1].cells[0].colSpan).toBe(4);
    expect(tables[0].rows[1].querySelector("br")).not.toBeNull();
    expect(tables[0].querySelector("pre")?.textContent).toBe("   at Example.Run in C:\\src\\Example.cs:line 12");
    expect(document.querySelector("img")).toBeNull();
    expect(tables[1].textContent).toContain('<img src=x onerror="alert(1)">');
    expect(tables[1].textContent).toContain("No stack frames available.");
  });

  it("exports wiki metadata and code blocks in exception order", () => {
    const output = toWikiMarkup([item, { ...item, id: "2" }]);
    expect(output).toContain("|*id*: 1|*outerId*: 0|*severityLevel*: Error|*type*: System.Exception|");
    expect(output).toContain("*message*\nFirst line\\\\ Second <line> & more");
    expect(output).toContain("{code:none}\n   at Example.Run in C:\\src\\Example.cs:line 12\n{code}");
    expect(output.indexOf("Exception 1")).toBeLessThan(output.indexOf("Exception 2"));
  });

  it("escapes wiki syntax in metadata/messages and isolates literal code delimiters", () => {
    const output = toWikiMarkup([{ ...item, id: "a|b", message: "[link] *bold* {code}", parsedStack: [{ method: "{code}" }] }]);
    expect(output).toContain("*id*: a\\|b");
    expect(output).toContain("\\[link\\] \\*bold\\* \\{code\\}");
    expect(output).toContain("{code:none}\n   at \n{code}\n\\{code\\}\n{code:none}");
  });

  it("provides a readable plain-text alternative", () => {
    expect(toPlainText([item])).toContain("message\nFirst line\r\nSecond <line> & more");
    expect(toPlainText([item])).toContain("parsedStack\n   at Example.Run");
  });

  it("writes wiki markup as plain text and rich text with both MIME types", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    const write = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText, write } });
    class TestClipboardItem {
      constructor(public data: Record<string, Blob>) {}
    }
    vi.stubGlobal("ClipboardItem", TestClipboardItem);
    await copyOutput([item], "wiki");
    expect(writeText).toHaveBeenCalledWith(toWikiMarkup([item]));
    await copyOutput([item], "rich");
    const copied = write.mock.calls[0][0][0] as TestClipboardItem;
    expect(copied.data["text/html"].type).toBe("text/html");
    expect(copied.data["text/plain"].type).toBe("text/plain");
    const readBlob = (blob: Blob) => new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.readAsText(blob);
    });
    expect(await readBlob(copied.data["text/html"])).toBe(toRichText([item]));
    expect(await readBlob(copied.data["text/plain"])).toBe(toPlainText([item]));
  });

  it("rejects unavailable or denied clipboard access", async () => {
    vi.stubGlobal("navigator", {});
    await expect(copyOutput([item], "rich")).rejects.toThrow("unavailable");
    await expect(copyOutput([item], "wiki")).rejects.toThrow("unavailable");
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    await expect(copyOutput([item], "wiki")).rejects.toThrow("Denied");
  });
});
