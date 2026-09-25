import type { Budget, BudgetItem } from './types';
import { itemMonthly, sum } from './calc';

export const SHARED = 'Fælles';

const zeros = () => Array<number>(12).fill(0);
const add = (a: number[], b: number[]) => a.map((v, i) => v + b[i]);

/** Tom ejer eller "fælles" (uanset store/små bogstaver) betyder fælles post. */
export const isShared = (owner: string) => !owner.trim() || owner.trim().toLowerCase() === SHARED.toLowerCase();

/** Personerne i budgettet, dvs. alle ejere der ikke er "Fælles", i fast rækkefølge. */
export function peopleOf(items: BudgetItem[]): string[] {
  const seen: string[] = [];
  for (const i of items) {
    const o = i.owner.trim();
    if (!isShared(o) && !seen.includes(o)) seen.push(o);
  }
  return seen.sort((a, b) => a.localeCompare(b, 'da'));
}

export interface PersonSummary {
  name: string;
  /** Andel af de fælles udgifter (0-1) */
  share: number;
  income: number[];
  expenses: number[];
  /** Personens andel af fælles udgifter minus fælles indtægter, pr. måned */
  sharedCost: number[];
  /** Rådighedsbeløb = egne indtægter − egne udgifter − andel af fælles */
  disposable: number[];
  totals: { income: number; expenses: number; sharedCost: number; disposable: number };
  /** Fast månedlig overførsel til fælleskontoen (udjævnet over året) */
  monthlyTransfer: number;
}

export interface PeopleSummary {
  people: PersonSummary[];
  sharedIncome: number[];
  sharedExpenses: number[];
  /** Fælles udgifter minus fælles indtægter */
  sharedNet: number[];
  sharedNetTotal: number;
}

/** Normaliserede andele pr. person; summen er altid 1 (når der er personer). */
export function shares(budget: Budget, people: string[], personalIncome: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {};
  if (!people.length) return out;
  const weights = people.map((p) => {
    if (budget.sharing.method === 'income') return Math.max(0, personalIncome[p] ?? 0);
    if (budget.sharing.method === 'custom') return Math.max(0, budget.sharing.customShares[p] ?? 0);
    return 1;
  });
  const total = sum(weights);
  people.forEach((p, i) => (out[p] = total > 0 ? weights[i] / total : 1 / people.length));
  return out;
}

export function summarizePeople(budget: Budget): PeopleSummary {
  const people = peopleOf(budget.items);
  const income: Record<string, number[]> = {};
  const expenses: Record<string, number[]> = {};
  for (const p of people) {
    income[p] = zeros();
    expenses[p] = zeros();
  }
  let sharedIncome = zeros();
  let sharedExpenses = zeros();

  for (const item of budget.items) {
    const m = itemMonthly(item);
    const owner = item.owner.trim();
    if (isShared(owner)) {
      if (item.type === 'income') sharedIncome = add(sharedIncome, m);
      else sharedExpenses = add(sharedExpenses, m);
    } else if (item.type === 'income') income[owner] = add(income[owner], m);
    else expenses[owner] = add(expenses[owner], m);
  }

  const sharedNet = sharedExpenses.map((v, i) => v - sharedIncome[i]);
  const sharedNetTotal = sum(sharedNet);
  const personalIncome = Object.fromEntries(people.map((p) => [p, sum(income[p])]));
  const shareOf = shares(budget, people, personalIncome);

  return {
    sharedIncome,
    sharedExpenses,
    sharedNet,
    sharedNetTotal,
    people: people.map((name) => {
      const share = shareOf[name];
      const sharedCost = sharedNet.map((v) => v * share);
      const disposable = income[name].map((v, i) => v - expenses[name][i] - sharedCost[i]);
      return {
        name,
        share,
        income: income[name],
        expenses: expenses[name],
        sharedCost,
        disposable,
        totals: {
          income: sum(income[name]),
          expenses: sum(expenses[name]),
          sharedCost: sum(sharedCost),
          disposable: sum(disposable),
        },
        monthlyTransfer: (sharedNetTotal * share) / 12,
      };
    }),
  };
}
