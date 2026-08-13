"use client";

import {
  type ClipboardEvent,
  type ChangeEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { formatCompactJson } from "./compact-format";
import { filterJson, FilterSyntaxError, parseFilter, type JsonValue } from "./filter";
import { createTableModel } from "./table-model";
import { getSortedRowIndices, type SortDirection } from "./table-sort";

const DEBOUNCE_MS = 250;
const FILTER_RESIZE_THROTTLE_MS = 250;

interface PasteVersions {
  raw: string;
  formatted: string;
}

interface FileStatus {
  message: string;
  isError: boolean;
}

interface Evaluation {
  output: string;
  filteredValue: JsonValue | null;
  jsonError: string | null;
  filterError: string | null;
}

type OutputView = "tree" | "table";

interface SortState {
  columnKey: string;
  direction: SortDirection;
}

function evaluate(jsonText: string, filterText: string): Evaluation {
  let clauses;
  let filterError: string | null = null;

  try {
    clauses = parseFilter(filterText);
  } catch (error) {
    filterError = error instanceof FilterSyntaxError ? error.message : "The filter is invalid.";
  }

  if (!jsonText.trim()) {
    return { output: "", filteredValue: null, jsonError: null, filterError };
  }

  let value: JsonValue;
  try {
    value = JSON.parse(jsonText) as JsonValue;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The document is not valid JSON.";
    return { output: "", filteredValue: null, jsonError: detail, filterError };
  }

  if (filterError || !clauses) {
    return { output: "", filteredValue: null, jsonError: null, filterError };
  }

  const filtered = filterJson(value, clauses);
  return {
    output: JSON.stringify(filtered.value, null, 2),
    filteredValue: filtered.value,
    jsonError: null,
    filterError: null,
  };
}

export function JsonVisualizer() {
  const jsonErrorId = useId();
  const filterHelpId = useId();
  const filterErrorId = useId();
  const treeTabId = useId();
  const tableTabId = useId();
  const treePanelId = useId();
  const tablePanelId = useId();
  const [jsonText, setJsonText] = useState("");
  const [filterText, setFilterText] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation>(() => evaluate("", ""));
  const [compactOutput, setCompactOutput] = useState(true);
  const [outputMaximumColumns, setOutputMaximumColumns] = useState(Infinity);
  const [outputView, setOutputView] = useState<OutputView>("tree");
  const [sortState, setSortState] = useState<SortState | null>(null);
  const [copyStatus, setCopyStatus] = useState("");
  const [pasteVersions, setPasteVersions] = useState<PasteVersions | null>(null);
  const [showingFormattedPaste, setShowingFormattedPaste] = useState(false);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);
  const [fileStatus, setFileStatus] = useState<FileStatus | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fileLoadIdRef = useRef(0);
  const filterInputRef = useRef<HTMLTextAreaElement>(null);
  const outputInputRef = useRef<HTMLTextAreaElement>(null);
  const treeTabRef = useRef<HTMLButtonElement>(null);
  const tableTabRef = useRef<HTMLButtonElement>(null);
  const lastFilterResizeAtRef = useRef<number | null>(null);
  const filterResizeTimeoutRef = useRef<number | null>(null);
  const tableModel = useMemo(
    () => createTableModel(evaluation.filteredValue),
    [evaluation.filteredValue],
  );
  const activeSort =
    sortState && tableModel?.columnKeys.includes(sortState.columnKey) ? sortState : null;
  const sortedRowIndices = useMemo(() => {
    if (!tableModel) return [];
    if (!activeSort) return tableModel.rows.map((_, index) => index);

    return getSortedRowIndices(tableModel, activeSort.columnKey, activeSort.direction);
  }, [activeSort, tableModel]);
  const output = useMemo(() => {
    if (!evaluation.output || !compactOutput) return evaluation.output;
    return formatCompactJson(evaluation.filteredValue as JsonValue, outputMaximumColumns);
  }, [compactOutput, evaluation, outputMaximumColumns]);

  const resizeFilterInput = useCallback(() => {
    const input = filterInputRef.current;
    if (!input) return;

    input.style.height = "auto";
    const styles = window.getComputedStyle(input);
    const borderHeight =
      (Number.parseFloat(styles.borderTopWidth) || 0) +
      (Number.parseFloat(styles.borderBottomWidth) || 0);
    input.style.height = `${input.scrollHeight + borderHeight}px`;
    lastFilterResizeAtRef.current = Date.now();
  }, []);

  const scheduleFilterResize = useCallback(() => {
    const lastResizeAt = lastFilterResizeAtRef.current;
    const elapsed =
      lastResizeAt === null ? FILTER_RESIZE_THROTTLE_MS : Date.now() - lastResizeAt;

    if (elapsed >= FILTER_RESIZE_THROTTLE_MS) {
      if (filterResizeTimeoutRef.current !== null) {
        window.clearTimeout(filterResizeTimeoutRef.current);
        filterResizeTimeoutRef.current = null;
      }
      resizeFilterInput();
      return;
    }

    if (filterResizeTimeoutRef.current !== null) return;

    filterResizeTimeoutRef.current = window.setTimeout(() => {
      filterResizeTimeoutRef.current = null;
      resizeFilterInput();
    }, FILTER_RESIZE_THROTTLE_MS - elapsed);
  }, [resizeFilterInput]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const nextEvaluation = evaluate(jsonText, filterText);
      const nextTableModel = createTableModel(nextEvaluation.filteredValue);

      setEvaluation(nextEvaluation);
      setSortState((current) =>
        current && !nextTableModel?.columnKeys.includes(current.columnKey) ? null : current,
      );
      setCopyStatus("");
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [jsonText, filterText]);

  useEffect(() => {
    window.addEventListener("resize", scheduleFilterResize);

    return () => {
      window.removeEventListener("resize", scheduleFilterResize);
      if (filterResizeTimeoutRef.current !== null) {
        window.clearTimeout(filterResizeTimeoutRef.current);
        filterResizeTimeoutRef.current = null;
      }
    };
  }, [scheduleFilterResize]);

  useEffect(() => {
    const outputInput = outputInputRef.current;
    if (!outputInput) return;

    function measureOutputWidth() {
      if (!outputInput || outputInput.clientWidth === 0) return;

      const styles = window.getComputedStyle(outputInput);
      const horizontalPadding =
        (Number.parseFloat(styles.paddingLeft) || 0) +
        (Number.parseFloat(styles.paddingRight) || 0);
      const contentWidth = outputInput.clientWidth - horizontalPadding;
      const measuringText = document.createElement("span");
      measuringText.style.position = "absolute";
      measuringText.style.visibility = "hidden";
      measuringText.style.whiteSpace = "pre";
      measuringText.style.fontFamily = styles.fontFamily;
      measuringText.style.fontSize = styles.fontSize;
      measuringText.style.fontStyle = styles.fontStyle;
      measuringText.style.fontWeight = styles.fontWeight;
      measuringText.textContent = "0".repeat(100);
      document.body.append(measuringText);
      const measuredWidth = measuringText.getBoundingClientRect().width;
      measuringText.remove();

      const fallbackCharacterWidth = (Number.parseFloat(styles.fontSize) || 14) * 0.6;
      const characterWidth = measuredWidth > 0 ? measuredWidth / 100 : fallbackCharacterWidth;
      setOutputMaximumColumns(Math.max(1, Math.floor(contentWidth / characterWidth)));
    }

    measureOutputWidth();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measureOutputWidth);
      return () => window.removeEventListener("resize", measureOutputWidth);
    }

    const observer = new ResizeObserver(measureOutputWidth);
    observer.observe(outputInput);

    return () => observer.disconnect();
  }, []);

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(output);
      setCopyStatus("Copied to clipboard.");
    } catch {
      setCopyStatus("Could not copy. Select the output and copy it manually.");
    }
  }

  function selectOutputView(view: OutputView, moveFocus = false) {
    setOutputView(view);
    if (moveFocus) {
      (view === "tree" ? treeTabRef : tableTabRef).current?.focus();
    }
  }

  function handleOutputTabKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    let nextView: OutputView | null = null;

    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      nextView = outputView === "tree" ? "table" : "tree";
    } else if (event.key === "Home") {
      nextView = "tree";
    } else if (event.key === "End") {
      nextView = "table";
    }

    if (!nextView) return;
    event.preventDefault();
    selectOutputView(nextView, true);
  }

  function toggleColumnSort(columnKey: string) {
    setSortState((current) => {
      if (!current || current.columnKey !== columnKey) {
        return { columnKey, direction: "ascending" };
      }

      if (current.direction === "ascending") {
        return { columnKey, direction: "descending" };
      }

      return null;
    });
  }

  function handleJsonChange(value: string) {
    setJsonText(value);
    setPasteVersions(null);
    setShowingFormattedPaste(false);
    setFileStatus(null);
  }

  async function handleJsonFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    const loadId = ++fileLoadIdRef.current;
    setFileStatus({ message: `Loading ${file.name}…`, isError: false });

    try {
      const text = await file.text();
      if (loadId !== fileLoadIdRef.current) return;

      handleJsonChange(text);
      setFileStatus({ message: `Loaded ${file.name}.`, isError: false });
    } catch {
      if (loadId !== fileLoadIdRef.current) return;
      setFileStatus({ message: `Could not load ${file.name}.`, isError: true });
    }
  }

  function replaceWithPastedText(raw: string) {
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

  async function pasteClipboardContent() {
    setIsReadingClipboard(true);
    setFileStatus({ message: "Reading clipboard…", isError: false });

    try {
      const text = await navigator.clipboard.readText();
      replaceWithPastedText(text);
      setFileStatus({ message: "Pasted clipboard content.", isError: false });
    } catch {
      setFileStatus({
        message: "Could not read the clipboard. Allow clipboard access and try again.",
        isError: true,
      });
    } finally {
      setIsReadingClipboard(false);
    }
  }

  function handleJsonPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const pastedText = event.clipboardData.getData("text");
    const selectionStart = event.currentTarget.selectionStart;
    const selectionEnd = event.currentTarget.selectionEnd;
    const raw = `${jsonText.slice(0, selectionStart)}${pastedText}${jsonText.slice(selectionEnd)}`;

    event.preventDefault();
    setFileStatus(null);
    replaceWithPastedText(raw);
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
              className="paste-button"
              onClick={pasteClipboardContent}
              disabled={isReadingClipboard}
            >
              {isReadingClipboard ? "Pasting…" : "Paste content"}
            </button>
            <button
              type="button"
              className="load-button"
              onClick={() => fileInputRef.current?.click()}
            >
              Load JSON file
            </button>
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
        <input
          ref={fileInputRef}
          className="visually-hidden"
          type="file"
          accept=".json,application/json"
          aria-label="JSON file"
          onChange={handleJsonFileChange}
        />
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
        <p
          className={`field-message file-message ${fileStatus?.isError ? "error-message" : ""}`}
          aria-live="polite"
        >
          {fileStatus?.message ?? ""}
        </p>
      </div>

      <div className="pane result-pane">
        <div className="filter-block">
          <label htmlFor="filter-input">
            <span className="step-number">02</span>
            Filter expression
          </label>
          <textarea
            ref={filterInputRef}
            id="filter-input"
            className="filter-input"
            aria-label="Filter expression"
            value={filterText}
            onChange={(event) => {
              setFilterText(event.target.value);
              scheduleFilterResize();
            }}
            placeholder={'name,status,metadata["created,at"]'}
            spellCheck={false}
            autoComplete="off"
            rows={1}
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
          <div className="output-actions">
            <label className="compact-toggle">
              <input
                type="checkbox"
                checked={compactOutput}
                onChange={(event) => {
                  setCompactOutput(event.target.checked);
                  setCopyStatus("");
                }}
              />
              Compact output
            </label>
            <button
              type="button"
              className="copy-button"
              onClick={copyOutput}
              disabled={!output}
            >
              Copy JSON
            </button>
          </div>
        </div>
        <div className="output-tabs" role="tablist" aria-label="Filtered output views">
          <button
            ref={treeTabRef}
            id={treeTabId}
            type="button"
            className="output-tab"
            role="tab"
            aria-selected={outputView === "tree"}
            aria-controls={treePanelId}
            tabIndex={outputView === "tree" ? 0 : -1}
            onClick={() => selectOutputView("tree")}
            onKeyDown={handleOutputTabKeyDown}
          >
            Tree
          </button>
          <button
            ref={tableTabRef}
            id={tableTabId}
            type="button"
            className="output-tab"
            role="tab"
            aria-selected={outputView === "table"}
            aria-controls={tablePanelId}
            tabIndex={outputView === "table" ? 0 : -1}
            onClick={() => selectOutputView("table")}
            onKeyDown={handleOutputTabKeyDown}
          >
            Table
          </button>
        </div>
        <div
          id={treePanelId}
          className="output-panel tree-panel"
          role="tabpanel"
          aria-labelledby={treeTabId}
          hidden={outputView !== "tree"}
        >
          <label className="visually-hidden" htmlFor="json-output">
            Filtered JSON output
          </label>
          <textarea
            ref={outputInputRef}
            id="json-output"
            className="code-area output-area"
            value={output}
            placeholder="Filtered JSON appears here"
            readOnly
            spellCheck={false}
          />
        </div>
        <div
          id={tablePanelId}
          className="output-panel table-panel"
          role="tabpanel"
          aria-labelledby={tableTabId}
          hidden={outputView !== "table"}
        >
          {!tableModel ? (
            <p className="table-empty">No object array is available in the filtered output.</p>
          ) : tableModel.columns.length === 0 ? (
            <p className="table-empty">The first object array has no properties to display.</p>
          ) : (
            <div className="table-scroll">
              <table className="result-table">
                <thead>
                  <tr>
                    {tableModel.columns.map((column, columnIndex) => {
                      const columnKey = tableModel.columnKeys[columnIndex];
                      const direction =
                        activeSort?.columnKey === columnKey ? activeSort.direction : null;

                      return (
                        <th
                          key={`${columnIndex}:${columnKey}`}
                          scope="col"
                          aria-sort={direction ?? "none"}
                        >
                          <button
                            type="button"
                            className="sort-button"
                            onClick={() => toggleColumnSort(columnKey)}
                          >
                            <span>{column}</span>
                            {direction ? (
                              <span className="sort-indicator" aria-hidden="true">
                                {direction === "ascending" ? "↑" : "↓"}
                              </span>
                            ) : null}
                          </button>
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {sortedRowIndices.map((rowIndex) => (
                    <tr key={rowIndex}>
                      {tableModel.rows[rowIndex].map((cell, columnIndex) => (
                        <td key={`${columnIndex}:${tableModel.columns[columnIndex]}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <p className="copy-status" aria-live="polite">
          {copyStatus}
        </p>
      </div>
    </section>
  );
}
