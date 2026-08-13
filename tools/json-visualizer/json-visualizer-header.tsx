"use client";

import Link from "next/link";
import { useId, useState } from "react";

export function JsonVisualizerHeader() {
  const contentId = useId();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <header className={`tool-hero ${isCollapsed ? "is-collapsed" : ""}`}>
      <div id={contentId} className="tool-hero-content" hidden={isCollapsed}>
        <div>
          <Link className="back-link" href="/">
            ← Back to Utilities
          </Link>
          <h1>JSON Visualizer</h1>
        </div>
        <div className="tool-hero-aside">
          <p className="tool-hero-copy">
            Paste a document, describe the keys you need, and keep only the matching branches.
            Your data never leaves this tab.
          </p>
          <button
            type="button"
            className="header-toggle-button"
            aria-expanded={!isCollapsed}
            aria-controls={contentId}
            onClick={() => setIsCollapsed(true)}
          >
            <span aria-hidden="true">↑</span>
            Collapse header
          </button>
        </div>
      </div>
      <button
        type="button"
        className="header-expand-button"
        aria-expanded={!isCollapsed}
        aria-controls={contentId}
        hidden={!isCollapsed}
        onClick={() => setIsCollapsed(false)}
      >
        <span aria-hidden="true">↓</span>
        Expand header
      </button>
    </header>
  );
}
