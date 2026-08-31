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
    fireEvent.change(screen.getByLabelText("Filter"), {
      target: { value: "<* style,class>" },
    });

    expect((screen.getByLabelText("Cleaned HTML output") as HTMLTextAreaElement).value).toBe(
      '<main>\n    <p id="copy">Hello</p>\n</main>',
    );
    expect(screen.getByText("2 filter rules applied")).not.toBeNull();
  });

  it("copies cleaned HTML", async () => {
    render(<HtmlCleaner />);
    fireEvent.change(screen.getByLabelText("HTML input"), {
      target: { value: '<div class="card">Hello</div>' },
    });
    fireEvent.change(screen.getByLabelText("Filter"), {
      target: { value: "<* class>" },
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
      '<button disabled="">Save</button>',
    );
  });

  it("formats output by default and can return to compact output", () => {
    render(<HtmlCleaner />);
    const formatToggle = screen.getByRole("checkbox", { name: "Format output" });
    fireEvent.change(screen.getByLabelText("HTML input"), {
      target: { value: "<main><section><p>Hello</p></section></main>" },
    });

    expect((formatToggle as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Cleaned HTML output") as HTMLTextAreaElement).value).toBe(
      "<main>\n    <section>\n        <p>Hello</p>\n    </section>\n</main>",
    );

    fireEvent.click(formatToggle);

    expect((screen.getByLabelText("Cleaned HTML output") as HTMLTextAreaElement).value).toBe(
      "<main><section><p>Hello</p></section></main>",
    );
  });

  it("shows invalid filter errors and leaves the HTML unchanged", () => {
    render(<HtmlCleaner />);
    const html = '<div class="card"><p>Hello</p></div>';
    fireEvent.change(screen.getByLabelText("HTML input"), { target: { value: html } });
    fireEvent.change(screen.getByLabelText("Filter"), {
      target: { value: "div,<* class" },
    });

    expect(screen.getByRole("alert").textContent).toContain("Invalid filter");
    expect(screen.getByLabelText("Filter").getAttribute("aria-invalid")).toBe("true");
    expect((screen.getByLabelText("Cleaned HTML output") as HTMLTextAreaElement).value).toBe(html);
    expect((screen.getByRole("button", { name: "Copy output" }) as HTMLButtonElement).disabled).toBe(
      true,
    );
  });
});
