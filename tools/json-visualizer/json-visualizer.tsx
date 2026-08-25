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
import {
  filterJson,
  FilterSyntaxError,
  parseFilter,
  type FilterOverwriteError,
  type JsonValue,
} from "./filter";
import { IconButton } from "./icon-button";
import { createTableModel } from "./table-model";
import { getSortedRowIndices, type SortDirection } from "./table-sort";
import { formatTableForClipboard } from "./table-clipboard";

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
  filterErrors: string[];
  overwriteErrors: FilterOverwriteError[];
}

type OutputView = "tree" | "table";

interface SortState {
  columnKey: string;
  direction: SortDirection;
}

type SortStates = Record<string, SortState | undefined>;

const ROOT_TABLE_SCOPE = "root";

function getNextSortState(
  current: SortState | undefined,
  columnKey: string,
): SortState | undefined {
  if (!current || current.columnKey !== columnKey) {
    return { columnKey, direction: "ascending" };
  }

  if (current.direction === "ascending") {
    return { columnKey, direction: "descending" };
  }

  return undefined;
}

interface JsonTableProps {
  model: NonNullable<ReturnType<typeof createTableModel>>;
  scope: string;
  sortStates: SortStates;
  onToggleSort: (scope: string, columnKey: string) => void;
  overwriteErrors: readonly FilterOverwriteError[];
  nested?: boolean;
  label?: string;
}

