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
] as const satisfies readonly ToolDefinition[];
