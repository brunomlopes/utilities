import type { JsonValue } from "./filter";
import type { TableModel } from "./table-model";

export type SortDirection = "ascending" | "descending";
type ComparisonMode = "number" | "string" | "boolean" | "text";

const caseInsensitiveCollator = new Intl.Collator(undefined, {
  sensitivity: "accent",
});

function isEmptySortValue(value: JsonValue | undefined): boolean {
  return value === undefined || value === "";
}

function comparePopulatedValues(
  left: JsonValue,
  right: JsonValue,
  leftDisplay: string,
  rightDisplay: string,
  comparisonMode: ComparisonMode,
): number {
  if (comparisonMode === "number") return (left as number) - (right as number);
  if (comparisonMode === "string") {
    return caseInsensitiveCollator.compare(left as string, right as string);
  }
  if (comparisonMode === "boolean") {
    return Number(left as boolean) - Number(right as boolean);
  }

  return caseInsensitiveCollator.compare(leftDisplay, rightDisplay);
}

function getComparisonMode(model: TableModel, columnIndex: number): ComparisonMode {
  const populatedValues = model.sortValues
    .map((row) => row[columnIndex])
    .filter((value): value is JsonValue => !isEmptySortValue(value));
  const firstType = typeof populatedValues[0];

  if (
    populatedValues.length > 0 &&
    populatedValues.every((value) => typeof value === firstType)
  ) {
    if (firstType === "number" || firstType === "string" || firstType === "boolean") {
      return firstType;
    }
  }

  return "text";
}

function compareRows(
  model: TableModel,
  columnIndex: number,
  comparisonMode: ComparisonMode,
  direction: SortDirection,
  leftIndex: number,
  rightIndex: number,
): number {
  const left = model.sortValues[leftIndex][columnIndex];
  const right = model.sortValues[rightIndex][columnIndex];
  const leftIsEmpty = isEmptySortValue(left);
  const rightIsEmpty = isEmptySortValue(right);

  if (leftIsEmpty || rightIsEmpty) {
    if (leftIsEmpty && rightIsEmpty) return leftIndex - rightIndex;
    return leftIsEmpty ? 1 : -1;
  }

  const comparison = comparePopulatedValues(
    left as JsonValue,
    right as JsonValue,
    model.rows[leftIndex][columnIndex],
    model.rows[rightIndex][columnIndex],
    comparisonMode,
  );

  if (comparison === 0) return leftIndex - rightIndex;
  return direction === "ascending" ? comparison : -comparison;
}

export function getSortedRowIndices(
  model: TableModel,
  columnKey: string,
  direction: SortDirection,
): number[] {
  const columnIndex = model.columnKeys.indexOf(columnKey);
  const rowIndices = model.rows.map((_, index) => index);

  if (columnIndex === -1) return rowIndices;
  const comparisonMode = getComparisonMode(model, columnIndex);

  return rowIndices.sort((leftIndex, rightIndex) =>
    compareRows(model, columnIndex, comparisonMode, direction, leftIndex, rightIndex),
  );
}
