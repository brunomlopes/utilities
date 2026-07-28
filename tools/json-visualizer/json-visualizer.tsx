"use client";

import { type ClipboardEvent, useEffect, useId, useState } from "react";
import { filterJson, FilterSyntaxError, parseFilter, type JsonValue } from "./filter";

const DEBOUNCE_MS = 250;

interface PasteVersions {
  raw: string;
  formatted: string;
}

interface Evaluation {
  output: string;
  jsonError: string | null;
  filterError: string | null;
}

function evaluate(jsonText: string, filterText: string): Evaluation {
  let clauses;
  let filterError: string | null = null;

  try {
    clauses = parseFilter(filterText);
  } catch (error) {
    filterError = error instanceof FilterSyntaxError ? error.message : "The filter is invalid.";
  }

  if (!jsonText.trim()) return { output: "", jsonError: null, filterError };

  let value: JsonValue;
  try {
    value = JSON.parse(jsonText) as JsonValue;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The document is not valid JSON.";
    return { output: "", jsonError: detail, filterError };
  }

  if (filterError || !clauses) return { output: "", jsonError: null, filterError };

  const filtered = filterJson(value, clauses);
  return { output: JSON.stringify(filtered.value, null, 2), jsonError: null, filterError: null };
}

export function JsonVisualizer() {
  const jsonErrorId = useId();
  const filterHelpId = useId();
  const filterErrorId = useId();
  const [jsonText, setJsonText] = useState("");
  const [filterText, setFilterText] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation>(() => evaluate("", ""));
  const [copyStatus, setCopyStatus] = useState("");
  const [pasteVersions, setPasteVersions] = useState<PasteVersions | null>(null);
  const [showingFormattedPaste, setShowingFormattedPaste] = useState(false);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setEvaluation(evaluate(jsonText, filterText));
      setCopyStatus("");
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [jsonText, filterText]);

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(evaluation.output);
      setCopyStatus("Copied to clipboard.");
    } catch {
      setCopyStatus("Could not copy. Select the output and copy it manually.");
    }
  }

  function handleJsonChange(value: string) {
    setJsonText(value);
    setPasteVersions(null);
    setShowingFormattedPaste(false);
  }

  function handleJsonPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData("text");
    const selectionStart = event.currentTarget.selectionStart;
    const selectionEnd = event.currentTarget.selectionEnd;
    const raw = `${jsonText.slice(0, selectionStart)}${pastedText}${jsonText.slice(selectionEnd)}`;

    event.preventDefault();

    try {
      const parsed = JSON.parse(raw) as JsonValue;
      const formatted = JSON.stringify(parsed, null, 2);

      setPasteVersions({ raw, formatted });
      setShowingFormattedPaste(true);
      setJsonText(formatted);
    } catch {
      setPasteVersions(null);
      setShowingFormattedPaste(false);
      setJsonText(raw);
    }
  }

  function togglePasteFormatting() {
    if (!pasteVersions) return;

    const showFormatted = !showingFormattedPaste;
    setShowingFormattedPaste(showFormatted);
    setJsonText(showFormatted ? pasteVersions.formatted : pasteVersions.raw);
  }

  const filterDescribedBy = [filterHelpId, evaluation.filterError ? filterErrorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <section className="workspace" aria-label="JSON filtering workspace">
      <div className="pane input-pane">
        <div className="section-heading">
          <div>
            <span className="step-number">01</span>
            <h2>Source JSON</h2>
          </div>
          <div className="source-actions">
            <button
              type="button"
              className="format-button"
              onClick={togglePasteFormatting}
              disabled={!pasteVersions}
            >
              {showingFormattedPaste ? "Revert formatting" : "Apply formatting"}
            </button>
            <span className="privacy-badge">Local only</span>
          </div>
        </div>
        <label className="visually-hidden" htmlFor="json-input">
          Source JSON
        </label>
        <textarea
          id="json-input"
          className="code-area"
          value={jsonText}
          onChange={(event) => handleJsonChange(event.target.value)}
          onPaste={handleJsonPaste}
          placeholder={'{\n  "projects": [\n    { "name": "Atlas", "status": "active" }\n  ]\n}'}
          spellCheck={false}
          aria-invalid={Boolean(evaluation.jsonError)}
          aria-describedby={evaluation.jsonError ? jsonErrorId : undefined}
        />
        <p
          id={jsonErrorId}
          className={`field-message error-message ${evaluation.jsonError ? "" : "is-hidden"}`}
          role="alert"
        >
          {evaluation.jsonError ?? "Valid JSON"}
        </p>
      </div>

      <div className="pane result-pane">
        <div className="filter-block">
          <label htmlFor="filter-input">
            <span className="step-number">02</span>
            Filter expression
          </label>
          <input
            id="filter-input"
            className="filter-input"
            aria-label="Filter expression"
            value={filterText}
            onChange={(event) => setFilterText(event.target.value)}
            placeholder={'name,status,metadata["created,at"]'}
            spellCheck={false}
            autoComplete="off"
            aria-invalid={Boolean(evaluation.filterError)}
            aria-describedby={filterDescribedBy}
          />
          <p id={filterHelpId} className="filter-help">
            Use <code>a,b</code> for keys anywhere or <code>x[a,b]</code> for direct children,
            including items in an <code>x</code> array. Add <code>*</code> to wildcard names.
          </p>
          <p
            id={filterErrorId}
            className={`field-message error-message ${evaluation.filterError ? "" : "is-hidden"}`}
            role="alert"
          >
            {evaluation.filterError ?? "Valid filter"}
          </p>
        </div>

        <div className="output-heading">
          <div>
            <span className="step-number">03</span>
            <h2>Filtered output</h2>
          </div>
          <button
            type="button"
            className="copy-button"
            onClick={copyOutput}
            disabled={!evaluation.output}
          >
            Copy JSON
          </button>
        </div>
        <label className="visually-hidden" htmlFor="json-output">
          Filtered JSON output
        </label>
        <textarea
          id="json-output"
          className="code-area output-area"
          value={evaluation.output}
          placeholder="Filtered JSON appears here"
          readOnly
          spellCheck={false}
        />
        <p className="copy-status" aria-live="polite">
          {copyStatus}
        </p>
      </div>
    </section>
  );
}
