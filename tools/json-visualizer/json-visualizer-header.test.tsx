import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JsonVisualizerHeader } from "./json-visualizer-header";

describe("JsonVisualizerHeader", () => {
  afterEach(cleanup);

  it("collapses and restores the header content", () => {
    render(<JsonVisualizerHeader />);

    const heading = screen.getByRole("heading", { name: "JSON Visualizer" });
    const collapseButton = screen.getByRole("button", { name: "Collapse header" });
    expect(heading).toBeVisible();
    expect(collapseButton).toHaveAttribute("aria-expanded", "true");

    fireEvent.click(collapseButton);

    expect(heading).not.toBeVisible();
    const expandButton = screen.getByRole("button", { name: "Expand header" });
    expect(expandButton).toHaveAttribute("aria-expanded", "false");

    fireEvent.click(expandButton);

    expect(heading).toBeVisible();
    expect(screen.getByRole("button", { name: "Collapse header" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });
});
