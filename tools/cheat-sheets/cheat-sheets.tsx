"use client";

import Link from "next/link";
import { sheets, type CheatSheet } from "./sheets";
import styles from "./cheat-sheets.module.css";

export function CheatSheetsIndex() {
  return (
    <main className={styles.page}>
      <Link href="/">← Back to Utilities</Link>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Everyday references</p>
        <h1>Cheat Sheets</h1>
        <p>Essential commands, organized by task. Pick a cheat sheet to get started.</p>
      </header>
      <div className={styles.grid}>
        {sheets.map((sheet) => (
          <Link key={sheet.slug} href={`/cheat-sheets/${sheet.slug}`} className={styles.card}>
            <h2>{sheet.title} <span aria-hidden="true">→</span></h2>
            <p>{sheet.description}</p>
          </Link>
        ))}
      </div>
    </main>
  );
}

export function CheatSheetPage({ sheet }: { sheet: CheatSheet }) {
  return (
    <main className={styles.page}>
      <nav className={styles.navigation} aria-label="Cheat sheet navigation">
        <Link href="/cheat-sheets">← All cheat sheets</Link>
        {sheets.map((item) => (
          <Link key={item.slug} href={`/cheat-sheets/${item.slug}`} aria-current={item.slug === sheet.slug ? "page" : undefined}>{item.title}</Link>
        ))}
      </nav>
      <header className={styles.hero}>
        <p className={styles.eyebrow}>Command reference</p>
        <h1>{sheet.title} cheat sheet</h1>
        <p>{sheet.description}</p>
      </header>
      <p className={styles.note}>{sheet.note}</p>
      <div className={styles.grid}>
        {sheet.sections.map((section) => (
          <section className={styles.section} key={section.title}>
            <h2>{section.title}</h2>
            <table>
              <thead><tr><th scope="col">Command</th><th scope="col">Action</th></tr></thead>
              <tbody>{section.commands.map(([command, description]) => (
                <tr key={command}><th scope="row"><code>{command}</code></th><td>{description}</td></tr>
              ))}</tbody>
            </table>
          </section>
        ))}
      </div>
      <footer className={styles.footer}>More details: <a href={sheet.source}>{sheet.title} reference documentation</a></footer>
    </main>
  );
}
