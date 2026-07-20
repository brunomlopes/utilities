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
});
