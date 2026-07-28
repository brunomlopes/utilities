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
    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue('{\n  "a": 1\n}');
    expect(screen.getByLabelText("Filtered JSON output")).toHaveAttribute("readonly");
  });

  it("pretty-prints all valid JSON when the filter is blank", () => {
    render(<JsonVisualizer />);
    update('{"a":1}', "");
    act(() => vi.advanceTimersByTime(250));
    expect(screen.getByLabelText("Filtered JSON output")).toHaveValue('{\n  "a": 1\n}');
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
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('{\n  "a": 1\n}');
    expect(screen.getByText("Copied to clipboard.")).toBeInTheDocument();
  });
});
