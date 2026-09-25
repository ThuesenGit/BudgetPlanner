import type { BudgetSummary } from '../calc';
import { fmtKr, MONTHS_LONG } from '../calc';

export function SummaryTiles({ summary: s }: { summary: BudgetSummary }) {
  const negativeMonths = s.disposable.filter((d) => d < 0).length;
  return (
    <section className="tiles" aria-label="Nøgletal">
      <Tile label="Indtægter pr. år" value={fmtKr(s.totals.income)} sub={`${fmtKr(s.totals.income / 12)} / md. i snit`} />
      <Tile label="Udgifter pr. år" value={fmtKr(s.totals.expenses)} sub={`${fmtKr(s.totals.expenses / 12)} / md. i snit`} />
      <Tile
        label="Rådighedsbeløb pr. md. (snit)"
        value={fmtKr(s.averageDisposable)}
        tone={s.averageDisposable < 0 ? 'bad' : 'good'}
        sub={negativeMonths ? `${negativeMonths} måned(er) med underskud` : 'Ingen måneder med underskud'}
      />
      <Tile
        label="Laveste saldo"
        value={fmtKr(s.lowestBalance.value)}
        tone={s.lowestBalance.value < 0 ? 'bad' : undefined}
        sub={s.lowestBalance.month >= 0 ? `i ${MONTHS_LONG[s.lowestBalance.month].toLowerCase()}` : 'ved årets start'}
      />
      <Tile
        label="Til budgetkonto pr. md."
        value={fmtKr(s.budgetAccountTransfer)}
        sub="udjævner ikke-månedlige udgifter"
      />
    </section>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'good' | 'bad' }) {
  return (
    <div className={`tile ${tone ?? ''}`}>
      <div className="tile-label">{label}</div>
      <div className="tile-value">{value}</div>
      {sub && <div className="tile-sub">{sub}</div>}
    </div>
  );
}
