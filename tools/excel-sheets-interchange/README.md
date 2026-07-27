# Excel–Sheets Interchange

A browser-only utility for moving tab-separated cells between Microsoft Excel and Google Sheets when the two applications use different number cultures.

## Behavior

- Choose English or Portuguese number conventions independently for Excel and Google Sheets.
- Switch the copy direction without changing either application's saved culture.
- Paste tab-separated cells manually or read them from the clipboard, then copy the converted result.
- Convert valid signed integers and decimals, including values grouped with culture-specific
  separators or common spreadsheet spacing, remove grouping and surrounding currency symbols,
  and preserve fractional precision.
- Treat a dash, with or without a currency symbol, as the numeric value zero.
- Keep text, unsupported values, empty cells, tabs, and line breaks unchanged.

The selected direction and cultures are saved in local storage. Pasted and converted spreadsheet data is never stored or sent anywhere.

## Development

The conversion logic is in `conversion.ts`, the client interface is in `excel-sheets-interchange.tsx`, and their Vitest coverage lives beside them. The static route is `/excel-sheets-interchange`.
