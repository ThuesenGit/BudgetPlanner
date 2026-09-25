import { Fragment, useState } from 'react';
import type { Budget } from '../types';
import type { BudgetSummary } from '../calc';
import { fmt, itemMonthly, MONTHS, sum } from '../calc';

export function YearOverview({ budget, summary: s }: { budget: Budget; summary: BudgetSummary }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const toggle = (key: string) =>
    setOpen((o) => {
      const n = new Set(o);
      n.has(key) ? n.delete(key) : n.add(key);
      return n;
    });

  const cells = (xs: number[], total: number, cls = '') => (
    <>
      {xs.map((v, i) => (
        <td key={i} className={`num ${cls} ${v < 0 ? 'neg' : ''}`}>
          {v ? fmt(v) : ''}
        </td>
      ))}
      <td className={`num total ${cls} ${total < 0 ? 'neg' : ''}`}>{fmt(total)}</td>
    </>
  );

  const section = (type: 'income' | 'expense') =>
    s.categories
      .filter((c) => c.type === type)
      .map((c) => {
        const key = `${type}:${c.category}`;
        const items = budget.items.filter((i) => i.type === type && (i.category || 'Andet') === c.category && i.enabled);
        return (
          <Fragment key={key}>
            <tr className="cat-row">
              <th scope="row">
                <button className="link" onClick={() => toggle(key)} aria-expanded={open.has(key)}>
                  {open.has(key) ? '▾' : '▸'} {c.category}
                </button>
              </th>
              {cells(c.monthly, c.total)}
            </tr>
            {open.has(key) &&
              items.map((i) => {
                const m = itemMonthly(i);
                return (
                  <tr key={i.id} className="item-row">
                    <th scope="row">
                      {i.name}
                      {i.owner && i.owner !== 'Fælles' ? <span className="muted"> · {i.owner}</span> : null}
                    </th>
                    {cells(m, sum(m))}
                  </tr>
                );
              })}
          </Fragment>
        );
      });

  return (
    <div className="table-wrap">
      <table className="overview">
        <thead>
          <tr>
            <th>{budget.year}</th>
            {MONTHS.map((m) => (
              <th key={m} className="num">
                {m}
              </th>
            ))}
            <th className="num">I alt</th>
          </tr>
        </thead>
        <tbody>
          <tr className="section">
            <th colSpan={14}>Indtægter</th>
          </tr>
          {section('income')}
          <tr className="sum-row">
            <th scope="row">Indtægter i alt</th>
            {cells(s.income, s.totals.income)}
          </tr>
          <tr className="section">
            <th colSpan={14}>Udgifter</th>
          </tr>
          {section('expense')}
          <tr className="sum-row">
            <th scope="row">Udgifter i alt</th>
            {cells(s.expenses, s.totals.expenses)}
          </tr>
          <tr className="result-row">
            <th scope="row">Rådighedsbeløb</th>
            {cells(s.disposable, s.totals.disposable)}
          </tr>
          <tr className="balance-row">
            <th scope="row">Saldo ultimo</th>
            {s.balance.map((v, i) => (
              <td key={i} className={`num ${v < 0 ? 'neg' : ''}`}>
                {fmt(v)}
              </td>
            ))}
            <td className="num total">{fmt(s.balance[11] ?? 0)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
