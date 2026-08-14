import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { JsonVisualizerTool } from "./json-visualizer-tool";

describe("JsonVisualizerTool", () => {
  afterEach(cleanup);

  it("controls the header from the source action group", () => {
    vi.useFakeTimers();
    render(<JsonVisualizerTool />);

    const heading = screen.getByRole("heading", { name: "JSON Visualizer" });
    const collapse = screen.getByRole("button", { name: "Collapse header" });
    expect(heading).toBeVisible();
    expect(collapse.closest(".source-actions")).not.toBeNull();
    expect(collapse).toHaveAttribute("title", "Collapse header");

    fireEvent.click(collapse);
    expect(heading).not.toBeVisible();

    const expand = screen.getByRole("button", { name: "Expand header" });
    expect(expand).toHaveAttribute("title", "Expand header");
    fireEvent.click(expand);
    expect(heading).toBeVisible();

    vi.useRealTimers();
  });
});
