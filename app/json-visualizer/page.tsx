import type { Metadata } from "next";
import { JsonVisualizer } from "@/tools/json-visualizer/json-visualizer";
import { JsonVisualizerHeader } from "@/tools/json-visualizer/json-visualizer-header";

export const metadata: Metadata = {
  title: "JSON Visualizer",
  description: "Filter and prune JSON locally in your browser.",
};

export default function JsonVisualizerPage() {
  return (
    <main className="tool-shell">
      <JsonVisualizerHeader />
      <JsonVisualizer />
    </main>
  );
}
