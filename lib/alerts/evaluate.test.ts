import { describe, expect, it } from 'vitest';
import { conditionMatches, evaluateRules, resolveMetric, type AlertData } from './evaluate';

const data: AlertData = {
  sales: [
    { month: 'Jan', sales: 100, target: 80 },
    { month: 'Feb', sales: 250, target: 200 },
  ],
  inventory: [
    { product: 'A', stock: 10, status: 'Healthy' },
    { product: 'B', stock: 2, status: 'Low' },
    { product: 'C', stock: 0, status: 'Critical' },
  ],
  kpis: [{ title: 'Active Users', value: '8,432', change: '+5%', trend: 'up' }],
};

describe('resolveMetric', () => {
  it('sums revenue from sales rows', () => {
    expect(resolveMetric('Total Revenue', data)).toBe(350);
  });

  it('counts low and critical inventory', () => {
    expect(resolveMetric('Inventory Alerts', data)).toBe(2);
  });

  it('parses a numeric KPI value with formatting', () => {
    expect(resolveMetric('Active Users', data)).toBe(8432);
  });

  it('returns null when the metric has no data', () => {
    expect(resolveMetric('Missing Metric', data)).toBeNull();
  });
});

describe('conditionMatches', () => {
  it.each([
    [10, '>', 5, true],
    [10, '<', 5, false],
    [10, '>=', 10, true],
    [10, '<=', 10, true],
    [10, '==', 10, true],
    [10, 'bogus', 10, false],
  ])('%s %s %s => %s', (value, condition, threshold, expected) => {
    expect(conditionMatches(value, condition, threshold)).toBe(expected);
  });
});

describe('evaluateRules', () => {
  it('flags matching rules and ignores non-matching ones', () => {
    const results = evaluateRules(
      [
        { id: '1', kpi: 'Inventory Alerts', condition: '>', threshold: 1, method: 'email', destination: 'a@b.com' },
        { id: '2', kpi: 'Inventory Alerts', condition: '>', threshold: 5, method: 'email', destination: 'a@b.com' },
      ],
      data,
    );
    expect(results.map((result) => result.triggered)).toEqual([true, false]);
  });
});
