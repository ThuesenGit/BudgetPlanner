export type ItemType = 'income' | 'expense';

/**
 * Hvordan en post fordeler sig over året:
 * - monthly:    samme beløb hver måned
 * - quarterly:  hver 3. måned fra startMonth
 * - halfyearly: hver 6. måned fra startMonth
 * - yearly:     én gang om året i startMonth
 * - custom:     samme beløb i de valgte måneder
 * - variable:   selvstændigt beløb for hver måned
 */
export type Frequency = 'monthly' | 'quarterly' | 'halfyearly' | 'yearly' | 'custom' | 'variable';

export interface BudgetItem {
  id: string;
  name: string;
  type: ItemType;
  category: string;
  /** Beløb pr. betaling (bruges ikke ved 'variable'). Altid positivt. */
  amount: number;
  frequency: Frequency;
  /** 0 = januar ... 11 = december */
  startMonth: number;
  /** Valgte måneder ved 'custom' */
  months: number[];
  /** 12 beløb ved 'variable' */
  monthlyAmounts: number[];
  /** Hvem posten tilhører, fx "Fælles", "Anna" */
  owner: string;
  note: string;
  /** Slå posten fra i simuleringen uden at slette den */
  enabled: boolean;
}

/**
 * Hvordan fælles udgifter (minus fælles indtægter) fordeles mellem personerne:
 * - equal:  ligeligt
 * - income: i forhold til hver persons egne indtægter
 * - custom: faste procentsatser pr. person
 */
export type SplitMethod = 'equal' | 'income' | 'custom';

export interface Sharing {
  method: SplitMethod;
  /** Procent pr. person ved 'custom' (normaliseres, så summen altid er 100 %) */
  customShares: Record<string, number>;
}

export interface Budget {
  id: string;
  name: string;
  year: number;
  /** Saldo ved årets start – bruges til den akkumulerede saldo */
  startBalance: number;
  items: BudgetItem[];
  sharing: Sharing;
}

export interface AppState {
  budgets: Budget[];
  activeId: string;
}
