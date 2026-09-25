import { useEffect, useMemo, useRef, useState } from 'react';
import type { AppState, Budget } from './types';
import { emptyBudget, loadState, normalizeBudget, sampleBudget, saveState, uid } from './storage';
import { summarize } from './calc';
import { SummaryTiles } from './components/SummaryTiles';
import { ItemList } from './components/ItemList';
import { YearOverview } from './components/YearOverview';
import { Charts } from './components/Charts';
import { Compare } from './components/Compare';
import { People } from './components/People';
import { downloadFile, overviewCsv } from './exporters';

type Tab = 'items' | 'overview' | 'people' | 'charts' | 'compare';

const TABS: { id: Tab; label: string }[] = [
  { id: 'items', label: 'Poster' },
  { id: 'overview', label: 'Årsoversigt' },
  { id: 'people', label: 'Pr. person' },
  { id: 'charts', label: 'Grafer' },
  { id: 'compare', label: 'Sammenlign scenarier' },
];

export default function App() {
  const [state, setState] = useState<AppState>(loadState);
  const [tab, setTab] = useState<Tab>('items');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => saveState(state), [state]);

  const budget = state.budgets.find((b) => b.id === state.activeId) ?? state.budgets[0];
  const summary = useMemo(() => summarize(budget), [budget]);

  const updateBudget = (patch: Partial<Budget> | ((b: Budget) => Budget)) =>
    setState((s) => ({
      ...s,
      budgets: s.budgets.map((b) =>
        b.id === budget.id ? (typeof patch === 'function' ? patch(b) : { ...b, ...patch }) : b,
      ),
    }));

  const addBudget = (b: Budget) => setState((s) => ({ budgets: [...s.budgets, b], activeId: b.id }));

  const duplicate = () => {
    const name = prompt('Navn på det nye scenarie:', `${budget.name} (kopi)`);
    if (!name) return;
    addBudget({ ...structuredClone(budget), id: uid(), name, items: budget.items.map((i) => ({ ...structuredClone(i), id: uid() })) });
  };

  const create = (withSample: boolean) => {
    const year = budget.year;
    addBudget(withSample ? sampleBudget(year) : emptyBudget(year));
  };

  const remove = () => {
    if (state.budgets.length === 1) {
      alert('Du skal have mindst ét budget.');
      return;
    }
    if (!confirm(`Slet "${budget.name}"? Det kan ikke fortrydes.`)) return;
    setState((s) => {
      const budgets = s.budgets.filter((b) => b.id !== budget.id);
      return { budgets, activeId: budgets[0].id };
    });
  };

  const exportJson = () =>
    downloadFile(`${budget.name}.json`, JSON.stringify(budget, null, 2), 'application/json');

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text());
      const list = Array.isArray(data?.budgets) ? data.budgets : [data];
      const imported = list.map((raw: unknown) => ({ ...normalizeBudget(raw), id: uid() }));
      setState((s) => ({ budgets: [...s.budgets, ...imported], activeId: imported[0].id }));
    } catch {
      alert('Filen kunne ikke læses som et budget (JSON).');
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>Budgetplanner</h1>
        <div className="budget-picker">
          <label>
            <span className="sr-only">Vælg budget</span>
            <select value={budget.id} onChange={(e) => setState((s) => ({ ...s, activeId: e.target.value }))}>
              {state.budgets.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <button onClick={duplicate} title="Kopiér budgettet for at simulere et alternativ">
            Kopiér som scenarie
          </button>
          <details className="menu">
            <summary>Mere</summary>
            <div className="menu-items">
              <button onClick={() => create(false)}>Nyt tomt budget</button>
              <button onClick={() => create(true)}>Nyt budget med eksempeldata</button>
              <button onClick={exportJson}>Eksportér budget (JSON)</button>
              <button onClick={() => fileInput.current?.click()}>Importér budget (JSON)</button>
              <button onClick={() => downloadFile(`${budget.name}.csv`, overviewCsv(budget, summary), 'text/csv')}>
                Eksportér årsoversigt (CSV)
              </button>
              <button onClick={() => window.print()}>Udskriv</button>
              <button className="danger" onClick={remove}>
                Slet dette budget
              </button>
            </div>
          </details>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importJson(f);
              e.target.value = '';
            }}
          />
        </div>
      </header>

      <section className="settings">
        <label>
          Navn
          <input value={budget.name} onChange={(e) => updateBudget({ name: e.target.value })} />
        </label>
        <label>
          År
          <input
            type="number"
            value={budget.year}
            onChange={(e) => updateBudget({ year: Number(e.target.value) || budget.year })}
          />
        </label>
        <label>
          Startsaldo (kr.)
          <input
            type="number"
            value={budget.startBalance}
            onChange={(e) => updateBudget({ startBalance: Number(e.target.value) || 0 })}
          />
        </label>
      </section>

      <SummaryTiles summary={summary} />

      <nav className="tabs" role="tablist">
        {TABS.map((t) => (
          <button key={t.id} role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </nav>

      <main>
        {tab === 'items' && <ItemList items={budget.items} onChange={(items) => updateBudget({ items })} />}
        {tab === 'overview' && <YearOverview budget={budget} summary={summary} />}
        {tab === 'people' && <People budget={budget} onSharingChange={(sharing) => updateBudget({ sharing })} />}
        {tab === 'charts' && <Charts summary={summary} />}
        {tab === 'compare' && <Compare budgets={state.budgets} activeId={budget.id} />}
      </main>

      <footer className="foot">Data gemmes kun lokalt i din browser. Brug “Eksportér” for at tage backup eller dele med din partner.</footer>
    </div>
  );
}
