"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { formatStack, parseDetails } from "./parse";
import styles from "./styles.module.css";

export function AppInsightsStackParser() {
  const [input, setInput] = useState("");
  const result = useMemo(() => {
    if (!input.trim()) return { items: [], error: "" };
    try {
      return { items: parseDetails(input), error: "" };
    } catch (error) {
      return { items: [], error: error instanceof Error ? error.message : "Unable to parse details." };
    }
  }, [input]);

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
            <button type="button" disabled={!input} onClick={() => setInput("")}>Clear</button>
          </div>
          <textarea id="details-input" value={input} onChange={(event) => setInput(event.target.value)} spellCheck={false} placeholder="Paste the details JSON array here…" aria-invalid={Boolean(result.error)} aria-describedby={result.error ? "parse-error" : undefined} />
          {result.error && <p className={styles.error} id="parse-error" role="alert">{result.error}</p>}
        </section>
        <section className={styles.output} aria-labelledby="output-heading">
          <div className={styles.toolbar}>
            <h2 id="output-heading">Formatted exceptions</h2>
            <span role="status">{result.items.length} {result.items.length === 1 ? "item" : "items"}</span>
          </div>
          {!input.trim() && <p className={styles.empty}>Paste details to display one table per exception.</p>}
          {input.trim() && !result.error && !result.items.length && <p className={styles.empty}>The details array is empty.</p>}
          {result.items.map((item, index) => (
            <table className={styles.table} key={index}>
              <caption>Exception {index + 1}</caption>
              <colgroup><col style={{ width: "15%" }} /><col style={{ width: "15%" }} /><col style={{ width: "15%" }} /><col style={{ width: "55%" }} /></colgroup>
              <tbody>
                <tr>
                  {(["id", "outerId", "severityLevel", "type"] as const).map((field) => (
                    <td key={field}><span className={styles.label}>{field}</span><span>{item[field]}</span></td>
                  ))}
                </tr>
                <tr><td colSpan={4}><span className={styles.label}>message</span><div className={styles.message}>{item.message}</div></td></tr>
                <tr><td colSpan={4}><span className={styles.label}>parsedStack</span><pre>{formatStack(item.parsedStack) || "No stack frames available."}</pre></td></tr>
              </tbody>
            </table>
          ))}
        </section>
      </div>
    </main>
  );
}
