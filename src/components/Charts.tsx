import { useEffect, useRef, useState } from 'react';
import type { BudgetSummary } from '../calc';
import { fmt, fmtKr, MONTHS, MONTHS_LONG } from '../calc';

interface Series {
  name: string;
  values: number[];
  /** CSS-variabel for farven */
  color: string;
  /** Farve for negative værdier (bruges til rådighedsbeløb) */
  negColor?: string;
}

const H = 260;
const PAD = { top: 16, right: 12, bottom: 28, left: 64 };

function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(640);
  useEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(280, e.contentRect.width)));
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

function niceTicks(min: number, max: number, count = 5) {
  if (min === max) max = min + 1;
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((f) => f * mag).find((s) => s >= raw) ?? raw;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks: number[] = [];
  for (let t = lo; t <= hi + step / 2; t += step) ticks.push(Math.round(t));
  return ticks;
}

const oneDecimal = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 1 });
const shortKr = (v: number) => (Math.abs(v) >= 1000 ? `${oneDecimal.format(v / 1000)}k` : fmt(v));

export function Chart({ title, series, kind }: { title: string; series: Series[]; kind: 'bar' | 'line' }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const all = series.flatMap((s) => s.values);
  const ticks = niceTicks(Math.min(0, ...all), Math.max(0, ...all));
  const yMin = ticks[0];
  const yMax = ticks[ticks.length - 1];
  const innerW = width - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const y = (v: number) => PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH;
  const band = innerW / 12;
  const xCenter = (i: number) => PAD.left + band * i + band / 2;

  const groupW = Math.min(band * 0.7, 56);
  const gap = 2;
  const barW = (groupW - gap * (series.length - 1)) / series.length;

  return (
    <figure className="chart" ref={ref}>
      <figcaption>
        <span className="chart-title">{title}</span>
        {series.length > 1 && (
          <span className="legend">
            {series.map((s) => (
              <span key={s.name}>
                <i style={{ background: `var(${s.color})` }} />
                {s.name}
              </span>
            ))}
          </span>
        )}
      </figcaption>
      <svg width={width} height={H} role="img" aria-label={title} onMouseLeave={() => setHover(null)}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(t)} y2={y(t)} className={t === 0 ? 'axis-zero' : 'grid'} />
            <text x={PAD.left - 8} y={y(t)} dy="0.32em" textAnchor="end" className="tick">
              {shortKr(t)}
            </text>
          </g>
        ))}
        {MONTHS.map((m, i) => (
          <text key={m} x={xCenter(i)} y={H - 8} textAnchor="middle" className="tick">
            {band < 36 ? m[0] : m}
          </text>
        ))}

        {hover !== null && <rect x={PAD.left + band * hover} y={PAD.top} width={band} height={innerH} className="hover-band" />}

        {kind === 'bar' &&
          series.map((s, si) =>
            s.values.map((v, i) => {
              const x = xCenter(i) - groupW / 2 + si * (barW + gap);
              const y0 = y(0);
              const y1 = y(v);
              const h = Math.abs(y1 - y0);
              const top = Math.min(y0, y1);
              const r = Math.min(4, barW / 2, h);
              const color = v < 0 && s.negColor ? s.negColor : s.color;
              // Afrundet i den ende der vender væk fra nul-linjen
              const d =
                v >= 0
                  ? `M${x},${y0} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${y0} Z`
                  : `M${x},${y0} V${top + h - r} Q${x},${top + h} ${x + r},${top + h} H${x + barW - r} Q${x + barW},${top + h} ${x + barW},${top + h - r} V${y0} Z`;
              return h > 0 ? <path key={`${si}-${i}`} d={d} style={{ fill: `var(${color})` }} /> : null;
            }),
          )}

        {kind === 'line' &&
          series.map((s) => (
            <g key={s.name}>
              <polyline
                points={s.values.map((v, i) => `${xCenter(i)},${y(v)}`).join(' ')}
                fill="none"
                strokeWidth={2}
                strokeLinejoin="round"
                style={{ stroke: `var(${s.color})` }}
              />
              {s.values.map((v, i) => (
                <circle
                  key={i}
                  cx={xCenter(i)}
                  cy={y(v)}
                  r={hover === i ? 5 : 3.5}
                  className="dot"
                  style={{ fill: `var(${v < 0 && s.negColor ? s.negColor : s.color})` }}
                />
              ))}
            </g>
          ))}

        {/* Usynlige hit-flader pr. måned for tooltip */}
        {MONTHS.map((m, i) => (
          <rect
            key={m}
            x={PAD.left + band * i}
            y={PAD.top}
            width={band}
            height={innerH}
            fill="transparent"
            onMouseEnter={() => setHover(i)}
            onTouchStart={() => setHover(i)}
          />
        ))}
      </svg>
      {hover !== null && (
        <div
          className="tooltip"
          style={{
            left: Math.min(Math.max(xCenter(hover), 90), width - 90),
            top: PAD.top,
          }}
        >
          <strong>{MONTHS_LONG[hover]}</strong>
          {series.map((s) => (
            <div key={s.name}>
              <i style={{ background: `var(${s.values[hover] < 0 && s.negColor ? s.negColor : s.color})` }} />
              {s.name}: <b>{fmtKr(s.values[hover])}</b>
            </div>
          ))}
        </div>
      )}
    </figure>
  );
}

export function Charts({ summary: s }: { summary: BudgetSummary }) {
  return (
    <div className="charts">
      <Chart
        title="Indtægter og udgifter pr. måned"
        kind="bar"
        series={[
          { name: 'Indtægter', values: s.income, color: '--series-1' },
          { name: 'Udgifter', values: s.expenses, color: '--series-2' },
        ]}
      />
      <Chart
        title="Rådighedsbeløb pr. måned"
        kind="bar"
        series={[{ name: 'Rådighedsbeløb', values: s.disposable, color: '--pos', negColor: '--neg' }]}
      />
      <Chart
        title="Saldo ved udgangen af måneden"
        kind="line"
        series={[{ name: 'Saldo', values: s.balance, color: '--pos', negColor: '--neg' }]}
      />
      <p className="muted small">Tabelvisning af de samme tal findes under “Årsoversigt”.</p>
    </div>
  );
}
