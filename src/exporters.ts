import type { Budget } from './types';
import type { BudgetSummary } from './calc';
import { MONTHS } from './calc';

export function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type: `${type};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name.replace(/[\\/:*?"<>|]/g, '_');
  a.click();
  URL.revokeObjectURL(url);
}

/** CSV med semikolon og komma-decimaler, så det åbner korrekt i dansk Excel. */
export function overviewCsv(budget: Budget, s: BudgetSummary): string {
  const num = (n: number) => (Math.round(n * 100) / 100).toString().replace('.', ',');
  const esc = (t: string) => (/[;"\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t);
  const row = (label: string, xs: number[], total: number) => [esc(label), ...xs.map(num), num(total)].join(';');
  const lines = [
    [esc(`${budget.name} ${budget.year}`), ...MONTHS, 'I alt'].join(';'),
    ...s.categories.filter((c) => c.type === 'income').map((c) => row(`Indtægt: ${c.category}`, c.monthly, c.total)),
    row('Indtægter i alt', s.income, s.totals.income),
    ...s.categories.filter((c) => c.type === 'expense').map((c) => row(`Udgift: ${c.category}`, c.monthly, c.total)),
    row('Udgifter i alt', s.expenses, s.totals.expenses),
    row('Rådighedsbeløb', s.disposable, s.totals.disposable),
    row('Saldo ultimo', s.balance, s.balance[11] ?? 0),
  ];
  return '﻿' + lines.join('\r\n');
}
