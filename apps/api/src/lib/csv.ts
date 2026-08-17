/**
 * CSV serialization with RFC 4180 quoting plus spreadsheet formula-injection
 * defence.
 *
 * Member names are attacker-controlled (self-registration), so both matter:
 * an unescaped `"` corrupts the row and silently shifts every later column,
 * and a leading `= + - @` makes Excel/Sheets execute the cell on open.
 */

/** Cells starting with these are treated as formulas by Excel/Sheets. */
const FORMULA_PREFIXES = ["=", "+", "-", "@"];

/**
 * Quote one cell. Doubles embedded quotes per RFC 4180, and prefixes a leading
 * apostrophe when the value would otherwise be parsed as a formula.
 */
export function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';
  let s = String(value);

  // Neutralize formulas. The apostrophe is stripped on display but stops
  // evaluation. Tab/CR are checked too since they can precede the trigger char.
  const firstChar = s.trimStart().charAt(0);
  if (FORMULA_PREFIXES.includes(firstChar)) s = `'${s}`;

  return `"${s.replace(/"/g, '""')}"`;
}

/** Serialize a header + rows into a CSV document (CRLF line endings). */
export function toCsv(header: string[], rows: unknown[][]): string {
  const lines = [
    header.map(csvCell).join(","),
    ...rows.map((row) => row.map(csvCell).join(",")),
  ];
  return lines.join("\r\n");
}
