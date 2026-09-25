import { describe, expect, it } from 'vitest';
import { summarize, sum } from './calc';
import { peopleOf, summarizePeople } from './people';
import { newItem, sampleBudget } from './storage';
import type { Budget, SplitMethod } from './types';

const budget = (method: SplitMethod, customShares: Record<string, number> = {}): Budget => ({
  id: 'b',
  name: 'Test',
  year: 2026,
  startBalance: 0,
  sharing: { method, customShares },
  items: [
    newItem({ type: 'income', amount: 30000, owner: 'Anna' }),
    newItem({ type: 'income', amount: 10000, owner: 'Bo' }),
    newItem({ type: 'income', amount: 2000, owner: 'Fælles' }),
    newItem({ amount: 22000, owner: 'fælles' }),
    newItem({ amount: 1200, frequency: 'yearly', owner: '' }),
    newItem({ amount: 500, owner: 'Bo' }),
  ],
});

describe('peopleOf', () => {
  it('finder personer og ignorerer fælles/tomme ejere', () => {
    expect(peopleOf(budget('equal').items)).toEqual(['Anna', 'Bo']);
  });
});

describe('summarizePeople', () => {
  it('fordeler fælles nettoudgift ligeligt', () => {
    const s = summarizePeople(budget('equal'));
    expect(s.sharedNet[1]).toBe(20000);
    const [anna, bo] = s.people;
    expect(anna.share).toBe(0.5);
    expect(anna.disposable[1]).toBe(30000 - 10000);
    expect(bo.disposable[1]).toBe(10000 - 500 - 10000);
    expect(anna.monthlyTransfer).toBe((20000 * 12 + 1200) / 2 / 12);
  });

  it('fordeler efter indkomst', () => {
    const [anna, bo] = summarizePeople(budget('income')).people;
    expect(anna.share).toBe(0.75);
    expect(bo.share).toBe(0.25);
  });

  it('normaliserer egne procentsatser', () => {
    const [anna, bo] = summarizePeople(budget('custom', { Anna: 60, Bo: 20 })).people;
    expect(anna.share).toBe(0.75);
    expect(bo.share).toBe(0.25);
  });

  it('falder tilbage til ligelig fordeling når vægtene er nul', () => {
    const [anna] = summarizePeople(budget('custom')).people;
    expect(anna.share).toBe(0.5);
  });

  it('personernes rådighedsbeløb summerer til husstandens', () => {
    for (const b of [budget('equal'), budget('income'), sampleBudget(2026)]) {
      const total = summarize(b).disposable;
      const people = summarizePeople(b).people;
      total.forEach((v, m) => expect(sum(people.map((p) => p.disposable[m]))).toBeCloseTo(v, 6));
    }
  });
});
