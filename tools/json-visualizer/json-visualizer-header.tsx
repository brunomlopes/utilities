import Link from "next/link";

interface JsonVisualizerHeaderProps {
  isCollapsed: boolean;
}

export function JsonVisualizerHeader({ isCollapsed }: JsonVisualizerHeaderProps) {
  return (
    <header className={`tool-hero ${isCollapsed ? "is-collapsed" : ""}`}>
      <div className="tool-hero-content" hidden={isCollapsed}>
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
      </div>
    </header>
  );
}
