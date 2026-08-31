export interface ToolDefinition {
  slug: string;
  title: string;
  description: string;
  href: `/${string}`;
}

export const utilities = [
  {
    slug: "json-visualizer",
    title: "JSON Visualizer",
    description:
      "Filter JSON by property name, preserve the matching structure, and copy the result without sending data anywhere.",
    href: "/json-visualizer",
  },
  {
    slug: "excel-sheets-interchange",
    title: "Excel–Sheets Interchange",
    description:
      "Convert pasted numbers between Excel and Google Sheets cultures while keeping spreadsheet data in your browser.",
    href: "/excel-sheets-interchange",
  },
  {
    slug: "html-cleaner",
    title: "HTML Cleaner",
    description:
      "Remove selected nodes and attributes from HTML locally in your browser and copy the cleaned markup.",
    href: "/html-cleaner",
  },
] as const satisfies readonly ToolDefinition[];
