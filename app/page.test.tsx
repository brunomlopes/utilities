import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

describe("Utilities homepage", () => {
  afterEach(cleanup);

  it("lists JSON Visualizer with its description and route", () => {
    render(<Home />);

    const link = screen.getByRole("link", { name: /JSON Visualizer/i });
    expect(link).toHaveAttribute("href", "/json-visualizer");
    expect(
      screen.getByText(/Filter JSON by property name, preserve the matching structure/i),
    ).toBeInTheDocument();
  });

  it("lists Excel–Sheets Interchange with its description and route", () => {
    render(<Home />);

    const link = screen.getByRole("link", { name: /Excel–Sheets Interchange/i });
    expect(link).toHaveAttribute("href", "/excel-sheets-interchange");
    expect(
      screen.getByText(/Convert pasted numbers between Excel and Google Sheets cultures/i),
    ).toBeInTheDocument();
    expect(screen.getByText("02")).toBeInTheDocument();
  });

  it("lists HTML Cleaner with its description and route", () => {
    render(<Home />);

    const link = screen.getByRole("link", { name: /HTML Cleaner/i });
    expect(link).toHaveAttribute("href", "/html-cleaner");
    expect(
      screen.getByText(/Remove selected nodes and attributes from HTML locally in your browser/i),
    ).toBeInTheDocument();
    expect(screen.getAllByText("03")).toHaveLength(2);
  });
});
