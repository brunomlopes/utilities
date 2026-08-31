import type { ReactNode } from "react";
import "@/tools/html-cleaner/html-cleaner.css";

export default function HtmlCleanerLayout({ children }: Readonly<{ children: ReactNode }>) {
  return children;
}
