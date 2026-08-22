import { useState } from 'react';
import type { AppState } from '../types';
import { lastNDays, todayKey } from '../lib/date';
import { categoryRates, heatmap, movers } from '../lib/insights';
import { countPerfect, scoreDay } from '../lib/scoring';

interface Props {
  state: AppState;
  onPickDay: (date: string) => void;
}

const WINDOWS = [30, 60, 90];

export function Insights({ state, onPickDay }: Props) {
  const [window, setWindow] = useState(30);
  const today = todayKey();

  const windowDays = lastNDays(today, window);
  const moverWindow = lastNDays(today, Math.max(window, 60));
  const top = movers(state, moverWindow).slice(0, 6);
  const rates = categoryRates(state, windowDays);
  const grid = heatmap(state, today, 12);
  const perfect = countPerfect(state, windowDays);
  const logged = windowDays.filter((d) => scoreDay(state, d).hasData).length;

  return (
    <div className="screen">
      <div className="pad">
        <h1 className="screen-title">Insights</h1>
        <div className="screen-sub">
          {logged} days logged · {perfect} perfect {perfect === 1 ? 'day' : 'days'} in the last {window}
        </div>
        <div>
          {WINDOWS.map((w) => (
            <button
              key={w}
              className="chip"
              style={w === window ? { borderColor: 'var(--accent)', color: 'var(--accent)' } : undefined}
              onClick={() => setWindow(w)}
            >
              {w} days
            </button>
          ))}
        </div>
      </div>

      <section>
        <div className="section-head">
          <h2>What moves the score</h2>
        </div>
        {top.length === 0 ? (
          <p className="empty-note">
            Not enough history yet. Once a habit has been both hit and missed a few times, it shows up
            here with what the rest of your day looked like either way.
          </p>
        ) : (
          top.map((m) => (
            <div className="mover" key={m.habit.id}>
              <div className="mover-main">
                <div className="mover-name">{m.label}</div>
                <div className="mover-sub">
                  {m.withAvg} vs {m.withoutAvg} on the rest of the day · {m.days} days
                </div>
              </div>
              <div className={`mover-lift ${m.lift >= 0 ? 'lift-pos' : 'lift-neg'}`}>
                {m.lift >= 0 ? '+' : ''}
                {m.lift}
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <div className="section-head">
          <h2>Last 12 weeks</h2>
        </div>
        <div className="heat">
          {grid.map((column, ci) => (
            <div className="heat-col" key={ci}>
              {column.map((cell) => (
                <button
                  key={cell.date}
                  className="heat-cell"
                  title={`${cell.date}${cell.hasData ? ` · ${cell.score}` : ''}`}
                  style={{ background: cellColor(cell.score, cell.hasData) }}
                  onClick={() => cell.hasData && onPickDay(cell.date)}
                />
              ))}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>By category ({window} days)</h2>
        </div>
        {rates.length === 0 ? (
          <p className="empty-note">Nothing logged in this window.</p>
        ) : (
          rates.map((r) => (
            <div className="rate" key={r.categoryId}>
              <span className="rate-name">{r.name}</span>
              <span className="rate-track">
                <span className="rate-fill" style={{ width: `${Math.round(r.rate * 100)}%` }} />
              </span>
              <span className="rate-val">{Math.round(r.rate * 100)}%</span>
            </div>
          ))
        )}
      </section>
    </div>
  );
}

/** Blue ramps with score; a perfect day breaks out into green. */
function cellColor(score: number, hasData: boolean): string {
  if (!hasData) return 'var(--track)';
  if (score >= 100) return 'var(--good)';
  const t = Math.min(1, Math.max(0, score / 100));
  const alpha = 0.16 + t * 0.84;
  return `rgba(123, 167, 215, ${alpha.toFixed(2)})`;
}
