import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AppInsightsStackParser } from "./app-insights-stack-parser";

const item = { id: "1", outerId: "0", severityLevel: "Error", type: "System.Exception", message: "First line\nSecond line", parsedStack: [{ method: "Example.Run", line: 12, fileName: "/src/Example.cs" }] };

describe("App Insights Stack Parser", () => {
  it("indents the caption and table by relationship depth while retaining input order", () => {
    render(<AppInsightsStackParser />);
    const exceptions = [
      { ...item, id: "grandchild", outerId: "child" },
      { ...item, id: "root", outerId: "0" },
      { ...item, id: "child", outerId: "root" },
      { ...item, id: "sibling", outerId: "root" },
    ];
    fireEvent.change(screen.getByRole("textbox", { name: "Details JSON" }), { target: { value: JSON.stringify(exceptions) } });
    const tables = screen.getAllByRole("table");
    [2, 0, 1, 1].forEach((depth, index) => {
      expect(tables[index]).toHaveAccessibleName(`Exception ${index + 1} — nesting level ${depth}`);
      const lines = tables[index].previousElementSibling;
      if (depth) {
        expect(lines).toHaveAttribute("aria-hidden", "true");
        expect(lines).toHaveStyle({ width: `${depth * 16}px` });
      } else expect(lines).toBeNull();
    });
  });
  afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

  it("copies wiki output, reports success, and disables copying for empty or invalid input", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    render(<AppInsightsStackParser />);
    const wiki = screen.getByRole("button", { name: "Copy wiki markup" });
    const rich = screen.getByRole("button", { name: "Copy rich text" });
    expect(wiki).toBeDisabled();
    expect(rich).toBeDisabled();
    const input = screen.getByRole("textbox", { name: "Details JSON" });
    fireEvent.change(input, { target: { value: JSON.stringify([item]) } });
    expect(rich).toBeEnabled();
    fireEvent.click(wiki);
    expect(await screen.findByText(/Wiki markup copied/)).toBeInTheDocument();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("*id*: 1"));
    fireEvent.change(input, { target: { value: "[" } });
    expect(wiki).toBeDisabled();
    expect(rich).toBeDisabled();
    expect(screen.queryByText(/Wiki markup copied/)).not.toBeInTheDocument();
  });

  it("reports clipboard failure without discarding output", async () => {
    vi.stubGlobal("navigator", { clipboard: { writeText: vi.fn().mockRejectedValue(new Error("Denied")) } });
    render(<AppInsightsStackParser />);
    fireEvent.change(screen.getByRole("textbox", { name: "Details JSON" }), { target: { value: JSON.stringify([item]) } });
    fireEvent.click(screen.getByRole("button", { name: "Copy wiki markup" }));
    expect(await screen.findByText(/Copy failed/)).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Copy wiki markup" })).toBeEnabled();
  });

  it("renders each exception in exactly three rows with the requested field order", () => {
    render(<AppInsightsStackParser />);
    fireEvent.change(screen.getByRole("textbox", { name: "Details JSON" }), { target: { value: JSON.stringify([item, { ...item, id: "2", outerId: "1" }]) } });
    const tables = screen.getAllByRole("table");
    expect(tables).toHaveLength(2);
    const rows = within(tables[0]).getAllByRole("row");
    expect(rows).toHaveLength(3);
    expect(within(rows[0]).getAllByRole("cell").map((cell) => cell.textContent)).toEqual(["id1", "outerId0", "severityLevelError", "typeSystem.Exception"]);
    expect(within(rows[1]).getByRole("cell")).toHaveAttribute("colspan", "4");
    expect(rows[1].textContent).toBe(`message${item.message}`);
    expect(within(rows[2]).getByRole("cell")).toHaveAttribute("colspan", "4");
    expect(rows[2].textContent).toBe("parsedStack   at Example.Run in /src/Example.cs:line 12");
    expect(screen.getByRole("status")).toHaveTextContent("2 items");
  });

  it("removes stale tables on errors and clears input and errors", () => {
    render(<AppInsightsStackParser />);
    const input = screen.getByRole("textbox", { name: "Details JSON" });
    fireEvent.change(input, { target: { value: JSON.stringify([item]) } });
    expect(screen.getByRole("table")).toBeInTheDocument();
    fireEvent.change(input, { target: { value: "[" } });
    expect(screen.queryByRole("table")).not.toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid JSON");
    fireEvent.click(screen.getByRole("button", { name: "Clear" }));
    expect(input).toHaveValue("");
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("shows empty array and empty stack states", () => {
    render(<AppInsightsStackParser />);
    fireEvent.change(screen.getByRole("textbox", { name: "Details JSON" }), { target: { value: "[]" } });
    expect(screen.getByText("The details array is empty.")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("textbox", { name: "Details JSON" }), { target: { value: JSON.stringify([{ ...item, parsedStack: [] }]) } });
    expect(screen.getByText("No stack frames available.")).toBeInTheDocument();
  });
});
