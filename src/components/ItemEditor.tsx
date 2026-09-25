import { useEffect, useState } from 'react';
import type { BudgetItem, Frequency } from '../types';
import { fmtKr, itemMonthly, MONTHS, MONTHS_LONG, sum } from '../calc';

interface Props {
  item: BudgetItem;
  categories: string[];
  owners: string[];
  onSave: (item: BudgetItem) => void;
  onCancel: () => void;
}

const FREQUENCIES: { id: Frequency; label: string }[] = [
  { id: 'monthly', label: 'Hver måned' },
  { id: 'quarterly', label: 'Hvert kvartal' },
  { id: 'halfyearly', label: 'Hvert halve år' },
  { id: 'yearly', label: 'Én gang om året' },
  { id: 'custom', label: 'Udvalgte måneder' },
  { id: 'variable', label: 'Forskelligt beløb hver måned' },
];

export function ItemEditor({ item, categories, owners, onSave, onCancel }: Props) {
  const [draft, setDraft] = useState<BudgetItem>(item);
  const set = <K extends keyof BudgetItem>(k: K, v: BudgetItem[K]) => setDraft((d) => ({ ...d, [k]: v }));

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const preview = itemMonthly({ ...draft, enabled: true });
  const usesStart = ['quarterly', 'halfyearly', 'yearly'].includes(draft.frequency);

  const toggleMonth = (m: number) =>
    set('months', draft.months.includes(m) ? draft.months.filter((x) => x !== m) : [...draft.months, m].sort((a, b) => a - b));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...draft, name: draft.name.trim() || (draft.type === 'income' ? 'Indtægt' : 'Udgift'), category: draft.category.trim() });
  };

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <form className="modal" onSubmit={submit} role="dialog" aria-modal="true" aria-label="Redigér post">
        <h2>{draft.type === 'income' ? 'Indtægt' : 'Udgift'}</h2>

        <div className="segmented">
          <button type="button" className={draft.type === 'income' ? 'active' : ''} onClick={() => set('type', 'income')}>
            Indtægt
          </button>
          <button type="button" className={draft.type === 'expense' ? 'active' : ''} onClick={() => set('type', 'expense')}>
            Udgift
          </button>
        </div>

        <div className="form-grid">
          <label>
            Navn
            <input autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="fx Husleje" />
          </label>
          <label>
            Kategori
            <input list="cat-list" value={draft.category} onChange={(e) => set('category', e.target.value)} placeholder="fx Bolig" />
            <datalist id="cat-list">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <label>
            Hvem
            <input list="owner-list" value={draft.owner} onChange={(e) => set('owner', e.target.value)} placeholder="fx Fælles" />
            <datalist id="owner-list">
              {['Fælles', ...owners.filter((o) => o !== 'Fælles')].map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
          </label>
          <label>
            Hyppighed
            <select value={draft.frequency} onChange={(e) => set('frequency', e.target.value as Frequency)}>
              {FREQUENCIES.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.label}
                </option>
              ))}
            </select>
          </label>
          {draft.frequency !== 'variable' && (
            <label>
              Beløb pr. gang (kr.)
              <input
                type="number"
                min={0}
                step="any"
                value={draft.amount || ''}
                onChange={(e) => set('amount', Math.abs(Number(e.target.value)) || 0)}
              />
            </label>
          )}
          {usesStart && (
            <label>
              {draft.frequency === 'yearly' ? 'Betales i' : 'Første betaling i'}
              <select value={draft.startMonth} onChange={(e) => set('startMonth', Number(e.target.value))}>
                {MONTHS_LONG.map((m, i) => (
                  <option key={m} value={i}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>

        {draft.frequency === 'custom' && (
          <fieldset className="months">
            <legend>Vælg måneder</legend>
            {MONTHS.map((m, i) => (
              <label key={m} className="chip">
                <input type="checkbox" checked={draft.months.includes(i)} onChange={() => toggleMonth(i)} />
                {m}
              </label>
            ))}
          </fieldset>
        )}

        {draft.frequency === 'variable' && (
          <fieldset className="variable">
            <legend>Beløb pr. måned (kr.)</legend>
            {MONTHS.map((m, i) => (
              <label key={m}>
                {m}
                <input
                  type="number"
                  min={0}
                  step="any"
                  value={draft.monthlyAmounts[i] || ''}
                  onChange={(e) => {
                    const next = [...draft.monthlyAmounts];
                    next[i] = Math.abs(Number(e.target.value)) || 0;
                    set('monthlyAmounts', next);
                  }}
                />
              </label>
            ))}
          </fieldset>
        )}

        <label className="full">
          Note
          <input value={draft.note} onChange={(e) => set('note', e.target.value)} placeholder="Valgfri" />
        </label>

        <div className="preview" aria-label="Fordeling over året">
          {preview.map((v, i) => (
            <div key={i} className={v ? 'hit' : ''} title={`${MONTHS_LONG[i]}: ${fmtKr(v)}`}>
              <span>{MONTHS[i]}</span>
            </div>
          ))}
          <div className="preview-total">
            {fmtKr(sum(preview))} pr. år · {fmtKr(sum(preview) / 12)} pr. md.
          </div>
        </div>

        <div className="modal-actions">
          <button type="button" onClick={onCancel}>
            Annullér
          </button>
          <button type="submit" className="primary">
            Gem
          </button>
        </div>
      </form>
    </div>
  );
}
