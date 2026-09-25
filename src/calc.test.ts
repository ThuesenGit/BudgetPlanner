import { describe, expect, it } from 'vitest';
import { itemMonthly, paymentMonths, summarize } from './calc';
import { newItem, normalizeBudget, sampleBudget } from './storage';
import type { Budget } from './types';

describe('paymentMonths', () => {
  it('fordeler kvartalsvise betalinger fra startmåned', () => {
    expect(paymentMonths(newItem({ frequency: 'quarterly', startMonth: 1 }))).toEqual([1, 4, 7, 10]);
    expect(paymentMonths(newItem({ frequency: 'quarterly', startMonth: 11 }))).toEqual([2, 5, 8, 11]);
  });
  it('håndterer halvårlig, årlig og udvalgte måneder', () => {
    expect(paymentMonths(newItem({ frequency: 'halfyearly', startMonth: 3 }))).toEqual([3, 9]);
    expect(paymentMonths(newItem({ frequency: 'yearly', startMonth: 6 }))).toEqual([6]);
    expect(paymentMonths(newItem({ frequency: 'custom', months: [5, 1, 1, 13] }))).toEqual([1, 5]);
  });
});

describe('itemMonthly', () => {
  it('returnerer nul for deaktiverede poster', () => {
    expect(itemMonthly(newItem({ amount: 100, enabled: false }))).toEqual(Array(12).fill(0));
  });
  it('bruger egne månedsbeløb ved varierende poster', () => {
    const amounts = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    expect(itemMonthly(newItem({ frequency: 'variable', monthlyAmounts: amounts }))).toEqual(amounts);
  });
});

describe('summarize', () => {
  const budget: Budget = {
    id: 'b',
    name: 'Test',
    year: 2026,
    startBalance: 1000,
    items: [
      newItem({ type: 'income', category: 'Løn', amount: 30000 }),
      newItem({ category: 'Bolig', amount: 10000 }),
      newItem({ category: 'Forsikring', amount: 12000, frequency: 'yearly', startMonth: 0 }),
      newItem({ category: 'Forsyning', amount: 3000, frequency: 'quarterly', startMonth: 2 }),
    ],
  };
  const s = summarize(budget);

  it('beregner rådighedsbeløb pr. måned', () => {
    expect(s.disposable[0]).toBe(30000 - 10000 - 12000);
    expect(s.disposable[1]).toBe(20000);
    expect(s.disposable[2]).toBe(17000);
    expect(s.totals.disposable).toBe(360000 - 120000 - 12000 - 12000);
  });
  it('akkumulerer saldo fra startsaldo', () => {
    expect(s.balance[0]).toBe(1000 + 8000);
    expect(s.balance[11]).toBe(1000 + s.totals.disposable);
  });
  it('finder laveste saldo', () => {
    expect(s.lowestBalance).toEqual({ value: 1000, month: -1 });
  });
  it('beregner overførsel til budgetkonto ud fra ikke-månedlige udgifter', () => {
    expect(s.budgetAccountTransfer).toBe((12000 + 12000) / 12);
  });
  it('grupperer pr. kategori', () => {
    expect(s.categories.map((c) => c.category)).toEqual(['Løn', 'Bolig', 'Forsikring', 'Forsyning']);
  });
});

describe('normalizeBudget', () => {
  it('reparerer ufuldstændige data', () => {
    const b = normalizeBudget({ name: 'X', items: [{ name: 'Y', amount: '50' }] });
    expect(b.items[0].amount).toBe(50);
    expect(b.items[0].monthlyAmounts).toHaveLength(12);
    expect(b.items[0].enabled).toBe(true);
  });
  it('eksempelbudgettet giver positivt rådighedsbeløb', () => {
    expect(summarize(sampleBudget(2026)).averageDisposable).toBeGreaterThan(0);
  });
});

describe('frequencyLabel', () => {
  it('viser udvalgte måneder kompakt', async () => {
    const { frequencyLabel } = await import('./calc');
    expect(frequencyLabel(newItem({ frequency: 'custom', months: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11] }))).toBe('Alle undtagen Jul');
    expect(frequencyLabel(newItem({ frequency: 'custom', months: [5, 11] }))).toBe('Jun, Dec');
  });
});
