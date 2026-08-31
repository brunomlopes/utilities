import type { Metadata } from "next";
import Link from "next/link";
import { HtmlCleaner } from "@/tools/html-cleaner/html-cleaner";

export const metadata: Metadata = {
  title: "HTML Cleaner",
  description: "Remove selected HTML nodes and attributes locally in your browser.",
};

export default function HtmlCleanerPage() {
  return (
    <main className="html-cleaner-shell">
      <header className="html-cleaner-hero">
        <div>
          <Link className="html-cleaner-back" href="/">
            ← Back to Utilities
          </Link>
          <h1>HTML Cleaner</h1>
        </div>
        <p className="html-cleaner-hero-copy">
          Paste HTML, choose the nodes and attributes to remove, and copy the cleaned markup. Your
          data never leaves this tab.
        </p>
      </header>
      <HtmlCleaner />
    </main>
  );
}
