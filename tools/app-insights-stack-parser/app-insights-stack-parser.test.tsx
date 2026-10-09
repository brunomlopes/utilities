import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { AppInsightsStackParser } from "./app-insights-stack-parser";

const item = { id: "1", outerId: "0", severityLevel: "Error", type: "System.Exception", message: "First line\nSecond line", parsedStack: [{ method: "Example.Run", line: 12, fileName: "/src/Example.cs" }] };

describe("App Insights Stack Parser", () => {
  afterEach(cleanup);

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
