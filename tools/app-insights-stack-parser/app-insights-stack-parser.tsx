"use client";

import Link from "next/link";
import { useMemo, useRef, useState } from "react";
import { copyOutput } from "./export";
import { exceptionDepths, exceptionLabels } from "./hierarchy";
import { formatStack, parseDetails } from "./parse";
import styles from "./styles.module.css";

export function AppInsightsStackParser() {
  const [input, setInput] = useState("");
  const [copyStatus, setCopyStatus] = useState("");
  const [copying, setCopying] = useState(false);
  const revision = useRef(0);
  function updateInput(value: string) {
    revision.current += 1;
    setInput(value);
    setCopyStatus("");
  }
  const result = useMemo(() => {
    if (!input.trim()) return { items: [], error: "" };
    try {
      return { items: parseDetails(input), error: "" };
    } catch (error) {
      return { items: [], error: error instanceof Error ? error.message : "Unable to parse details." };
    }
  }, [input]);
  const depths = useMemo(() => exceptionDepths(result.items), [result.items]);
  const labels = useMemo(() => exceptionLabels(result.items), [result.items]);

  async function copy(format: "rich" | "wiki") {
    const currentRevision = revision.current;
    setCopying(true);
    setCopyStatus("");
    try {
      await copyOutput(result.items, format);
      if (currentRevision === revision.current) setCopyStatus(format === "rich" ? "Rich text copied. Paste into Jira’s rich-text description editor." : "Wiki markup copied. Paste into Jira’s wiki-markup description editor.");
    } catch {
      if (currentRevision === revision.current) setCopyStatus("Copy failed. Use HTTPS or localhost and allow clipboard access. You can also select and copy the output manually.");
    } finally {
      setCopying(false);
    }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <Link href="/">← Back to Utilities</Link>
        <h1>App Insights Stack Parser</h1>
        <p>Paste exception details from Azure App Insights to read each exception and its C# stack trace. Everything stays in your browser.</p>
      </header>
      <div className={styles.workspace}>
        <section className={styles.inputPanel} aria-labelledby="input-heading">
          <div className={styles.toolbar}>
            <h2 id="input-heading"><label htmlFor="details-input">Details JSON</label></h2>
            <button type="button" disabled={!input} onClick={() => updateInput("")}>Clear</button>
          </div>
          <textarea id="details-input" value={input} onChange={(event) => updateInput(event.target.value)} spellCheck={false} placeholder="Paste the details JSON array here…" aria-invalid={Boolean(result.error)} aria-describedby={result.error ? "parse-error" : undefined} />
          {result.error && <p className={styles.error} id="parse-error" role="alert">{result.error}</p>}
        </section>
        <section className={styles.output} aria-labelledby="output-heading">
          <div className={styles.toolbar}>
            <h2 id="output-heading">Formatted exceptions</h2>
            <span role="status">{result.items.length} {result.items.length === 1 ? "item" : "items"}</span>
          </div>
          <div className={styles.toolbar}>
            <button type="button" disabled={!result.items.length || copying} onClick={() => void copy("rich")}>Copy rich text</button>
            <button type="button" disabled={!result.items.length || copying} onClick={() => void copy("wiki")}>Copy wiki markup</button>
          </div>
          {copyStatus && <p role="status">{copyStatus}</p>}
          {!input.trim() && <p className={styles.empty}>Paste details to display one table per exception.</p>}
          {input.trim() && !result.error && !result.items.length && <p className={styles.empty}>The details array is empty.</p>}
          {result.items.map((item, index) => (
            <div className={styles.exception} key={index}>
              <div className={styles.exceptionBody}>
              {depths[index] > 0 && <span className={styles.depthLines} aria-hidden="true" style={{ width: `${depths[index] * 16}px` }} />}
            <table className={styles.table}>
              <caption>{labels[index]}{" "}<span className={styles.screenReaderOnly}>— nesting level {depths[index]}</span></caption>

              <tbody>
                <tr>
                  {(["severityLevel", "type"] as const).map((field) => (
                    <td key={field}><span className={styles.label}>{field}</span><span>{item[field]}</span></td>
                  ))}
                </tr>
                <tr><td colSpan={2}><span className={styles.label}>message</span><div className={styles.message}>{item.message}</div></td></tr>
                <tr><td colSpan={2}><span className={styles.label}>parsedStack</span><pre>{formatStack(item.parsedStack) || "No stack frames available."}</pre></td></tr>
              </tbody>
            </table>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
