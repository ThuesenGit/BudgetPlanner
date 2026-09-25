import { useMemo, useState } from 'react';
import type { Budget } from '../types';
import { fmt, fmtKr, MONTHS, summarize } from '../calc';
import { summarizePeople } from '../people';

export function Compare({ budgets, activeId }: { budgets: Budget[]; activeId: string }) {
  const [selected, setSelected] = useState<string[]>(() => budgets.slice(0, 4).map((b) => b.id));
  const chosen = budgets.filter((b) => selected.includes(b.id));
  const summaries = useMemo(() => chosen.map((b) => ({ b, s: summarize(b), p: summarizePeople(b) })), [chosen]);
  const peopleNames = [...new Set(summaries.flatMap((x) => x.p.people.map((p) => p.name)))].sort((a, b) => a.localeCompare(b, 'da'));
  const base = summaries.find((x) => x.b.id === activeId) ?? summaries[0];

  if (budgets.length < 2) {
    return (
      <p className="muted">
        Du har kun ét budget. Brug <strong>“Kopiér som scenarie”</strong> øverst, ret i kopien (fx ny bil, nyt job, barsel) og
        sammenlign så her.
      </p>
    );
  }

  return (
    <div>
      <fieldset className="months">
        <legend>Scenarier der sammenlignes</legend>
        {budgets.map((b) => (
          <label key={b.id} className="chip">
            <input
              type="checkbox"
              checked={selected.includes(b.id)}
              onChange={() => setSelected((s) => (s.includes(b.id) ? s.filter((x) => x !== b.id) : [...s, b.id]))}
            />
            {b.name}
          </label>
        ))}
      </fieldset>

      <div className="table-wrap">
        <table className="overview compare">
          <thead>
            <tr>
              <th>Scenarie</th>
              <th className="num">Indtægter / år</th>
              <th className="num">Udgifter / år</th>
              <th className="num">Rådighed / md. (snit)</th>
              <th className="num">Forskel / md.</th>
              <th className="num">Laveste saldo</th>
              <th className="num">Saldo ultimo</th>
            </tr>
          </thead>
          <tbody>
            {summaries.map(({ b, s }) => {
              const diff = base ? s.averageDisposable - base.s.averageDisposable : 0;
              return (
                <tr key={b.id} className={b.id === base?.b.id ? 'current' : ''}>
                  <th scope="row">
                    {b.name}
                    {b.id === base?.b.id && <span className="muted"> (udgangspunkt)</span>}
                  </th>
                  <td className="num">{fmtKr(s.totals.income)}</td>
                  <td className="num">{fmtKr(s.totals.expenses)}</td>
                  <td className={`num ${s.averageDisposable < 0 ? 'neg' : ''}`}>{fmtKr(s.averageDisposable)}</td>
                  <td className={`num ${diff < 0 ? 'neg' : ''}`}>{b.id === base?.b.id ? '–' : `${diff > 0 ? '+' : ''}${fmtKr(diff)}`}</td>
                  <td className={`num ${s.lowestBalance.value < 0 ? 'neg' : ''}`}>{fmtKr(s.lowestBalance.value)}</td>
                  <td className={`num ${(s.balance[11] ?? 0) < 0 ? 'neg' : ''}`}>{fmtKr(s.balance[11] ?? 0)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {peopleNames.length > 0 && (
        <>
          <h3>Rådighedsbeløb pr. person (snit pr. md.)</h3>
          <div className="table-wrap">
            <table className="overview">
              <thead>
                <tr>
                  <th>Scenarie</th>
                  {peopleNames.map((n) => (
                    <th key={n} className="num">
                      {n}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summaries.map(({ b, p }) => (
                  <tr key={b.id}>
                    <th scope="row">{b.name}</th>
                    {peopleNames.map((n) => {
                      const person = p.people.find((x) => x.name === n);
                      const avg = person ? person.totals.disposable / 12 : null;
                      return (
                        <td key={n} className={`num ${avg !== null && avg < 0 ? 'neg' : ''}`}>
                          {avg === null ? '–' : fmtKr(avg)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <h3>Rådighedsbeløb pr. måned</h3>
      <div className="table-wrap">
        <table className="overview">
          <thead>
            <tr>
              <th>Scenarie</th>
              {MONTHS.map((m) => (
                <th key={m} className="num">
                  {m}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {summaries.map(({ b, s }) => (
              <tr key={b.id}>
                <th scope="row">{b.name}</th>
                {s.disposable.map((v, i) => (
                  <td key={i} className={`num ${v < 0 ? 'neg' : ''}`}>
                    {fmt(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
