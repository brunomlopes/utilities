import type { Metadata } from "next";
import { JsonVisualizerTool } from "@/tools/json-visualizer/json-visualizer-tool";

export const metadata: Metadata = {
  title: "JSON Visualizer",
  description: "Filter and prune JSON locally in your browser.",
};

export default function JsonVisualizerPage() {
  return (
    <main className="tool-shell">
      <JsonVisualizerTool />
    </main>
  );
}
