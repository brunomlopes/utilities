import { JsonVisualizer } from "@/components/json-visualizer";

export default function Home() {
  return (
    <main className="app-shell">
      <header className="hero">
        <div>
          <p className="eyebrow">Browser-only utility</p>
          <h1>JSON Visualizer</h1>
        </div>
        <p className="hero-copy">
          Paste a document, describe the keys you need, and keep only the matching branches.
          Your data never leaves this tab.
        </p>
      </header>
      <JsonVisualizer />
    </main>
  );
}
