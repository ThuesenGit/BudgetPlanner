import type { AppState, Budget, BudgetItem, Sharing, SplitMethod } from './types';

const KEY = 'budgetplanner.v1';

export const uid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2) + Date.now().toString(36);

export function newItem(partial: Partial<BudgetItem> = {}): BudgetItem {
  return {
    id: uid(),
    name: '',
    type: 'expense',
    category: '',
    amount: 0,
    frequency: 'monthly',
    startMonth: 0,
    months: [],
    monthlyAmounts: Array(12).fill(0),
    owner: 'Fælles',
    note: '',
    enabled: true,
    ...partial,
  };
}

export const defaultSharing = (): Sharing => ({ method: 'income', customShares: {} });

export function sampleBudget(year = new Date().getFullYear()): Budget {
  const i = (p: Partial<BudgetItem>) => newItem(p);
  return {
    id: uid(),
    name: `Husholdning ${year}`,
    year,
    startBalance: 10000,
    items: [
      i({ name: 'Løn (efter skat)', type: 'income', category: 'Løn', amount: 26000, owner: 'Person 1' }),
      i({ name: 'Løn (efter skat)', type: 'income', category: 'Løn', amount: 22000, owner: 'Person 2' }),
      i({ name: 'Børne- og ungeydelse', type: 'income', category: 'Offentlige ydelser', amount: 4500, frequency: 'quarterly', startMonth: 0 }),
      i({ name: 'Feriepenge', type: 'income', category: 'Løn', amount: 8000, frequency: 'yearly', startMonth: 4 }),
      i({ name: 'Husleje / boliglån', category: 'Bolig', amount: 12500 }),
      i({ name: 'Ejendomsskat', category: 'Bolig', amount: 9000, frequency: 'halfyearly', startMonth: 0 }),
      i({ name: 'El', category: 'Forsyning', amount: 3000, frequency: 'quarterly', startMonth: 1 }),
      i({ name: 'Vand og varme', category: 'Forsyning', amount: 4200, frequency: 'quarterly', startMonth: 2 }),
      i({ name: 'Internet og mobil', category: 'Forsyning', amount: 650 }),
      i({ name: 'Indboforsikring', category: 'Forsikring', amount: 2800, frequency: 'yearly', startMonth: 0 }),
      i({ name: 'Bilforsikring', category: 'Transport', amount: 7200, frequency: 'yearly', startMonth: 2 }),
      i({ name: 'Grøn ejerafgift', category: 'Transport', amount: 1600, frequency: 'halfyearly', startMonth: 3 }),
      i({ name: 'Brændstof', category: 'Transport', amount: 1800 }),
      i({ name: 'Dagligvarer', category: 'Mad', amount: 8000 }),
      i({ name: 'Institution', category: 'Børn', amount: 3200, frequency: 'custom', months: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11] }),
      i({ name: 'Streaming', category: 'Fritid', amount: 350 }),
      i({ name: 'Sommerferie', category: 'Fritid', amount: 15000, frequency: 'yearly', startMonth: 6 }),
      i({
        name: 'Gaver',
        category: 'Fritid',
        frequency: 'variable',
        monthlyAmounts: [0, 0, 500, 0, 500, 0, 0, 0, 500, 0, 0, 5000],
      }),
      i({ name: 'Opsparing', category: 'Opsparing', amount: 3000 }),
      i({ name: 'Fitness', category: 'Personligt', amount: 299, owner: 'Person 1' }),
      i({ name: 'Tøj og personligt', category: 'Personligt', amount: 1500, owner: 'Person 1' }),
      i({ name: 'Frokostordning', category: 'Personligt', amount: 450, owner: 'Person 2', frequency: 'custom', months: [0, 1, 2, 3, 4, 5, 7, 8, 9, 10, 11] }),
      i({ name: 'Tøj og personligt', category: 'Personligt', amount: 1500, owner: 'Person 2' }),
    ],
    sharing: defaultSharing(),
  };
}

export function emptyBudget(year = new Date().getFullYear()): Budget {
  return { id: uid(), name: `Budget ${year}`, year, startBalance: 0, items: [], sharing: defaultSharing() };
}

const METHODS: SplitMethod[] = ['equal', 'income', 'custom'];

function normalizeSharing(raw: any): Sharing {
  const method = METHODS.includes(raw?.method) ? raw.method : defaultSharing().method;
  const customShares: Record<string, number> = {};
  if (raw?.customShares && typeof raw.customShares === 'object') {
    for (const [k, v] of Object.entries(raw.customShares)) customShares[k] = Math.max(0, Number(v) || 0);
  }
  return { method, customShares };
}

/** Udfylder manglende felter, så gamle/importerede data altid er gyldige. */
export function normalizeBudget(raw: any): Budget {
  return {
    id: typeof raw?.id === 'string' ? raw.id : uid(),
    name: String(raw?.name ?? 'Budget'),
    year: Number(raw?.year) || new Date().getFullYear(),
    startBalance: Number(raw?.startBalance) || 0,
    sharing: normalizeSharing(raw?.sharing),
    items: Array.isArray(raw?.items)
      ? raw.items.map((it: any) => {
          const base = newItem(it);
          const ma = Array.isArray(it?.monthlyAmounts) ? it.monthlyAmounts : [];
          return {
            ...base,
            amount: Number(base.amount) || 0,
            startMonth: Number(base.startMonth) || 0,
            months: Array.isArray(base.months) ? base.months.map(Number) : [],
            monthlyAmounts: Array.from({ length: 12 }, (_, m) => Number(ma[m]) || 0),
            enabled: base.enabled !== false,
          };
        })
      : [],
  };
}

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const budgets = (parsed.budgets ?? []).map(normalizeBudget);
      if (budgets.length) {
        const activeId = budgets.some((b: Budget) => b.id === parsed.activeId) ? parsed.activeId : budgets[0].id;
        return { budgets, activeId };
      }
    }
  } catch {
    /* ignorer – vi starter forfra med eksempeldata */
  }
  const b = sampleBudget();
  return { budgets: [b], activeId: b.id };
}

export function saveState(state: AppState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* fx privat browservindue – data gemmes så ikke */
  }
}
