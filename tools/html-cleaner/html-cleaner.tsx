"use client";

import { useMemo, useState } from "react";
import { cleanHtml, parseExcludedAttributes } from "./clean-html";

export function HtmlCleaner() {
  const [html, setHtml] = useState("");
  const [filter, setFilter] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const output = useMemo(() => cleanHtml(html, filter), [html, filter]);
  const excludedCount = parseExcludedAttributes(filter).length;

  async function pasteInput() {
    try {
      setHtml(await navigator.clipboard.readText());
      setCopyStatus("");
    } catch {
      setCopyStatus("Could not read clipboard. Paste into the input manually.");
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
    <section className="html-cleaner-workspace" aria-label="HTML cleaner">
      <div className="html-cleaner-pane html-source-pane">
        <div className="html-cleaner-heading">
          <div>
            <span className="html-cleaner-step">01</span>
            <h2>HTML input</h2>
          </div>
          <div className="html-cleaner-actions">
            <span className="html-local-badge">Local only</span>
            <button type="button" className="html-secondary-button" onClick={pasteInput}>
              Paste clipboard
            </button>
          </div>
        </div>
        <label className="visually-hidden" htmlFor="html-cleaner-input">
          HTML input
        </label>
        <textarea
          id="html-cleaner-input"
          className="html-code-area"
          value={html}
          onChange={(event) => {
            setHtml(event.target.value);
            setCopyStatus("");
          }}
          placeholder='<article class="card" style="color: red">...</article>'
          spellCheck={false}
        />
      </div>

      <div className="html-cleaner-pane html-result-pane">
        <div className="html-filter-block">
          <label htmlFor="html-attribute-filter">Exclude attributes</label>
          <p id="html-filter-help">
            Enter attribute names separated by commas. Matching is case-insensitive.
          </p>
          <input
            id="html-attribute-filter"
            className="html-filter-input"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setCopyStatus("");
            }}
            placeholder="style,class"
            aria-describedby="html-filter-help html-filter-count"
          />
          <p id="html-filter-count" className="html-filter-count" aria-live="polite">
            {excludedCount === 0
              ? "No attributes excluded"
              : `${excludedCount} attribute${excludedCount === 1 ? "" : "s"} excluded`}
          </p>
        </div>

        <div className="html-cleaner-heading html-output-heading">
          <div>
            <span className="html-cleaner-step">02</span>
            <h2>Cleaned HTML</h2>
          </div>
          <button
            type="button"
            className="html-primary-button"
            onClick={copyOutput}
            disabled={!output}
          >
            Copy output
          </button>
        </div>
        <label className="visually-hidden" htmlFor="html-cleaner-output">
          Cleaned HTML output
        </label>
        <textarea
          id="html-cleaner-output"
          className="html-code-area html-output-area"
          value={output}
          placeholder="Cleaned HTML appears here"
          readOnly
          spellCheck={false}
        />
        <p className="html-cleaner-status" aria-live="polite">
          {copyStatus}
        </p>
      </div>
    </section>
  );
}
