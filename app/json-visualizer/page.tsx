import type { Metadata } from "next";
import Link from "next/link";
import { JsonVisualizer } from "@/tools/json-visualizer/json-visualizer";

export const metadata: Metadata = {
  title: "JSON Visualizer",
  description: "Filter and prune JSON locally in your browser.",
};

export default function JsonVisualizerPage() {
  return (
    <main className="tool-shell">
      <header className="tool-hero">
        <div>
          <Link className="back-link" href="/">
            ← Back to Utilities
          </Link>
          <h1>JSON Visualizer</h1>
        </div>
        <p className="tool-hero-copy">
          Paste a document, describe the keys you need, and keep only the matching branches.
          Your data never leaves this tab.
        </p>
      </header>
      <JsonVisualizer />
    </main>
  );
}
