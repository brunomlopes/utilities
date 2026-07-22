"use client";

import { useEffect, useMemo, useState } from "react";
import {
  convertTabSeparatedText,
  DEFAULT_PREFERENCES,
  getConversionCultures,
  parsePreferences,
  PREFERENCES_STORAGE_KEY,
  type Culture,
  type InterchangePreferences,
} from "./conversion";

const PRODUCT_NAMES = {
  excel: "Excel",
  sheets: "Google Sheets",
} as const;

export function ExcelSheetsInterchange() {
  const [preferences, setPreferences] = useState<InterchangePreferences>(DEFAULT_PREFERENCES);
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const [input, setInput] = useState("");
  const [pasteStatus, setPasteStatus] = useState("");
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      try {
        const stored = parsePreferences(window.localStorage.getItem(PREFERENCES_STORAGE_KEY));
        if (stored) setPreferences(stored);
      } catch {
        // Storage can be unavailable in privacy modes; defaults remain usable.
      }
      setPreferencesLoaded(true);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!preferencesLoaded) return;

    try {
      window.localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Conversion remains available when preferences cannot be persisted.
    }
  }, [preferences, preferencesLoaded]);

  const { sourceCulture, targetCulture } = getConversionCultures(preferences);
  const output = useMemo(
    () => convertTabSeparatedText(input, sourceCulture, targetCulture),
    [input, sourceCulture, targetCulture],
  );
  const excelIsSource = preferences.direction === "excel-to-sheets";
  const sourceName = excelIsSource ? PRODUCT_NAMES.excel : PRODUCT_NAMES.sheets;
  const targetName = excelIsSource ? PRODUCT_NAMES.sheets : PRODUCT_NAMES.excel;

  function changePreferences(update: Partial<InterchangePreferences>) {
    setPreferences((current) => ({ ...current, ...update }));
    setCopyStatus("");
  }

  function changeInput(value: string) {
    setInput(value);
    setPasteStatus("");
    setCopyStatus("");
  }

  async function pasteInput() {
    try {
      const clipboardText = await navigator.clipboard.readText();
      changeInput(clipboardText);
      setPasteStatus("Pasted from clipboard.");
    } catch {
      setPasteStatus("Could not read clipboard. Paste into the input manually.");
    }
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      setCopyStatus("Copied to clipboard.");
    } catch {
      setCopyStatus("Could not copy. Select the output and copy it manually.");
    }
  }

  return (
    <section className="interchange-workspace" aria-label="Excel and Google Sheets interchange">
      <div className="interchange-controls">
        <div className="direction-control">
          <span className="control-label">Direction</span>
          <button
            type="button"
            className="direction-switch"
            role="switch"
            aria-checked={!excelIsSource}
            aria-label={`Switch conversion direction. Current direction: ${sourceName} to ${targetName}`}
            onClick={() =>
              changePreferences({
                direction: excelIsSource ? "sheets-to-excel" : "excel-to-sheets",
              })
            }
          >
            <span className={excelIsSource ? "is-active" : undefined}>Excel</span>
            <span className="switch-track" aria-hidden="true">
              <span className="switch-thumb" />
            </span>
            <span className={!excelIsSource ? "is-active" : undefined}>Google Sheets</span>
          </button>
          <span className="direction-summary" aria-live="polite">
            {sourceName} → {targetName}
          </span>
        </div>

        <div className="culture-controls">
          <label>
            <span className="control-label">Excel culture</span>
            <select
              value={preferences.excelCulture}
              onChange={(event) =>
                changePreferences({ excelCulture: event.target.value as Culture })
              }
            >
              <option value="en">English (1,234.56)</option>
              <option value="pt">Portuguese (1.234,56)</option>
            </select>
          </label>
          <label>
            <span className="control-label">Google Sheets culture</span>
            <select
              value={preferences.sheetsCulture}
              onChange={(event) =>
                changePreferences({ sheetsCulture: event.target.value as Culture })
              }
            >
              <option value="en">English (1,234.56)</option>
              <option value="pt">Portuguese (1.234,56)</option>
            </select>
          </label>
        </div>
      </div>

      <div className="interchange-panes">
        <div className="interchange-pane source-pane">
          <div className="interchange-heading">
            <div>
              <span className="interchange-step">01</span>
              <h2>Paste from {sourceName}</h2>
            </div>
            <div className="source-actions">
              <span className="local-badge">Local only</span>
              <button type="button" className="interchange-paste" onClick={pasteInput}>
                Paste clipboard
              </button>
            </div>
          </div>
          <label className="visually-hidden" htmlFor="interchange-input">
            Paste from {sourceName}
          </label>
          <textarea
            id="interchange-input"
            className="interchange-textarea"
            value={input}
            onChange={(event) => changeInput(event.target.value)}
            placeholder={`Paste tab-separated cells from ${sourceName}`}
            spellCheck={false}
          />
          <p className="interchange-status" aria-live="polite">
            {pasteStatus}
          </p>
        </div>

        <div className="interchange-pane output-pane">
          <div className="interchange-heading">
            <div>
              <span className="interchange-step">02</span>
              <h2>Copy to {targetName}</h2>
            </div>
            <button type="button" className="interchange-copy" onClick={copyOutput} disabled={!output}>
              Copy output
            </button>
          </div>
          <label className="visually-hidden" htmlFor="interchange-output">
            Converted output for {targetName}
          </label>
          <textarea
            id="interchange-output"
            className="interchange-textarea converted-textarea"
            value={output}
            placeholder="Converted cells appear here"
            readOnly
            spellCheck={false}
          />
          <p className="interchange-status" aria-live="polite">
            {copyStatus}
          </p>
        </div>
      </div>
    </section>
  );
}
