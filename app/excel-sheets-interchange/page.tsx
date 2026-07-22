import type { Metadata } from "next";
import Link from "next/link";
import { ExcelSheetsInterchange } from "@/tools/excel-sheets-interchange/excel-sheets-interchange";

export const metadata: Metadata = {
  title: "Excel–Sheets Interchange",
  description: "Convert pasted numbers between Excel and Google Sheets cultures in your browser.",
};

export default function ExcelSheetsInterchangePage() {
  return (
    <main className="interchange-shell">
      <header className="interchange-hero">
        <div>
          <Link className="interchange-back" href="/">
            ← Back to Utilities
          </Link>
          <h1>Excel–Sheets Interchange</h1>
        </div>
        <p className="interchange-hero-copy">
          Paste cells from Excel or Google Sheets and convert number separators for the other app.
          Your spreadsheet data stays in this tab.
        </p>
      </header>
      <ExcelSheetsInterchange />
    </main>
  );
}
