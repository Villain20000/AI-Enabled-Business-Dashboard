/**
 * CSV import helpers.
 *
 * A small RFC-4180-style parser is used to avoid pulling a dependency into the
 * server bundle. It supports quoted fields, escaped quotes, commas, and
 * newlines inside quotes.
 *
 * @module lib/data/csv
 */
import { z } from 'zod';

export type ImportKind = 'sales' | 'inventory' | 'kpis';

export const IMPORT_KINDS: ImportKind[] = ['sales', 'inventory', 'kpis'];

/** Narrow an untrusted string (query param, form field) to an `ImportKind`. */
export function isImportKind(value: string): value is ImportKind {
  return (IMPORT_KINDS as readonly string[]).includes(value);
}

export interface CsvRowError {
  row: number;
  message: string;
}

/** Parse a CSV document into a header row + data rows. */
export function parseCsv(input: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < input.length; i += 1) {
    const char = input[i];
    const next = input[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        field += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(field);
      field = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1;
      row.push(field);
      field = '';
      if (row.some((value) => value.trim().length > 0)) rows.push(row);
      row = [];
      continue;
    }

    field += char;
  }

  row.push(field);
  if (row.some((value) => value.trim().length > 0)) rows.push(row);
  return rows;
}

const SalesRow = z.object({
  month: z.string().trim().min(1).max(32),
  sales: z.coerce.number().finite().min(0),
  target: z.coerce.number().finite().min(0),
});

const InventoryRow = z.object({
  product: z.string().trim().min(1).max(120),
  stock: z.coerce.number().int().min(0),
  status: z.enum(['Healthy', 'Low', 'Critical']),
});

const KpiRow = z.object({
  title: z.string().trim().min(1).max(80),
  value: z.string().trim().min(1).max(80),
  change: z.string().trim().min(1).max(40),
  trend: z.enum(['up', 'down']),
});

export type SalesImportRow = z.infer<typeof SalesRow>;
export type InventoryImportRow = z.infer<typeof InventoryRow>;
export type KpiImportRow = z.infer<typeof KpiRow>;

/**
 * Successful validation result, discriminated by `kind` so callers get the
 * right row type for the import they asked for without casting.
 */
export type ValidImport =
  | { ok: true; kind: 'sales'; data: SalesImportRow[] }
  | { ok: true; kind: 'inventory'; data: InventoryImportRow[] }
  | { ok: true; kind: 'kpis'; data: KpiImportRow[] };

export type CsvValidationResult = ValidImport | { ok: false; errors: CsvRowError[] };

export const MAX_IMPORT_ROWS = 5000;

/**
 * Convert a CSV document into validated rows.
 *
 * Returns row-level errors instead of throwing so the UI can show all malformed
 * rows at once.
 */
export function validateCsv(kind: ImportKind, input: string): CsvValidationResult {
  const rows = parseCsv(input.replace(/^\uFEFF/, ''));
  if (rows.length < 2) {
    return { ok: false, errors: [{ row: 0, message: 'CSV must include a header and at least one data row.' }] };
  }

  if (rows.length - 1 > MAX_IMPORT_ROWS) {
    return {
      ok: false,
      errors: [{ row: 0, message: `CSV exceeds the ${MAX_IMPORT_ROWS.toLocaleString()} row limit.` }],
    };
  }

  const headers = rows[0].map((header) => header.trim().toLowerCase());
  const errors: CsvRowError[] = [];
  const parsed: unknown[] = [];

  const required = {
    sales: ['month', 'sales', 'target'],
    inventory: ['product', 'stock', 'status'],
    kpis: ['title', 'value', 'change', 'trend'],
  }[kind];

  for (const column of required) {
    if (!headers.includes(column)) {
      errors.push({ row: 0, message: `Missing required column "${column}".` });
    }
  }
  if (errors.length > 0) return { ok: false, errors };

  const schema = { sales: SalesRow, inventory: InventoryRow, kpis: KpiRow }[kind];

  rows.slice(1).forEach((values, index) => {
    const rowNumber = index + 2;
    const record: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      record[header] = (values[columnIndex] ?? '').trim();
    });

    const result = schema.safeParse(record);
    if (!result.success) {
      errors.push({
        row: rowNumber,
        message: result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; '),
      });
      return;
    }
    parsed.push(result.data);
  });

  if (errors.length > 0) return { ok: false, errors };

  // The schema selected above matches the requested kind; this is the single
  // place where that pairing is asserted, so callers get a typed result.
  if (kind === 'sales') return { ok: true, kind, data: parsed as SalesImportRow[] };
  if (kind === 'inventory') return { ok: true, kind, data: parsed as InventoryImportRow[] };
  return { ok: true, kind, data: parsed as KpiImportRow[] };
}

/** Escape one CSV field. */
function csvField(value: unknown): string {
  const text = value == null ? '' : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** Serialise rows to CSV using an explicit header order. */
export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((header) => csvField(row[header])).join(','));
  }
  return `${lines.join('\n')}\n`;
}

/** CSV template contents for each import kind. */
export function csvTemplate(kind: ImportKind): string {
  if (kind === 'sales') return 'month,sales,target\nJan,4000,2400\nFeb,3000,1398\n';
  if (kind === 'inventory') return 'product,stock,status\nVaccine A,1200,Healthy\nMedicine B,300,Low\n';
  return 'title,value,change,trend\nTotal Revenue,$1.2M,+12.5%,up\nInventory Alerts,12,-2,down\n';
}
