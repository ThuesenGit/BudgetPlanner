import { useMemo } from 'react';
import type { Budget, Sharing, SplitMethod } from '../types';
import { fmt, fmtKr, MONTHS, MONTHS_LONG, summarize } from '../calc';
import { summarizePeople } from '../people';
import { Chart } from './Charts';

const METHODS: { id: SplitMethod; label: string; help: string }[] = [
  { id: 'income', label: 'Efter indkomst', help: 'Hver betaler i forhold til sine egne indtægter.' },
  { id: 'equal', label: 'Lige deling', help: 'De fælles udgifter deles ligeligt.' },
  { id: 'custom', label: 'Egne procenter', help: 'I bestemmer selv fordelingen.' },
];

const pct = (x: number) => `${(x * 100).toLocaleString('da-DK', { maximumFractionDigits: 1 })} %`;

export function People({ budget, onSharingChange }: { budget: Budget; onSharingChange: (s: Sharing) => void }) {
  const s = useMemo(() => summarizePeople(budget), [budget]);
  const household = useMemo(() => summarize(budget), [budget]);
  const sharing = budget.sharing;

  if (s.people.length === 0) {
    return (
      <div className="empty">
        <p>Der er endnu ingen personer i budgettet.</p>
        <p className="muted">
          Sæt feltet <strong>“Hvem”</strong> på de poster der tilhører en bestemt person (fx lønnen og personlige udgifter).
          Poster med “Fælles” eller tomt felt deles efter fordelingsnøglen.
        </p>
      </div>
    );
  }

  const setMethod = (method: SplitMethod) => {
    const customShares = { ...sharing.customShares };
    // Start "egne procenter" fra den aktuelle fordeling, så man kan justere derfra
    if (method === 'custom') for (const p of s.people) customShares[p.name] ??= Math.round(p.share * 100);
    onSharingChange({ ...sharing, method, customShares });
  };
  const customTotal = s.people.reduce((t, p) => t + (sharing.customShares[p.name] ?? 0), 0);

  return (
    <div className="people">
      <section className="panel">
        <h2>Fordeling af fælles udgifter</h2>
        <div className="segmented" role="radiogroup" aria-label="Fordelingsnøgle">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              role="radio"
              aria-checked={sharing.method === m.id}
              className={sharing.method === m.id ? 'active' : ''}
              onClick={() => setMethod(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>
        <p className="muted small">{METHODS.find((m) => m.id === sharing.method)?.help}</p>

        {sharing.method === 'custom' && (
          <div className="share-inputs">
            {s.people.map((p) => (
              <label key={p.name}>
                {p.name}
                <span className="input-suffix">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    value={sharing.customShares[p.name] ?? 0}
                    onChange={(e) => {
                      const value = Math.max(0, Number(e.target.value) || 0);
                      const customShares = { ...sharing.customShares, [p.name]: value };
                      // Med to personer følger den andens procent automatisk med
                      if (s.people.length === 2 && value <= 100) {
                        const other = s.people.find((x) => x.name !== p.name)!;
                        customShares[other.name] = 100 - value;
                      }
                      onSharingChange({ ...sharing, customShares });
                    }}
                  />
                  %
                </span>
              </label>
            ))}
            {Math.round(customTotal) !== 100 && (
              <p className="muted small">
                Summen er {fmt(customTotal)} % – procenterne skaleres, så de tilsammen giver 100 %.
              </p>
            )}
          </div>
        )}

        <dl className="shared-facts">
          <div>
            <dt>Fælles udgifter</dt>
            <dd>{fmtKr(s.sharedExpenses.reduce((a, b) => a + b, 0))} / år</dd>
          </div>
          <div>
            <dt>Fælles indtægter</dt>
            <dd>{fmtKr(s.sharedIncome.reduce((a, b) => a + b, 0))} / år</dd>
          </div>
          <div>
            <dt>Til deling (netto)</dt>
            <dd>
              {fmtKr(s.sharedNetTotal)} / år · {fmtKr(s.sharedNetTotal / 12)} / md.
            </dd>
          </div>
        </dl>
      </section>

      <section className="person-cards">
        {s.people.map((p) => {
          const avg = p.totals.disposable / 12;
          const worst = p.disposable.reduce((w, v, i) => (v < p.disposable[w] ? i : w), 0);
          return (
            <article key={p.name} className="person-card">
              <header>
                <h3>{p.name}</h3>
                <span className="badge">{pct(p.share)} af fælles</span>
              </header>
              <dl>
                <dt>Egne indtægter</dt>
                <dd>{fmtKr(p.totals.income / 12)} / md.</dd>
                <dt>Egne udgifter</dt>
                <dd>−{fmtKr(p.totals.expenses / 12)} / md.</dd>
                <dt>Andel af fælles</dt>
                <dd>−{fmtKr(p.totals.sharedCost / 12)} / md.</dd>
                <dt className="strong">Rådighedsbeløb (snit)</dt>
                <dd className={`strong ${avg < 0 ? 'neg' : 'good'}`}>{fmtKr(avg)} / md.</dd>
              </dl>
              <p className="transfer">
                Fast overførsel til fælleskonto: <strong>{fmtKr(p.monthlyTransfer)} / md.</strong>
              </p>
              <p className="muted small">
                Laveste måned: {MONTHS_LONG[worst].toLowerCase()} ({fmtKr(p.disposable[worst])})
              </p>
            </article>
          );
        })}
      </section>

      <Chart
        title="Rådighedsbeløb pr. person pr. måned"
        kind="bar"
        series={s.people.slice(0, 8).map((p, i) => ({ name: p.name, values: p.disposable, color: `--series-${i + 1}` }))}
      />

      <h3>Rådighedsbeløb pr. måned</h3>
      <div className="table-wrap">
        <table className="overview">
          <thead>
            <tr>
              <th>Person</th>
              {MONTHS.map((m) => (
                <th key={m} className="num">
                  {m}
                </th>
              ))}
              <th className="num">I alt</th>
            </tr>
          </thead>
          <tbody>
            {s.people.map((p) => (
              <tr key={p.name}>
                <th scope="row">{p.name}</th>
                {p.disposable.map((v, i) => (
                  <td key={i} className={`num ${v < 0 ? 'neg' : ''}`}>
                    {fmt(v)}
                  </td>
                ))}
                <td className={`num total ${p.totals.disposable < 0 ? 'neg' : ''}`}>{fmt(p.totals.disposable)}</td>
              </tr>
            ))}
            <tr className="sum-row">
              <th scope="row">Husstanden</th>
              {household.disposable.map((v, i) => (
                <td key={i} className={`num ${v < 0 ? 'neg' : ''}`}>
                  {fmt(v)}
                </td>
              ))}
              <td className="num total">{fmt(household.totals.disposable)}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="muted small">
        Andelen af fælles udgifter følger de faktiske betalinger måned for måned. Med den faste overførsel til fælleskontoen
        bliver det udjævnet over året.
      </p>
    </div>
  );
}
