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
  {
    slug: "certificate-inspector",
    title: "Certificate Inspector",
    description:
      "Inspect PKI certificates, PEM/DER files, and password-protected PKCS#12 bundles locally, with private-key metadata only.",
    href: "/certificate-inspector",
  },
  {
    slug: "app-insights-stack-parser",
    title: "App Insights Stack Parser",
    description:
      "Format Azure App Insights exception details into individual tables with readable C# stack traces.",
    href: "/app-insights-stack-parser",
  },
] as const satisfies readonly ToolDefinition[];
