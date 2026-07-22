export type Culture = "en" | "pt";

export type Direction = "excel-to-sheets" | "sheets-to-excel";

export interface InterchangePreferences {
  direction: Direction;
  excelCulture: Culture;
  sheetsCulture: Culture;
}

export const PREFERENCES_STORAGE_KEY = "excel-sheets-interchange.preferences.v1";

export const DEFAULT_PREFERENCES: InterchangePreferences = {
  direction: "excel-to-sheets",
  excelCulture: "en",
  sheetsCulture: "en",
};

const CULTURE_SEPARATORS: Record<Culture, { decimal: string; grouping: string }> = {
  en: { decimal: ".", grouping: "," },
  pt: { decimal: ",", grouping: "." },
};

const CURRENCY_SYMBOL_PATTERN = /\p{Sc}/gu;
const CELL_SEPARATOR_PATTERN = /^(?:\t|\r\n|\r|\n)$/;

function escapeForRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCulture(value: unknown): value is Culture {
  return value === "en" || value === "pt";
}

function isDirection(value: unknown): value is Direction {
  return value === "excel-to-sheets" || value === "sheets-to-excel";
}

export function parsePreferences(value: string | null): InterchangePreferences | null {
  if (!value) return null;

  try {
    const parsed = JSON.parse(value) as Partial<InterchangePreferences>;
    if (
      isDirection(parsed.direction) &&
      isCulture(parsed.excelCulture) &&
      isCulture(parsed.sheetsCulture)
    ) {
      return {
        direction: parsed.direction,
        excelCulture: parsed.excelCulture,
        sheetsCulture: parsed.sheetsCulture,
      };
    }
  } catch {
    // Invalid stored preferences are ignored in favor of the defaults.
  }

  return null;
}

export function getConversionCultures(preferences: InterchangePreferences): {
  sourceCulture: Culture;
  targetCulture: Culture;
} {
  if (preferences.direction === "excel-to-sheets") {
    return {
      sourceCulture: preferences.excelCulture,
      targetCulture: preferences.sheetsCulture,
    };
  }

  return {
    sourceCulture: preferences.sheetsCulture,
    targetCulture: preferences.excelCulture,
  };
}

export function convertCell(cell: string, sourceCulture: Culture, targetCulture: Culture): string {
  if (!cell) return cell;

  const candidate = cell.replace(CURRENCY_SYMBOL_PATTERN, "").trim();
  if (candidate === "-") return "0";

  const { decimal, grouping } = CULTURE_SEPARATORS[sourceCulture];
  const escapedDecimal = escapeForRegularExpression(decimal);
  const escapedGrouping = escapeForRegularExpression(grouping);
  const integer = `(?:\\d+|\\d{1,3}(?:${escapedGrouping}\\d{3})+)`;
  const numberPattern = new RegExp(`^[+-]?(?:${integer}(?:${escapedDecimal}\\d+)?|${escapedDecimal}\\d+)$`);

  if (!numberPattern.test(candidate)) return cell;

  const ungrouped = candidate.split(grouping).join("");
  const decimalIndex = ungrouped.indexOf(decimal);
  if (decimalIndex === -1) return ungrouped;

  const whole = ungrouped.slice(0, decimalIndex);
  const fraction = ungrouped.slice(decimalIndex + decimal.length);
  return `${whole}${CULTURE_SEPARATORS[targetCulture].decimal}${fraction}`;
}

export function convertTabSeparatedText(
  text: string,
  sourceCulture: Culture,
  targetCulture: Culture,
): string {
  return text
    .split(/(\t|\r\n|\r|\n)/)
    .map((part) =>
      CELL_SEPARATOR_PATTERN.test(part) ? part : convertCell(part, sourceCulture, targetCulture),
    )
    .join("");
}
