import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HtmlCleaner } from "./html-cleaner";

describe("HtmlCleaner", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(""),
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(cleanup);

  it("filters attributes as the user types", () => {
    render(<HtmlCleaner />);

    fireEvent.change(screen.getByLabelText("HTML input"), {
      target: { value: '<main class="page"><p style="color:red" id="copy">Hello</p></main>' },
    });
    fireEvent.change(screen.getByLabelText("Exclude attributes"), {
      target: { value: "style, class" },
    });

    expect((screen.getByLabelText("Cleaned HTML output") as HTMLTextAreaElement).value).toBe(
      '<main><p id="copy">Hello</p></main>',
    );
    expect(screen.getByText("2 attributes excluded")).not.toBeNull();
  });

  it("copies cleaned HTML", async () => {
    render(<HtmlCleaner />);
    fireEvent.change(screen.getByLabelText("HTML input"), {
      target: { value: '<div class="card">Hello</div>' },
    });
    fireEvent.change(screen.getByLabelText("Exclude attributes"), {
      target: { value: "class" },
    });

    await act(async () => screen.getByRole("button", { name: "Copy output" }).click());

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("<div>Hello</div>");
    expect(screen.getByText("Copied to clipboard.")).not.toBeNull();
  });

  it("pastes clipboard HTML into the input", async () => {
    vi.mocked(navigator.clipboard.readText).mockResolvedValueOnce('<button disabled>Save</button>');
    render(<HtmlCleaner />);

    await act(async () => screen.getByRole("button", { name: "Paste clipboard" }).click());

    expect((screen.getByLabelText("HTML input") as HTMLTextAreaElement).value).toBe(
      "<button disabled>Save</button>",
    );
    expect((screen.getByLabelText("Cleaned HTML output") as HTMLTextAreaElement).value).toBe(
      "<button disabled>Save</button>",
    );
  });
});
