import { describe, expect, it } from 'vitest';
import { isImportKind, parseCsv, toCsv, validateCsv } from './csv';

describe('isImportKind', () => {
  it('accepts only the supported import kinds', () => {
    expect(isImportKind('sales')).toBe(true);
    expect(isImportKind('inventory')).toBe(true);
    expect(isImportKind('kpis')).toBe(true);
    expect(isImportKind('users')).toBe(false);
    expect(isImportKind('')).toBe(false);
  });
});

describe('parseCsv', () => {
  it('handles quoted commas and escaped quotes', () => {
    expect(parseCsv('name,note\n"Acme, Inc.","He said ""hi"""')).toEqual([
      ['name', 'note'],
      ['Acme, Inc.', 'He said "hi"'],
    ]);
  });

  it('ignores blank lines and supports CRLF', () => {
    expect(parseCsv('a,b\r\n1,2\r\n\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ]);
  });
});

describe('validateCsv', () => {
  it('validates sales rows', () => {
    const result = validateCsv('sales', 'month,sales,target\nJan,4000,2400\n');
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data).toEqual([{ month: 'Jan', sales: 4000, target: 2400 }]);
  });

  it('reports malformed rows without partially importing', () => {
    const result = validateCsv('inventory', 'product,stock,status\nA,10,Healthy\nB,oops,Low\n');
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors[0].row).toBe(3);
  });

  it('rejects unknown/missing columns', () => {
    const result = validateCsv('kpis', 'title,value\nRevenue,10\n');
    expect(result.ok).toBe(false);
  });

  it('echoes the validated kind so callers can narrow the row type', () => {
    const sales = validateCsv('sales', 'month,sales,target\nJan,1,2\n');
    const kpis = validateCsv('kpis', 'title,value,change,trend\nRevenue,$1M,+1%,up\n');
    expect(sales.ok && sales.kind).toBe('sales');
    expect(kpis.ok && kpis.kind).toBe('kpis');
  });
});

describe('toCsv', () => {
  it('escapes commas and quotes', () => {
    expect(toCsv(['name', 'note'], [{ name: 'Acme, Inc.', note: 'a "quote"' }])).toBe(
      'name,note\n"Acme, Inc.","a ""quote"""\n',
    );
  });
});
