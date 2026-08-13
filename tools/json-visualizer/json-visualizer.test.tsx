import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonVisualizer } from "./json-visualizer";

describe("JsonVisualizer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  function update(json: string, filter: string) {
    fireEvent.change(screen.getByLabelText("Source JSON"), { target: { value: json } });
    fireEvent.change(screen.getByLabelText("Filter expression"), { target: { value: filter } });
  }

  function paste(text: string) {
    fireEvent.paste(screen.getByLabelText("Source JSON"), {
      clipboardData: { getData: () => text },
    });
  }

  function jsonFile(name: string, text: () => Promise<string>) {
    return { name, text } as File;
  }

  it("auto-formats valid pasted JSON and toggles the exact raw text", () => {
    render(<JsonVisualizer />);
    const raw = ' { "a": 1, "nested": [true, null] } ';

    paste(raw);

    expect(screen.getByLabelText("Source JSON")).toHaveValue(
      '{\n  "a": 1,\n  "nested": [\n    true,\n    null\n  ]\n}',
    );

    const toggle = screen.getByRole("button", { name: "Revert formatting" });
    fireEvent.click(toggle);
    expect(screen.getByLabelText("Source JSON")).toHaveValue(raw);

    fireEvent.click(screen.getByRole("button", { name: "Apply formatting" }));
    expect(screen.getByLabelText("Source JSON")).toHaveValue(
      '{\n  "a": 1,\n  "nested": [\n    true,\n    null\n  ]\n}',
    );
  });

  it("keeps invalid pasted JSON unchanged", () => {
    render(<JsonVisualizer />);

    paste(' { "a": } ');

    expect(screen.getByLabelText("Source JSON")).toHaveValue(' { "a": } ');
    expect(screen.getByRole("button", { name: "Apply formatting" })).toBeDisabled();
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByLabelText("Source JSON")).toHaveAttribute("aria-invalid", "true");
  });

  it("formats the complete value resulting from replacing a selection", () => {
    render(<JsonVisualizer />);
    const input = screen.getByLabelText<HTMLTextAreaElement>("Source JSON");
    fireEvent.change(input, { target: { value: '{"a":BROKEN}' } });
    input.setSelectionRange(5, 11);

    paste("1");

    expect(input).toHaveValue('{\n  "a": 1\n}');
  });

  it("disables the formatting toggle after a manual edit", () => {
    render(<JsonVisualizer />);
    paste('{"a":1}');

    fireEvent.change(screen.getByLabelText("Source JSON"), {
      target: { value: '{\n  "a": 2\n}' },
    });

    expect(screen.getByRole("button", { name: "Apply formatting" })).toBeDisabled();
    expect(screen.getByLabelText("Source JSON")).toHaveValue('{\n  "a": 2\n}');
  });

  it("opens the JSON file picker from the load button", () => {
    render(<JsonVisualizer />);
    const fileInput = screen.getByLabelText<HTMLInputElement>("JSON file");
    const click = vi.spyOn(fileInput, "click");

    fireEvent.click(screen.getByRole("button", { name: "Load JSON file" }));

    expect(click).toHaveBeenCalledOnce();
    expect(fileInput).toHaveAttribute("accept", ".json,application/json");
  });

  it("loads a JSON file as the source and evaluates it", async () => {
    render(<JsonVisualizer />);
    const raw = '{ "a": 1, "b": 2 }';
    const file = jsonFile("example.json", vi.fn().mockResolvedValue(raw));

    await act(async () => {
      fireEvent.change(screen.getByLabelText("JSON file"), { target: { files: [file] } });
      await Promise.resolve();
    });

    expect(screen.getByLabelText("Source JSON")).toHaveValue(raw);
    expect(screen.getByText("Loaded example.json.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Filter expression"), { target: { value: "a" } });
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue('{ "a": 1 }');
  });

  it("clears stale paste formatting when a file is loaded", async () => {
    render(<JsonVisualizer />);
    paste('{"old":true}');
    expect(screen.getByRole("button", { name: "Revert formatting" })).toBeEnabled();

    const file = jsonFile("replacement.json", vi.fn().mockResolvedValue('{"new":true}'));
    await act(async () => {
      fireEvent.change(screen.getByLabelText("JSON file"), { target: { files: [file] } });
      await Promise.resolve();
    });

    expect(screen.getByLabelText("Source JSON")).toHaveValue('{"new":true}');
    expect(screen.getByRole("button", { name: "Apply formatting" })).toBeDisabled();
  });

  it("announces file read failures without replacing the source", async () => {
    render(<JsonVisualizer />);
    fireEvent.change(screen.getByLabelText("Source JSON"), {
      target: { value: '{"existing":true}' },
    });
    const file = jsonFile("broken.json", vi.fn().mockRejectedValue(new Error("read failed")));

    await act(async () => {
      fireEvent.change(screen.getByLabelText("JSON file"), { target: { files: [file] } });
      await Promise.resolve();
    });

    expect(screen.getByLabelText("Source JSON")).toHaveValue('{"existing":true}');
    expect(screen.getByText("Could not load broken.json.")).toHaveClass("error-message");
  });

  it("uses a one-row textarea and throttles filter height measurements", () => {
    render(<JsonVisualizer />);
    const filterInput = screen.getByLabelText<HTMLTextAreaElement>("Filter expression");
    let scrollHeight = 44;
    const readScrollHeight = vi.fn(() => scrollHeight);

    Object.defineProperty(filterInput, "scrollHeight", {
      configurable: true,
      get: readScrollHeight,
    });

    expect(filterInput.tagName).toBe("TEXTAREA");
    expect(filterInput.rows).toBe(1);

    fireEvent.change(filterInput, { target: { value: "a" } });
    expect(filterInput.style.height).toBe("44px");
    expect(readScrollHeight).toHaveBeenCalledTimes(1);

    scrollHeight = 88;
    fireEvent.change(filterInput, { target: { value: "a,b" } });
    fireEvent.change(filterInput, { target: { value: "a,b,c" } });
    expect(readScrollHeight).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(249));
    expect(readScrollHeight).toHaveBeenCalledTimes(1);

    act(() => vi.advanceTimersByTime(1));
    expect(filterInput.style.height).toBe("88px");
    expect(readScrollHeight).toHaveBeenCalledTimes(2);

    scrollHeight = 44;
    fireEvent.change(filterInput, { target: { value: "a" } });
    act(() => vi.advanceTimersByTime(250));
    expect(filterInput.style.height).toBe("44px");
    expect(readScrollHeight).toHaveBeenCalledTimes(3);
  });

  it("throttles viewport-driven filter resizing", () => {
    render(<JsonVisualizer />);
    const filterInput = screen.getByLabelText<HTMLTextAreaElement>("Filter expression");
    let scrollHeight = 44;
    const readScrollHeight = vi.fn(() => scrollHeight);

    Object.defineProperty(filterInput, "scrollHeight", {
      configurable: true,
      get: readScrollHeight,
    });

    fireEvent.change(filterInput, { target: { value: "a" } });
    scrollHeight = 72;
    fireEvent.resize(window);
    fireEvent.resize(window);

    expect(readScrollHeight).toHaveBeenCalledTimes(1);
    act(() => vi.advanceTimersByTime(250));
    expect(filterInput.style.height).toBe("72px");
    expect(readScrollHeight).toHaveBeenCalledTimes(2);
  });

  it("continues to evaluate multiline filter expressions", () => {
    render(<JsonVisualizer />);
    update('{"a":1,"b":2,"c":3}', "a,\nb");

    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue(
      '{\n  "a": 1,\n  "b": 2\n}',
    );
  });

  it("updates the read-only output after the debounce", () => {
    render(<JsonVisualizer />);
    update('{"a":1,"b":2}', "a");

    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue("");
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue('{ "a": 1 }');
    expect(screen.getByLabelText("Filtered JSON output")).toHaveAttribute("readonly");
  });

  it("shows Tree by default and exposes accessible output tabs", () => {
    render(<JsonVisualizer />);

    const treeTab = screen.getByRole("tab", { name: "Tree" });
    const tableTab = screen.getByRole("tab", { name: "Table" });

    expect(treeTab).toHaveAttribute("aria-selected", "true");
    expect(treeTab).toHaveAttribute("tabindex", "0");
    expect(tableTab).toHaveAttribute("aria-selected", "false");
    expect(tableTab).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("tabpanel", { name: "Tree" })).toBeVisible();
    expect(screen.queryByRole("tabpanel", { name: "Table" })).not.toBeInTheDocument();
  });

  it("renders specification example 3 as a table", () => {
    render(<JsonVisualizer />);
    update(
      JSON.stringify({
        pagedResults: {
          results: [
            { a: 1, b: 2 },
            { a: 1, b: 42 },
          ],
          totalCount: 42,
          currentPage: 27,
        },
      }),
      "results[a,b]",
    );
    act(() => vi.advanceTimersByTime(250));

    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    expect(screen.getByRole("tab", { name: "Table" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "a",
      "b",
    ]);
    expect(
      screen.getAllByRole("row").map((row) =>
        Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent),
      ),
    ).toEqual([
      ["a", "b"],
      ["1", "2"],
      ["1", "42"],
    ]);
  });

  it("cycles a column through ascending, descending, and original order", () => {
    render(<JsonVisualizer />);
    update(
      JSON.stringify({ records: [{ score: 10 }, { score: 2 }, { score: 7 }] }),
      "",
    );
    act(() => vi.advanceTimersByTime(250));
    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    const sortButton = screen.getByRole("button", { name: "score" });
    const header = screen.getByRole("columnheader", { name: "score" });
    const values = () =>
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.querySelector("td")?.textContent);

    expect(sortButton.tagName).toBe("BUTTON");
    expect(header).toHaveAttribute("aria-sort", "none");
    expect(values()).toEqual(["10", "2", "7"]);

    sortButton.focus();
    fireEvent.click(sortButton);
    expect(sortButton).toHaveFocus();
    expect(header).toHaveAttribute("aria-sort", "ascending");
    expect(header).toHaveTextContent("↑");
    expect(values()).toEqual(["2", "7", "10"]);

    fireEvent.click(sortButton);
    expect(header).toHaveAttribute("aria-sort", "descending");
    expect(header).toHaveTextContent("↓");
    expect(values()).toEqual(["10", "7", "2"]);

    fireEvent.click(sortButton);
    expect(header).toHaveAttribute("aria-sort", "none");
    expect(header).not.toHaveTextContent("↑");
    expect(header).not.toHaveTextContent("↓");
    expect(values()).toEqual(["10", "2", "7"]);
  });

  it("keeps only one sorted column active", () => {
    render(<JsonVisualizer />);
    update(
      JSON.stringify({
        records: [
          { name: "Beta", score: 1 },
          { name: "alpha", score: 2 },
        ],
      }),
      "",
    );
    act(() => vi.advanceTimersByTime(250));
    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    fireEvent.click(screen.getByRole("button", { name: "name" }));
    expect(screen.getByRole("columnheader", { name: "name" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );

    fireEvent.click(screen.getByRole("button", { name: "score" }));
    expect(screen.getByRole("columnheader", { name: "name" })).toHaveAttribute(
      "aria-sort",
      "none",
    );
    expect(screen.getByRole("columnheader", { name: "score" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("preserves a sort across evaluation while its column exists and resets it otherwise", () => {
    render(<JsonVisualizer />);
    update(JSON.stringify({ records: [{ name: "Beta" }, { name: "alpha" }] }), "");
    act(() => vi.advanceTimersByTime(250));
    fireEvent.click(screen.getByRole("tab", { name: "Table" }));
    fireEvent.click(screen.getByRole("button", { name: "name" }));

    update(JSON.stringify({ records: [{ name: "delta" }, { name: "Charlie" }] }), "");
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("columnheader", { name: "name" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.querySelector("td")?.textContent),
    ).toEqual(["Charlie", "delta"]);

    update(JSON.stringify({ records: [{ id: 2 }, { id: 1 }] }), "");
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("columnheader", { name: "id" })).toHaveAttribute(
      "aria-sort",
      "none",
    );

    update(JSON.stringify({ records: [{ name: "Zulu" }, { name: "Echo" }] }), "");
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("columnheader", { name: "name" })).toHaveAttribute(
      "aria-sort",
      "none",
    );
    expect(
      screen
        .getAllByRole("row")
        .slice(1)
        .map((row) => row.querySelector("td")?.textContent),
    ).toEqual(["Zulu", "Echo"]);
  });

  it("renders specification example 4 with flattened object columns", () => {
    render(<JsonVisualizer />);
    update(
      JSON.stringify({
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
      }),
      "",
    );
    act(() => vi.advanceTimersByTime(250));

    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "id",
      "multiLanguageContent.title",
      "owner.id",
      "owner.userName",
    ]);
    expect(
      screen.getAllByRole("row").map((row) =>
        Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent),
      ),
    ).toEqual([
      ["id", "multiLanguageContent.title", "owner.id", "owner.userName"],
      ["2081", "abcd", "4988", "190172"],
      ["791", "efg", "1040", "204253"],
    ]);
  });

  it("renders specification example 5 by drilling through a singleton array", () => {
    render(<JsonVisualizer />);
    update(
      JSON.stringify({
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
      }),
      "",
    );
    act(() => vi.advanceTimersByTime(250));

    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    expect(screen.getAllByRole("columnheader").map((header) => header.textContent)).toEqual([
      "type",
      "value",
    ]);
    expect(
      screen.getAllByRole("row").map((row) =>
        Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent),
      ),
    ).toEqual([
      ["type", "value"],
      ["nbf", "1785405758"],
      ["exp", "1785406058"],
    ]);
  });

  it("supports keyboard tab navigation and retains the selected view after evaluation", () => {
    render(<JsonVisualizer />);
    const treeTab = screen.getByRole("tab", { name: "Tree" });

    fireEvent.keyDown(treeTab, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Table" })).toHaveFocus();
    expect(screen.getByRole("tab", { name: "Table" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    update('{"records":[{"id":1}]}', "records[id]");
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByRole("tabpanel", { name: "Table" })).toBeVisible();

    fireEvent.keyDown(screen.getByRole("tab", { name: "Table" }), { key: "Home" });
    expect(treeTab).toHaveFocus();
    expect(treeTab).toHaveAttribute("aria-selected", "true");
  });

  it.each([
    ["a primitive-only result", '{"values":[1,2,3]}'],
    ["a root array", '[{"id":1}]'],
    ["a scalar root", '"text"'],
  ])("shows the table empty state for %s", (_description, json) => {
    render(<JsonVisualizer />);
    update(json, "");
    act(() => vi.advanceTimersByTime(250));

    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    expect(
      screen.getByText("No object array is available in the filtered output."),
    ).toBeVisible();
  });

  it("enables compact output by default and can restore standard pretty-printing", () => {
    render(<JsonVisualizer />);
    update('{"a":1}', "");
    act(() => vi.advanceTimersByTime(250));

    const compactToggle = screen.getByRole("checkbox", { name: "Compact output" });
    expect(compactToggle).toBeChecked();
    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue('{ "a": 1 }');

    fireEvent.click(compactToggle);
    expect(compactToggle).not.toBeChecked();
    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue('{\n  "a": 1\n}');
  });

  it("reformats compact output when the output control width changes", () => {
    let resizeCallback: ResizeObserverCallback = () => undefined;
    let outputWidth = 500;
    const originalClientWidth = Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "clientWidth",
    );

    class ResizeObserverStub {
      constructor(callback: ResizeObserverCallback) {
        resizeCallback = callback;
      }

      observe() {}
      disconnect() {}
      unobserve() {}
    }

    vi.stubGlobal("ResizeObserver", ResizeObserverStub);
    Object.defineProperty(HTMLTextAreaElement.prototype, "clientWidth", {
      configurable: true,
      get: () => outputWidth,
    });

    try {
      render(<JsonVisualizer />);
      update('{"wrapper":{"value":"short"}}', "");
      act(() => vi.advanceTimersByTime(250));
      expect(screen.getByLabelText("Filtered JSON output")).toHaveValue(
        '{ "wrapper": { "value": "short" } }',
      );

      outputWidth = 120;
      act(() => resizeCallback([], {} as ResizeObserver));
      expect(screen.getByLabelText("Filtered JSON output")).toHaveValue(`{
  "wrapper": {
    "value": "short"
  }
}`);
    } finally {
      if (originalClientWidth) {
        Object.defineProperty(
          HTMLTextAreaElement.prototype,
          "clientWidth",
          originalClientWidth,
        );
      } else {
        delete (HTMLTextAreaElement.prototype as { clientWidth?: number }).clientWidth;
      }
    }
  });

  it("shows field errors and clears the output", () => {
    render(<JsonVisualizer />);
    update("not json", "a[");
    act(() => vi.advanceTimersByTime(250));

    expect(screen.getByLabelText("Source JSON")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Filter expression")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue("");
  });

  it("copies output and announces success", async () => {
    render(<JsonVisualizer />);
    update('{"a":1}', "a");
    act(() => vi.advanceTimersByTime(250));

    await act(async () => screen.getByRole("button", { name: "Copy JSON" }).click());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{ "a": 1 }');
    expect(screen.getByText("Copied to clipboard.")).toBeInTheDocument();
  });
});
