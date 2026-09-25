import type { Budget, BudgetItem, ItemType } from './types';

export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Maj', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'];
export const MONTHS_LONG = [
  'Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'December',
];

const zeros = () => Array<number>(12).fill(0);

/** Hvilke måneder (0-11) en post med fast beløb rammer. */
export function paymentMonths(item: BudgetItem): number[] {
  const start = ((item.startMonth % 12) + 12) % 12;
  const every = (step: number) => {
    const out: number[] = [];
    for (let m = start % step; m < 12; m += step) out.push(m);
    return out;
  };
  switch (item.frequency) {
    case 'monthly':
      return every(1);
    case 'quarterly':
      return every(3);
    case 'halfyearly':
      return every(6);
    case 'yearly':
      return [start];
    case 'custom':
      return [...new Set(item.months.filter((m) => m >= 0 && m < 12))].sort((a, b) => a - b);
    case 'variable':
      return [];
  }
}

/** Postens beløb for hver af årets 12 måneder (positive tal). */
export function itemMonthly(item: BudgetItem): number[] {
  if (!item.enabled) return zeros();
  if (item.frequency === 'variable') {
    return Array.from({ length: 12 }, (_, m) => item.monthlyAmounts[m] || 0);
  }
  const out = zeros();
  for (const m of paymentMonths(item)) out[m] = item.amount || 0;
  return out;
}

export const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);

export interface CategoryRow {
  category: string;
  type: ItemType;
  monthly: number[];
  total: number;
}

export interface BudgetSummary {
  income: number[];
  expenses: number[];
  /** Rådighedsbeløb pr. måned = indtægter − udgifter */
  disposable: number[];
  /** Saldo ved udgangen af hver måned inkl. startsaldo */
  balance: number[];
  categories: CategoryRow[];
  totals: { income: number; expenses: number; disposable: number };
  /** Gennemsnitligt rådighedsbeløb pr. måned */
  averageDisposable: number;
  /** Laveste saldo i løbet af året og måneden hvor den indtræffer */
  lowestBalance: { value: number; month: number };
  /**
   * Månedlig overførsel til en budgetkonto, der udjævner alle udgifter
   * som ikke er månedlige (årlige, kvartalsvise osv.).
   */
  budgetAccountTransfer: number;
}

export function summarize(budget: Budget): BudgetSummary {
  let income = zeros();
  let expenses = zeros();
  const byCategory = new Map<string, CategoryRow>();
  let irregularExpenses = 0;

  for (const item of budget.items) {
    const monthly = itemMonthly(item);
    if (item.type === 'income') income = add(income, monthly);
    else {
      expenses = add(expenses, monthly);
      if (item.frequency !== 'monthly') irregularExpenses += sum(monthly);
    }
    const key = `${item.type}:${item.category || 'Andet'}`;
    const row = byCategory.get(key) ?? { category: item.category || 'Andet', type: item.type, monthly: zeros(), total: 0 };
    row.monthly = add(row.monthly, monthly);
    row.total = sum(row.monthly);
    byCategory.set(key, row);
  }

  const disposable = income.map((v, i) => v - expenses[i]);
  const balance: number[] = [];
  let running = budget.startBalance || 0;
  for (const d of disposable) {
    running += d;
    balance.push(running);
  }
  let lowest = { value: budget.startBalance || 0, month: -1 };
  balance.forEach((v, m) => {
    if (v < lowest.value) lowest = { value: v, month: m };
  });

  const categories = [...byCategory.values()].sort(
    (a, b) => (a.type === b.type ? b.total - a.total : a.type === 'income' ? -1 : 1),
  );

  const totals = { income: sum(income), expenses: sum(expenses), disposable: sum(disposable) };
  return {
    income,
    expenses,
    disposable,
    balance,
    categories,
    totals,
    averageDisposable: totals.disposable / 12,
    lowestBalance: lowest,
    budgetAccountTransfer: irregularExpenses / 12,
  };
}

const dkk = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
export const fmt = (n: number) => dkk.format(Math.round(n) || 0);
export const fmtKr = (n: number) => `${fmt(n)} kr.`;

export function frequencyLabel(item: BudgetItem): string {
  const m = MONTHS[item.startMonth] ?? '';
  switch (item.frequency) {
    case 'monthly':
      return 'Månedlig';
    case 'quarterly':
      return `Kvartalsvis (fra ${m})`;
    case 'halfyearly':
      return `Halvårlig (fra ${m})`;
    case 'yearly':
      return `Årlig (${m})`;
    case 'custom': {
      const ms = paymentMonths(item);
      if (!ms.length) return 'Ingen måneder';
      if (ms.length > 6) {
        const missing = MONTHS.filter((_, i) => !ms.includes(i));
        return `Alle undtagen ${missing.join(', ')}`;
      }
      return ms.map((i) => MONTHS[i]).join(', ');
    }
    case 'variable':
      return 'Varierende';
  }
}

/** Årsbeløb for en post */
export const itemYearly = (item: BudgetItem) => sum(itemMonthly(item));
