import type { TableModel } from "./table-model";

function formatTsvCell(value: string): string {
  if (!/[\t\r\n"]/.test(value)) return value;
  return `"${value.replaceAll('"', '""')}"`;
}

function formatTsvRow(values: readonly string[]): string {
  return values.map(formatTsvCell).join("\t");
}

export function formatTableForClipboard(
  model: TableModel,
  rowIndices: readonly number[],
): string {
  return [model.columns, ...rowIndices.map((index) => model.rows[index])]
    .map(formatTsvRow)
    .join("\n");
}
