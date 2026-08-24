import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JsonVisualizer } from "./json-visualizer";

describe("JsonVisualizer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(""),
        writeText: vi.fn().mockResolvedValue(undefined),
      },
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

  it("replaces the source with formatted clipboard content", async () => {
    vi.mocked(navigator.clipboard.readText).mockResolvedValue(' { "from": "clipboard" } ');
    render(<JsonVisualizer />);
    fireEvent.change(screen.getByLabelText("Source JSON"), {
      target: { value: '{"existing":true}' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Paste content" }));
      await Promise.resolve();
    });

    expect(navigator.clipboard.readText).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Source JSON")).toHaveValue(
      '{\n  "from": "clipboard"\n}',
    );
    expect(screen.getByRole("button", { name: "Revert formatting" })).toBeEnabled();
    expect(screen.getByText("Pasted clipboard content.")).toBeInTheDocument();
  });

  it("replaces the source with invalid clipboard content without formatting it", async () => {
    vi.mocked(navigator.clipboard.readText).mockResolvedValue("not json");
    render(<JsonVisualizer />);

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Paste content" }));
      await Promise.resolve();
    });

    expect(screen.getByLabelText("Source JSON")).toHaveValue("not json");
    expect(screen.getByRole("button", { name: "Apply formatting" })).toBeDisabled();
  });

  it("announces clipboard failures without replacing the source", async () => {
    vi.mocked(navigator.clipboard.readText).mockRejectedValue(new Error("denied"));
    render(<JsonVisualizer />);
    fireEvent.change(screen.getByLabelText("Source JSON"), {
      target: { value: '{"existing":true}' },
    });

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Paste content" }));
      await Promise.resolve();
    });

    expect(screen.getByLabelText("Source JSON")).toHaveValue('{"existing":true}');
    expect(
      screen.getByText("Could not read the clipboard. Allow clipboard access and try again."),
    ).toHaveClass("error-message");
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

  it("renders a multi-item root object array as a table", () => {
    render(<JsonVisualizer />);
    update(JSON.stringify([{ id: 1 }, { id: 2 }]), "");
    act(() => vi.advanceTimersByTime(250));

    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    expect(
      screen.getAllByRole("row").map((row) =>
        Array.from(row.querySelectorAll("th, td"), (cell) => cell.textContent),
      ),
    ).toEqual([["id"], ["1"], ["2"]]);
  });

  it("renders array cells as subtables with synchronized, independent sorting", () => {
    render(<JsonVisualizer />);
    update(
      JSON.stringify({
        records: [
          {
            name: "Beta",
            items: [
              { id: 2, label: "second" },
              { id: 1, label: "first" },
            ],
          },
          {
            name: "alpha",
            items: [
              { id: 4, label: "fourth" },
              { id: 3, label: "third" },
            ],
          },
        ],
      }),
      "",
    );
    act(() => vi.advanceTimersByTime(250));
    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    const subtables = screen.getAllByRole("table", { name: "items subtable" });
    const subtableIds = () =>
      subtables.map((table) =>
        Array.from(
          table.querySelectorAll<HTMLTableRowElement>("tbody > tr"),
          (row) => row.cells[0].textContent,
        ),
      );

    expect(subtables).toHaveLength(2);
    expect(subtableIds()).toEqual([
      ["2", "1"],
      ["4", "3"],
    ]);

    const nestedIdSortButtons = screen.getAllByRole("button", { name: "id" });
    fireEvent.click(nestedIdSortButtons[0]);

    expect(subtableIds()).toEqual([
      ["1", "2"],
      ["3", "4"],
    ]);
    for (const button of nestedIdSortButtons) {
      expect(button.closest("th")).toHaveAttribute("aria-sort", "ascending");
    }

    fireEvent.click(screen.getByRole("button", { name: "name" }));
    expect(screen.getByRole("columnheader", { name: "name" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    for (const button of nestedIdSortButtons) {
      expect(button.closest("th")).toHaveAttribute("aria-sort", "ascending");
    }

    fireEvent.click(nestedIdSortButtons[1]);
    expect(subtableIds()).toEqual([
      ["2", "1"],
      ["4", "3"],
    ]);
    for (const button of nestedIdSortButtons) {
      expect(button.closest("th")).toHaveAttribute("aria-sort", "descending");
    }
    expect(screen.getByRole("columnheader", { name: "name" })).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
  });

  it("renders eligible array cells recursively", () => {
    render(<JsonVisualizer />);
    update(
      JSON.stringify({
        records: [
          {
            groups: [
              { name: "one", entries: [{ value: 1 }, { value: 2 }] },
              { name: "two", entries: [{ value: 3 }, { value: 4 }] },
            ],
          },
          {
            groups: [
              { name: "three", entries: [{ value: 5 }, { value: 6 }] },
              { name: "four", entries: [{ value: 7 }, { value: 8 }] },
            ],
          },
        ],
      }),
      "",
    );
    act(() => vi.advanceTimersByTime(250));
    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    expect(screen.getAllByRole("table", { name: "groups subtable" })).toHaveLength(2);
    expect(screen.getAllByRole("table", { name: "entries subtable" })).toHaveLength(4);
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
    ["a singleton root array", '[{"id":1}]'],
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

  it("shows every pull collision error without clearing the first-value output", () => {
    render(<JsonVisualizer />);
    update(
      JSON.stringify({ records: [{ selectedOne: 1, selectedTwo: 2 }, { selectedThree: 3 }] }),
      "records[selected*^choice]",
    );
    act(() => vi.advanceTimersByTime(250));

    expect(screen.getByLabelText("Filter expression")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Property choice would be overwritten with value 2.")).toBeVisible();
    expect(screen.getByText("Property choice would be overwritten with value 3.")).toBeVisible();
    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue('{ "choice": 1 }');
  });

  it("highlights every flattened destination cell and lists its root-item errors", () => {
    render(<JsonVisualizer />);
    update(
      JSON.stringify([
        null,
        {
          id: 1,
          source: {
            choiceOne: { left: 10, right: 20 },
            choiceTwo: { left: 30, right: 40 },
          },
        },
        { id: 2, source: { choiceOne: { left: 50, right: 60 } } },
      ]),
      "id,source[choice*^details]",
    );
    act(() => vi.advanceTimersByTime(250));
    fireEvent.click(screen.getByRole("tab", { name: "Table" }));

    const rows = screen.getAllByRole("row");
    const firstDataCells = Array.from(rows[1].querySelectorAll("td"));
    const secondDataCells = Array.from(rows[2].querySelectorAll("td"));
    const message =
      '[Item #2] Property details would be overwritten with value {"left":30,"right":40}.';

    expect(firstDataCells[0]).not.toHaveClass("overwrite-error-cell");
    expect(firstDataCells[1]).toHaveClass("overwrite-error-cell");
    expect(firstDataCells[2]).toHaveClass("overwrite-error-cell");
    expect(secondDataCells.every((cell) => !cell.classList.contains("overwrite-error-cell"))).toBe(
      true,
    );
    const overwriteTooltips = document.querySelectorAll<HTMLElement>(".overwrite-error-tooltip");
    expect(overwriteTooltips).toHaveLength(2);
    expect(screen.getAllByText(message)).toHaveLength(3);
    expect(firstDataCells[1]).toHaveAttribute(
      "aria-describedby",
      overwriteTooltips[0].id,
    );
  });

  it("copies output and announces success", async () => {
    render(<JsonVisualizer />);
    update('{"a":1}', "a");
    act(() => vi.advanceTimersByTime(250));

    await act(async () => screen.getByRole("button", { name: "Copy JSON" }).click());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{ "a": 1 }');
    expect(screen.getByText("Copied to clipboard.")).toBeInTheDocument();
  });

  it("collapses and restores the input pane without losing its content", () => {
    render(<JsonVisualizer />);
    const sourceInput = screen.getByLabelText("Source JSON");
    fireEvent.change(sourceInput, { target: { value: '{"kept":true}' } });

    const collapseButton = screen.getByRole("button", { name: "Collapse input" });
    fireEvent.click(collapseButton);

    expect(collapseButton).not.toBeVisible();
    expect(sourceInput).not.toBeVisible();
    expect(screen.getByRole("region", { name: "JSON filtering workspace" })).toHaveClass(
      "input-collapsed",
    );

    fireEvent.click(screen.getByRole("button", { name: "Expand input" }));

    expect(sourceInput).toBeVisible();
    expect(sourceInput).toHaveValue('{"kept":true}');
  });

  it("renders source and output actions as icon buttons with text tooltips", () => {
    render(<JsonVisualizer />);

    for (const label of [
      "Collapse input",
      "Paste content",
      "Load JSON file",
      "Apply formatting",
      "Copy JSON",
      "Collapse header",
    ]) {
      const button = screen.getByRole("button", { name: label });
      expect(button).toHaveAttribute("title", label);
      expect(button).toHaveTextContent("");
      expect(button.querySelector("svg")).not.toBeNull();
    }
  });

  it("places filter guidance in a tooltip beside the filter label", () => {
    render(<JsonVisualizer />);

    const helpButton = screen.getByRole("button", { name: "Filter expression help" });
    const tooltip = screen.getByRole("tooltip");
    expect(helpButton.parentElement?.previousElementSibling).toHaveTextContent(
      "Filter expression",
    );
    expect(helpButton).toHaveAttribute("aria-describedby", tooltip.id);
    expect(tooltip).toHaveTextContent("Use a,b for keys anywhere");
  });
});
