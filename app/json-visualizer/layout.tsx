import type { ReactNode } from "react";
import "@/tools/json-visualizer/json-visualizer.css";

export default function JsonVisualizerLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
