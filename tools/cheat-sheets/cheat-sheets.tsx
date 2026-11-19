"use client";

import Link from "next/link";
import { sheets, type CheatSheet } from "./sheets";
import "./cheatsheet.css";

export function CheatSheetsIndex() {
  return (
    <main className="cheat-sheet">
      <div className="container">
        <nav className="sheet-nav" aria-label="Utilities navigation"><Link href="/">← Back to Utilities</Link></nav>
        <header><div><h1><span className="hl">Cheat</span> Sheets</h1><p className="subtitle">Everyday command references</p></div></header>
        <div className="grid grid-2">
          {sheets.map((sheet) => (
            <Link key={sheet.slug} href={'/cheat-sheets/' + sheet.slug} className="card catalog-card">
              <div className="card-body"><h2>{sheet.title} →</h2><p>{sheet.description}</p></div>
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}

export function CheatSheetPage({ sheet }: { sheet: CheatSheet }) {
  return (
    <main className="cheat-sheet">
      <nav className="container sheet-nav" aria-label="Cheat sheet navigation">
        <Link href="/cheat-sheets">← All cheat sheets</Link>
        {sheets.map((item) => (
          <Link key={item.slug} href={'/cheat-sheets/' + item.slug} aria-current={item.slug === sheet.slug ? "page" : undefined}>{item.title}</Link>
        ))}
      </nav>
      {/* Trusted, repository-owned HTML imported from previous; never user input. */}
      <div dangerouslySetInnerHTML={{ __html: sheet.html.replace(/class="card(?= |")/g, 'tabindex="0" class="card') }} />
    </main>
  );
}
