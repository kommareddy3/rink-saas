/**
 * Tiny CSV helpers shared by every tool page.
 *
 * Why hand-roll instead of using papaparse: we control all data sources
 * (objects with known shapes), so we can keep the bundle slim. If you
 * ever need to *read* user-uploaded CSVs in the browser, switch to
 * papaparse — it handles edge cases (BOMs, quoted newlines) we don't.
 */

/**
 * Escape a single CSV cell. Strings with commas, quotes, or newlines are
 * wrapped in double quotes and internal quotes are doubled. Numbers, booleans,
 * null and undefined are stringified.
 */
function escapeCell(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  const str = String(value);
  if (/[",\r\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

/**
 * Build a CSV string from an array of rows.
 *
 * @param {Array<Object|Array>} rows
 *   Either an array of plain objects (keys become headers) or an array of
 *   arrays (passed through as-is).
 * @param {Object} [opts]
 * @param {Array<string|{key,label}>} [opts.headers]
 *   Explicit header list. Each entry can be:
 *     - a string  → column key (used as the heading too)
 *     - an object {key, label} → key indexes the row, label is shown
 *   If omitted, headers are inferred from the first row's keys.
 * @param {boolean} [opts.bom=true]
 *   Prepend a UTF-8 BOM so Excel auto-detects encoding correctly.
 * @returns {string} CSV text including newline at the end.
 */
export function toCSV(rows, opts = {}) {
  const { headers, bom = true } = opts;
  if (!rows?.length) return bom ? "﻿" : "";

  // Infer headers if not provided.
  const firstRow = rows[0];
  let cols = headers;
  if (!cols) {
    cols = Array.isArray(firstRow) ? null : Object.keys(firstRow);
  }
  const normalized = cols
    ? cols.map((c) => (typeof c === "string" ? { key: c, label: c } : c))
    : null;

  const lines = [];

  if (normalized) {
    lines.push(normalized.map((c) => escapeCell(c.label)).join(","));
  }

  for (const row of rows) {
    if (Array.isArray(row)) {
      lines.push(row.map(escapeCell).join(","));
    } else if (normalized) {
      lines.push(normalized.map((c) => escapeCell(row[c.key])).join(","));
    } else {
      lines.push(Object.values(row).map(escapeCell).join(","));
    }
  }

  return (bom ? "﻿" : "") + lines.join("\r\n") + "\r\n";
}

/**
 * Trigger a browser download of a CSV string.
 *
 * @param {string} filename  e.g. "forecast.csv"
 * @param {string} csvText
 */
export function downloadCSV(filename, csvText) {
  const blob = new Blob([csvText], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Defer revoke so Safari has time to start the download.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * One-shot helper: build a CSV from rows and download it immediately.
 */
export function exportCSV(filename, rows, opts) {
  downloadCSV(filename, toCSV(rows, opts));
}

/**
 * Build a filename like "rink-forecast-2026-05-14.csv".
 * Strips characters that aren't safe across OSes.
 */
export function csvFilename(stem) {
  const date = new Date().toISOString().slice(0, 10);
  const clean = String(stem || "rink-export")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${clean || "rink-export"}-${date}.csv`;
}
