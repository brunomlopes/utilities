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
const SPACE_GROUPING_PATTERN = /[ \u00a0\u202f]/gu;
const SPACE_GROUPING_CHARACTER_CLASS = "[ \\u00a0\\u202f]";

function escapeForRegularExpression(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isCulture(value: unknown): value is Culture {
  return value === "en" || value === "pt";
}

function isDirection(value: unknown): value is Direction {
  return value === "excel-to-sheets" || value === "sheets-to-excel";
}

function divideByHundred(value: string, decimal: string, targetDecimal: string): string {
  const sign = value.startsWith("+") || value.startsWith("-") ? value[0] : "";
  const unsignedValue = sign ? value.slice(1) : value;
  const decimalIndex = unsignedValue.indexOf(decimal);
  const whole = decimalIndex === -1 ? unsignedValue : unsignedValue.slice(0, decimalIndex);
  const fraction = decimalIndex === -1 ? "" : unsignedValue.slice(decimalIndex + decimal.length);
  const digits = `${whole}${fraction}`;
  const shiftedDecimalIndex = whole.length - 2;

  if (shiftedDecimalIndex <= 0) {
    return `${sign}0${targetDecimal}${"0".repeat(-shiftedDecimalIndex)}${digits}`;
  }

  return `${sign}${digits.slice(0, shiftedDecimalIndex)}${targetDecimal}${digits.slice(shiftedDecimalIndex)}`;
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

  let candidate = cell.replace(CURRENCY_SYMBOL_PATTERN, "").trim();
  if (candidate === "-") return "0";

  const isPercentage = candidate.endsWith("%");
  if (isPercentage) candidate = candidate.slice(0, -1).trimEnd();

  const { decimal, grouping } = CULTURE_SEPARATORS[sourceCulture];
  const escapedDecimal = escapeForRegularExpression(decimal);
  const escapedGrouping = escapeForRegularExpression(grouping);
  const cultureGroupedInteger = `\\d{1,3}(?:${escapedGrouping}\\d{3})+`;
  const spaceGroupedInteger = `\\d{1,3}(?:${SPACE_GROUPING_CHARACTER_CLASS}\\d{3})+`;
  const integer = `(?:\\d+|${cultureGroupedInteger}|${spaceGroupedInteger})`;
  const numberPattern = new RegExp(`^[+-]?(?:${integer}(?:${escapedDecimal}\\d+)?|${escapedDecimal}\\d+)$`);

  if (!numberPattern.test(candidate)) return cell;

  const ungrouped = candidate.split(grouping).join("").replace(SPACE_GROUPING_PATTERN, "");
  if (isPercentage) {
    return divideByHundred(ungrouped, decimal, CULTURE_SEPARATORS[targetCulture].decimal);
  }

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