function JsonTable({
  model,
  scope,
  sortStates,
  onToggleSort,
  overwriteErrors,
  nested = false,
  label,
}: JsonTableProps) {
  const overwriteTooltipPrefix = useId();
  const configuredSort = sortStates[scope];
  const activeSort =
    configuredSort && model.columnKeys.includes(configuredSort.columnKey)
      ? configuredSort
      : undefined;
  const sortedRowIndices = activeSort
    ? getSortedRowIndices(model, activeSort.columnKey, activeSort.direction)
    : model.rows.map((_, index) => index);

  return (
    <table
      className={`result-table ${nested ? "nested-result-table" : ""}`}
      aria-label={label}
    >
      <thead>
        <tr>
          {model.columns.map((column, columnIndex) => {
            const columnKey = model.columnKeys[columnIndex];
            const direction = activeSort?.columnKey === columnKey ? activeSort.direction : null;

            return (
              <th key={`${columnIndex}:${columnKey}`} scope="col" aria-sort={direction ?? "none"}>
                <button
                  type="button"
                  className="sort-button"
                  onClick={() => onToggleSort(scope, columnKey)}
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
            {model.rows[rowIndex].map((cell, columnIndex) => {
              const value = model.sortValues[rowIndex][columnIndex];
              const columnKey = model.columnKeys[columnIndex];
              const nestedScope = JSON.stringify([scope, columnKey]);
              const cellOverwriteErrors = overwriteErrors.filter(
                (error) =>
                  error.target === model.rowObjects[rowIndex] &&
                  error.propertyName === model.columnParents[columnIndex],
              );
              const overwriteTooltipId = `${overwriteTooltipPrefix}-${rowIndex}-${columnIndex}`;

              return (
                <td
                  key={`${columnIndex}:${columnKey}`}
                  className={cellOverwriteErrors.length > 0 ? "overwrite-error-cell" : undefined}
                  tabIndex={cellOverwriteErrors.length > 0 ? 0 : undefined}
                  aria-describedby={
                    cellOverwriteErrors.length > 0 ? overwriteTooltipId : undefined
                  }
                >
                  {Array.isArray(value) ? (
                    <NestedTableCell
                      value={value}
                      fallback={cell}
                      scope={nestedScope}
                      label={`${model.columns[columnIndex]} subtable`}
                      sortStates={sortStates}
                      onToggleSort={onToggleSort}
                      overwriteErrors={overwriteErrors}
                    />
                  ) : (
                    cell
                  )}
                  {cellOverwriteErrors.length > 0 ? (
                    <span
                      id={overwriteTooltipId}
                      className="overwrite-error-tooltip"
                      role="tooltip"
                    >
                      {cellOverwriteErrors.map((error, index) => (
                        <span key={`${index}:${error.message}`}>{error.message}</span>
                      ))}
                    </span>
                  ) : null}
                </td>
              );
            })}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

interface NestedTableCellProps {
  value: JsonValue[];
  fallback: string;
  scope: string;
  label: string;
  sortStates: SortStates;
  onToggleSort: (scope: string, columnKey: string) => void;
  overwriteErrors: readonly FilterOverwriteError[];
}

function NestedTableCell({
  value,
  fallback,
  scope,
  label,
  sortStates,
  onToggleSort,
  overwriteErrors,
}: NestedTableCellProps) {
  const model = useMemo(() => createTableModel(value), [value]);

  if (!model || model.columns.length === 0) return fallback;

  return (
    <div className="nested-table-scroll">
      <JsonTable
        model={model}
        scope={scope}
        sortStates={sortStates}
        onToggleSort={onToggleSort}
        overwriteErrors={overwriteErrors}
        nested
        label={label}
      />
    </div>
  );
}

function evaluate(jsonText: string, filterText: string): Evaluation {
  let clauses;
  const filterErrors: string[] = [];

  try {
    clauses = parseFilter(filterText);
  } catch (error) {
    filterErrors.push(error instanceof FilterSyntaxError ? error.message : "The filter is invalid.");
  }

  if (!jsonText.trim()) {
    return {
      output: "",
      filteredValue: null,
      jsonError: null,
      filterErrors,
      overwriteErrors: [],
    };
  }

  let value: JsonValue;
  try {
    value = JSON.parse(jsonText) as JsonValue;
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The document is not valid JSON.";
    return {
      output: "",
      filteredValue: null,
      jsonError: detail,
      filterErrors,
      overwriteErrors: [],
    };
  }

  if (!clauses) {
    return {
      output: "",
      filteredValue: null,
      jsonError: null,
      filterErrors,
      overwriteErrors: [],
    };
  }

  const filtered = filterJson(value, clauses);
  return {
    output: JSON.stringify(filtered.value, null, 2),
    filteredValue: filtered.value,
    jsonError: null,
    filterErrors: filtered.errors ?? [],
    overwriteErrors: filtered.overwriteErrors ?? [],
  };
}

interface JsonVisualizerProps {
  isHeaderCollapsed?: boolean;
  onHeaderCollapsedChange?: (isCollapsed: boolean) => void;
}

export function JsonVisualizer({
  isHeaderCollapsed = false,
  onHeaderCollapsedChange = () => undefined,
}: JsonVisualizerProps = {}) {
  const jsonErrorId = useId();
  const filterHelpId = useId();
  const filterErrorId = useId();
  const treeTabId = useId();
  const tableTabId = useId();
  const treePanelId = useId();
  const tablePanelId = useId();
  const inputPaneContentId = useId();
  const [jsonText, setJsonText] = useState("");
  const [filterText, setFilterText] = useState("");
  const [evaluation, setEvaluation] = useState<Evaluation>(() => evaluate("", ""));
  const [compactOutput, setCompactOutput] = useState(true);
  const [outputMaximumColumns, setOutputMaximumColumns] = useState(Infinity);
  const [outputView, setOutputView] = useState<OutputView>("tree");
  const [sortStates, setSortStates] = useState<SortStates>({});
  const [copyStatus, setCopyStatus] = useState("");
  const [pasteVersions, setPasteVersions] = useState<PasteVersions | null>(null);
  const [showingFormattedPaste, setShowingFormattedPaste] = useState(false);
  const [isReadingClipboard, setIsReadingClipboard] = useState(false);
  const [fileStatus, setFileStatus] = useState<FileStatus | null>(null);
  const [isInputCollapsed, setIsInputCollapsed] = useState(false);
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
      setSortStates((current) => {
        const rootSort = current[ROOT_TABLE_SCOPE];
        if (!rootSort || nextTableModel?.columnKeys.includes(rootSort.columnKey)) return current;

        const next = { ...current };
        delete next[ROOT_TABLE_SCOPE];
        return next;
      });
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
    const isCopyingTable = outputView === "table";
    const rootSort = sortStates[ROOT_TABLE_SCOPE];
    const tableRowIndices =
      tableModel && rootSort && tableModel.columnKeys.includes(rootSort.columnKey)
        ? getSortedRowIndices(tableModel, rootSort.columnKey, rootSort.direction)
        : tableModel?.rows.map((_, index) => index) ?? [];
    const clipboardText =
      isCopyingTable && tableModel
        ? formatTableForClipboard(tableModel, tableRowIndices)
        : output;

    try {
      await navigator.clipboard.writeText(clipboardText);
      setCopyStatus("Copied to clipboard.");
    } catch {
      setCopyStatus(
        isCopyingTable
          ? "Could not copy the table."
          : "Could not copy. Select the output and copy it manually.",
      );
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

  function toggleColumnSort(scope: string, columnKey: string) {
    setSortStates((current) => {
      const nextSort = getNextSortState(current[scope], columnKey);
      const next = { ...current };

      if (nextSort) next[scope] = nextSort;
      else delete next[scope];

      return next;
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

  const filterDescribedBy = [filterHelpId, evaluation.filterErrors.length > 0 ? filterErrorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={`workspace ${isInputCollapsed ? "input-collapsed" : ""}`}
      aria-label="JSON filtering workspace"
    >
      <div className={`pane input-pane ${isInputCollapsed ? "is-collapsed" : ""}`}>
        <IconButton
          icon="chevron-right"
          label="Expand input"
          className="collapsed-input-button"
          aria-expanded={!isInputCollapsed}
          aria-controls={inputPaneContentId}
          hidden={!isInputCollapsed}
          onClick={() => setIsInputCollapsed(false)}
        />
        <div
          id={inputPaneContentId}
          className="input-pane-content"
          hidden={isInputCollapsed}
        >
          <div className="section-heading">
          <div>
            <span className="step-number">01</span>
            <h2>Source JSON</h2>
          </div>
          <div className="source-actions">
            <IconButton
              icon="chevron-left"
              label="Collapse input"
              className="pane-toggle-button"
              aria-expanded={!isInputCollapsed}
              aria-controls={inputPaneContentId}
              onClick={() => setIsInputCollapsed(true)}
            />
            <IconButton
              icon="clipboard"
              label={isReadingClipboard ? "Pasting content" : "Paste content"}
              className="paste-button"
              onClick={pasteClipboardContent}
              disabled={isReadingClipboard}
            />
            <IconButton
              icon="file"
              label="Load JSON file"
              className="load-button"
              onClick={() => fileInputRef.current?.click()}
            />
            <IconButton
              icon="format"
              label={showingFormattedPaste ? "Revert formatting" : "Apply formatting"}
              className="format-button"
              onClick={togglePasteFormatting}
              disabled={!pasteVersions}
            />
            <IconButton
              icon={isHeaderCollapsed ? "header-expand" : "header-collapse"}
              label={isHeaderCollapsed ? "Expand header" : "Collapse header"}
              className="header-toggle-button"
              aria-expanded={!isHeaderCollapsed}
              onClick={() => onHeaderCollapsedChange(!isHeaderCollapsed)}
            />
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
      </div>

      <div className="pane result-pane">
        <div className="filter-block">
          <div className="filter-label-row">
            <label htmlFor="filter-input">
              <span className="step-number">02</span>
              Filter expression
            </label>
            <span className="help-tooltip-wrapper">
              <button
                type="button"
                className="help-tooltip-button"
                aria-label="Filter expression help"
                aria-describedby={filterHelpId}
              >
                ?
              </button>
              <span id={filterHelpId} className="filter-help-tooltip" role="tooltip">
                Use a,b for keys anywhere or x[a,b] for direct children, including items in an x
                array. Nest brackets for deeper direct children, or use *[...] to search descendant
                levels recursively. Use $[x] to select x only on the root object, or on each direct
                object item when the root is an array. Filter values with x[id,status=active].
                Append ^ to pull a property to the root, or ^NewName to pull and rename it.
              </span>
            </span>
          </div>
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
            aria-invalid={evaluation.filterErrors.length > 0}
            aria-describedby={filterDescribedBy}
          />
          <div
            id={filterErrorId}
            className={`field-message error-message ${evaluation.filterErrors.length > 0 ? "" : "is-hidden"}`}
            role="alert"
          >
            {evaluation.filterErrors.length > 0
              ? evaluation.filterErrors.map((error, index) => <div key={`${index}:${error}`}>{error}</div>)
              : "Valid filter"}
          </div>
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
            <IconButton
              icon="copy"
              label={outputView === "table" ? "Copy table" : "Copy JSON"}
              className="copy-button"
              onClick={copyOutput}
              disabled={
                outputView === "table"
                  ? !tableModel || tableModel.columns.length === 0
                  : !output
              }
            />
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
            JSON
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
              <JsonTable
                model={tableModel}
                scope={ROOT_TABLE_SCOPE}
                sortStates={sortStates}
                onToggleSort={toggleColumnSort}
                overwriteErrors={evaluation.overwriteErrors}
              />
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
