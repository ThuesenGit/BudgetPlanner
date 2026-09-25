import { useMemo, useState } from 'react';
import type { BudgetItem, ItemType } from '../types';
import { fmtKr, frequencyLabel, itemYearly } from '../calc';
import { newItem, uid } from '../storage';
import { ItemEditor } from './ItemEditor';

interface Props {
  items: BudgetItem[];
  onChange: (items: BudgetItem[]) => void;
}

export function ItemList({ items, onChange }: Props) {
  const [editing, setEditing] = useState<BudgetItem | null>(null);
  const [filter, setFilter] = useState('');

  const categories = useMemo(() => [...new Set(items.map((i) => i.category).filter(Boolean))].sort(), [items]);
  const owners = useMemo(() => [...new Set(items.map((i) => i.owner).filter(Boolean))].sort(), [items]);

  const save = (item: BudgetItem) => {
    onChange(items.some((i) => i.id === item.id) ? items.map((i) => (i.id === item.id ? item : i)) : [...items, item]);
    setEditing(null);
  };
  const remove = (id: string) => onChange(items.filter((i) => i.id !== id));
  const toggle = (id: string) => onChange(items.map((i) => (i.id === id ? { ...i, enabled: !i.enabled } : i)));
  const copy = (item: BudgetItem) => onChange([...items, { ...structuredClone(item), id: uid(), name: `${item.name} (kopi)` }]);

  const q = filter.trim().toLowerCase();
  const visible = q
    ? items.filter((i) => [i.name, i.category, i.owner, i.note].some((t) => t.toLowerCase().includes(q)))
    : items;

  return (
    <div>
      <div className="toolbar">
        <button className="primary" onClick={() => setEditing(newItem({ type: 'income' }))}>
          + Indtægt
        </button>
        <button className="primary" onClick={() => setEditing(newItem({ type: 'expense' }))}>
          + Udgift
        </button>
        <input className="search" placeholder="Søg i poster…" value={filter} onChange={(e) => setFilter(e.target.value)} />
      </div>

      {(['income', 'expense'] as ItemType[]).map((type) => (
        <Group
          key={type}
          type={type}
          items={visible.filter((i) => i.type === type)}
          onEdit={setEditing}
          onRemove={remove}
          onToggle={toggle}
          onCopy={copy}
        />
      ))}

      {editing && (
        <ItemEditor
          item={editing}
          categories={categories}
          owners={owners}
          onSave={save}
          onCancel={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function Group({
  type,
  items,
  onEdit,
  onRemove,
  onToggle,
  onCopy,
}: {
  type: ItemType;
  items: BudgetItem[];
  onEdit: (i: BudgetItem) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  onCopy: (i: BudgetItem) => void;
}) {
  const sorted = [...items].sort((a, b) => a.category.localeCompare(b.category, 'da') || a.name.localeCompare(b.name, 'da'));
  const total = items.reduce((s, i) => s + itemYearly(i), 0);
  return (
    <section className="group">
      <h2>
        {type === 'income' ? 'Indtægter' : 'Udgifter'} <span className="muted">· {fmtKr(total)} pr. år</span>
      </h2>
      {sorted.length === 0 ? (
        <p className="muted">Ingen poster endnu.</p>
      ) : (
        <div className="table-wrap">
          <table className="items">
            <thead>
              <tr>
                <th title="Medtag i beregningen">Med</th>
                <th>Post</th>
                <th>Kategori</th>
                <th>Hvem</th>
                <th>Hyppighed</th>
                <th className="num">Beløb</th>
                <th className="num">Pr. år</th>
                <th className="num">Pr. md.</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => {
                const yearly = itemYearly(i);
                return (
                  <tr key={i.id} className={i.enabled ? '' : 'disabled'}>
                    <td>
                      <input type="checkbox" checked={i.enabled} onChange={() => onToggle(i.id)} aria-label={`Medtag ${i.name}`} />
                    </td>
                    <td>
                      <button className="link" onClick={() => onEdit(i)}>
                        {i.name || '(uden navn)'}
                      </button>
                      {i.note && <div className="note">{i.note}</div>}
                    </td>
                    <td>{i.category}</td>
                    <td>{i.owner}</td>
                    <td className="freq">{frequencyLabel(i)}</td>
                    <td className="num">{i.frequency === 'variable' ? '–' : fmtKr(i.amount)}</td>
                    <td className="num">{fmtKr(i.enabled ? yearly : 0)}</td>
                    <td className="num muted">{fmtKr(i.enabled ? yearly / 12 : 0)}</td>
                    <td className="actions">
                      <button onClick={() => onEdit(i)}>Redigér</button>
                      <button onClick={() => onCopy(i)}>Kopiér</button>
                      <button
                        className="danger"
                        onClick={() => confirm(`Slet "${i.name}"?`) && onRemove(i.id)}
                      >
                        Slet
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
