import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { JsonVisualizerHeader } from "./json-visualizer-header";

describe("JsonVisualizerHeader", () => {
  afterEach(cleanup);

  it("shows or hides the header from its controlled state", () => {
    const { rerender } = render(<JsonVisualizerHeader isCollapsed={false} />);

    const heading = screen.getByRole("heading", { name: "JSON Visualizer" });
    expect(heading).toBeVisible();

    rerender(<JsonVisualizerHeader isCollapsed />);
    expect(heading).not.toBeVisible();
  });
});
