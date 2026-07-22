import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PREFERENCES_STORAGE_KEY } from "./conversion";
import { ExcelSheetsInterchange } from "./excel-sheets-interchange";

describe("ExcelSheetsInterchange", () => {
  beforeEach(() => {
    window.localStorage.clear();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: vi.fn().mockResolvedValue(""),
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it("converts pasted cells immediately using the selected cultures", () => {
    render(<ExcelSheetsInterchange />);

    expect(screen.getByRole("button", { name: "Copy output" })).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Google Sheets culture"), {
      target: { value: "pt" },
    });
    fireEvent.change(screen.getByLabelText("Paste from Excel"), {
      target: { value: "Item\t$1,234.500\nOther\t-0.25" },
    });

    expect(screen.getByLabelText("Converted output for Google Sheets")).toHaveValue(
      "Item\t1234,500\nOther\t-0,25",
    );
    expect(screen.getByRole("button", { name: "Copy output" })).toBeEnabled();
  });

  it("restores saved direction and cultures", async () => {
    window.localStorage.setItem(
      PREFERENCES_STORAGE_KEY,
      JSON.stringify({
        direction: "sheets-to-excel",
        excelCulture: "pt",
        sheetsCulture: "en",
      }),
    );

    render(<ExcelSheetsInterchange />);

    const input = await screen.findByLabelText("Paste from Google Sheets");
    fireEvent.change(input, { target: { value: "1,234.50" } });
    expect(screen.getByLabelText("Converted output for Excel")).toHaveValue("1234,50");
    expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true");
  });

  it("persists preference changes without storing spreadsheet text", async () => {
    render(<ExcelSheetsInterchange />);

    fireEvent.change(screen.getByLabelText("Excel culture"), { target: { value: "pt" } });
    fireEvent.click(screen.getByRole("switch"));
    fireEvent.change(screen.getByLabelText("Paste from Google Sheets"), {
      target: { value: "private spreadsheet value" },
    });

    await waitFor(() => {
      expect(JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? "{}")).toEqual({
        direction: "sheets-to-excel",
        excelCulture: "pt",
        sheetsCulture: "en",
      });
    });
    expect(window.localStorage.length).toBe(1);
    expect(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)).not.toContain(
      "private spreadsheet value",
    );
  });

  it("copies output and announces success", async () => {
    render(<ExcelSheetsInterchange />);
    fireEvent.change(screen.getByLabelText("Paste from Excel"), { target: { value: "$1.50" } });

    await act(async () => screen.getByRole("button", { name: "Copy output" }).click());

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("1.50");
    expect(screen.getByText("Copied to clipboard.")).toBeInTheDocument();
  });

  it("replaces the input with clipboard text and converts it immediately", async () => {
    vi.mocked(navigator.clipboard.readText).mockResolvedValueOnce("$1,234.50\t-");
    render(<ExcelSheetsInterchange />);
    fireEvent.change(screen.getByLabelText("Google Sheets culture"), {
      target: { value: "pt" },
    });
    fireEvent.change(screen.getByLabelText("Paste from Excel"), {
      target: { value: "old value" },
    });

    await act(async () => screen.getByRole("button", { name: "Paste clipboard" }).click());

    expect(navigator.clipboard.readText).toHaveBeenCalledOnce();
    expect(screen.getByLabelText("Paste from Excel")).toHaveValue("$1,234.50\t-");
    expect(screen.getByLabelText("Converted output for Google Sheets")).toHaveValue(
      "1234,50\t0",
    );
    expect(screen.getByText("Pasted from clipboard.")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Paste from Excel"), { target: { value: "manual" } });
    expect(screen.queryByText("Pasted from clipboard.")).not.toBeInTheDocument();
  });

  it("clears the input and output when the clipboard is empty", async () => {
    render(<ExcelSheetsInterchange />);
    fireEvent.change(screen.getByLabelText("Paste from Excel"), { target: { value: "1" } });

    await act(async () => screen.getByRole("button", { name: "Paste clipboard" }).click());

    expect(screen.getByLabelText("Paste from Excel")).toHaveValue("");
    expect(screen.getByLabelText("Converted output for Google Sheets")).toHaveValue("");
    expect(screen.getByRole("button", { name: "Copy output" })).toBeDisabled();
  });

  it("retains the input and announces clipboard read failures", async () => {
    vi.mocked(navigator.clipboard.readText).mockRejectedValueOnce(new Error("denied"));
    render(<ExcelSheetsInterchange />);
    fireEvent.change(screen.getByLabelText("Paste from Excel"), {
      target: { value: "keep this value" },
    });

    await act(async () => screen.getByRole("button", { name: "Paste clipboard" }).click());

    expect(screen.getByLabelText("Paste from Excel")).toHaveValue("keep this value");
    expect(
      screen.getByText("Could not read clipboard. Paste into the input manually."),
    ).toBeInTheDocument();
  });

  it("announces clipboard failures", async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error("denied"));
    render(<ExcelSheetsInterchange />);
    fireEvent.change(screen.getByLabelText("Paste from Excel"), { target: { value: "1" } });

    await act(async () => screen.getByRole("button", { name: "Copy output" }).click());

    expect(
      screen.getByText("Could not copy. Select the output and copy it manually."),
    ).toBeInTheDocument();
  });
});
