"use client";

import { useState } from "react";
import { JsonVisualizer } from "./json-visualizer";
import { JsonVisualizerHeader } from "./json-visualizer-header";

export function JsonVisualizerTool() {
  const [isHeaderCollapsed, setIsHeaderCollapsed] = useState(false);

  return (
    <>
      <JsonVisualizerHeader isCollapsed={isHeaderCollapsed} />
      <JsonVisualizer
        isHeaderCollapsed={isHeaderCollapsed}
        onHeaderCollapsedChange={setIsHeaderCollapsed}
      />
    </>
  );
}
