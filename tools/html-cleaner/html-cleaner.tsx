"use client";

import { useMemo, useState } from "react";
import { cleanHtml, HtmlFilterSyntaxError, parseHtmlFilter } from "./clean-html";

interface Evaluation {
  output: string;
  error: string | null;
  ruleCount: number;
}

function evaluate(html: string, filterText: string): Evaluation {
  try {
    const filter = parseHtmlFilter(filterText);
    const attributeRuleCount = [...filter.attributesByTag.values()].reduce(
      (total, attributes) => total + attributes.size,
      0,
    );

    return {
      output: cleanHtml(html, filterText),
      error: null,
      ruleCount: filter.removedTags.size + attributeRuleCount,
    };
  } catch (error) {
    return {
      output: html,
      error: error instanceof HtmlFilterSyntaxError ? error.message : "The filter is invalid.",
      ruleCount: 0,
    };
  }
}

export function HtmlCleaner() {
  const [html, setHtml] = useState("");
  const [filter, setFilter] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const evaluation = useMemo(() => evaluate(html, filter), [html, filter]);

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
      await navigator.clipboard.writeText(evaluation.output);
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
          <label htmlFor="html-filter">Filter</label>
          <p id="html-filter-help">
            Remove tags with <code>meta,table</code>, or attributes with{" "}
            <code>&lt;table style,class&gt;</code>. Use <code>*</code> to target every tag.
          </p>
          <input
            id="html-filter"
            className="html-filter-input"
            value={filter}
            onChange={(event) => {
              setFilter(event.target.value);
              setCopyStatus("");
            }}
            placeholder="meta,<table style,class>"
            aria-describedby={`html-filter-help ${evaluation.error ? "html-filter-error" : "html-filter-count"}`}
            aria-invalid={evaluation.error ? "true" : undefined}
          />
          {evaluation.error ? (
            <p id="html-filter-error" className="html-filter-error" role="alert">
              {evaluation.error}
            </p>
          ) : (
            <p id="html-filter-count" className="html-filter-count" aria-live="polite">
              {evaluation.ruleCount === 0
                ? "No filters applied"
                : `${evaluation.ruleCount} filter rule${evaluation.ruleCount === 1 ? "" : "s"} applied`}
            </p>
          )}
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
            disabled={!evaluation.output || Boolean(evaluation.error)}
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
          value={evaluation.output}
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
