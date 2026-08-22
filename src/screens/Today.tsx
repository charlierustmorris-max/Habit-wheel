import { useState } from 'react';
import type { AppState, DayLog, Habit } from '../types';
import { ONE_OFF_CATEGORY } from '../data/defaults';
import { dayProgress, formatLong, todayKey } from '../lib/date';
import { newId } from '../lib/parse';
import { earnedPoints, getDay, isComplete, scheduledHabits, scoreDay, streak } from '../lib/scoring';
import { HabitRow } from '../components/HabitRow';
import { LogSheet } from '../components/LogSheet';
import { ScoreRing } from '../components/ScoreRing';
import { IconCheck, IconPlus } from '../components/Icons';

interface Props {
  state: AppState;
  date: string;
  onDate: (d: string) => void;
  updateDay: (date: string, fn: (day: DayLog) => DayLog) => void;
}

export function Today({ state, date, onDate, updateDay }: Props) {
  const [sheet, setSheet] = useState<Habit | null>(null);
  const [draft, setDraft] = useState('');

  const day = getDay(state, date);
  const score = scoreDay(state, date);
  const habits = scheduledHabits(state, date).filter((h) => h.categoryId !== ONE_OFF_CATEGORY);
  const today = todayKey();
  const isToday = date === today;

  const streak80 = streak(state, today, state.settings.streakThreshold);
  const needle = streak(state, today, state.settings.needleThreshold);

  const setValue = (habit: Habit, value: number | null, missed: boolean) => {
    updateDay(date, (d) => {
      const values = { ...d.values };
      if (value === null) delete values[habit.id];
      else values[habit.id] = value;
      const rest = d.missed.filter((id) => id !== habit.id);
      return { ...d, values, missed: missed ? [...rest, habit.id] : rest };
    });
    setSheet(null);
  };

  const tap = (habit: Habit) => {
    if (habit.kind === 'binary') {
      const done = isComplete(habit, day.values[habit.id]);
      setValue(habit, done ? null : 1, false);
    } else {
      setSheet(habit);
    }
  };

  const addOneOff = () => {
    const text = draft.trim();
    if (!text) return;
    updateDay(date, (d) => ({ ...d, oneOffs: [...d.oneOffs, { id: newId(), text, done: false }] }));
    setDraft('');
  };

  const toggleOneOff = (id: string) => {
    updateDay(date, (d) => ({
      ...d,
      oneOffs: d.oneOffs.map((o) => (o.id === id ? { ...o, done: !o.done } : o)),
    }));
  };

  const removeOneOff = (id: string) => {
    updateDay(date, (d) => ({ ...d, oneOffs: d.oneOffs.filter((o) => o.id !== id) }));
  };

  const categories = [...state.categories]
    .filter((c) => c.id !== ONE_OFF_CATEGORY)
    .sort((a, b) => a.order - b.order)
    .map((c) => ({ category: c, items: habits.filter((h) => h.categoryId === c.id) }))
    .filter((g) => g.items.length > 0);

  return (
    <div className="screen">
      <div className="pad head-row">
        <div>
          <h1 className="screen-title">{isToday ? 'Today' : 'Recap'}</h1>
          <div className="screen-sub">{formatLong(date)}</div>
        </div>
        <div className="date-nav" style={{ paddingTop: 22 }}>
          <button onClick={() => onDate(shift(date, -1))} aria-label="Previous day">
            ‹
          </button>
          <button onClick={() => onDate(shift(date, 1))} disabled={date >= today} aria-label="Next day">
            ›
          </button>
        </div>
      </div>

      <div className="today-head">
        <ScoreRing score={score.score} ceiling={score.ceiling} />
        <div className="stats">
          <div className="stat">
            <span className="stat-key">Banked</span>
            <span className="stat-val">
              {score.banked} <span className="dim">/ {score.available}</span>
            </span>
          </div>
          <div className="stat">
            <span className="stat-key">Ceiling</span>
            <span className="stat-val">{score.ceiling}</span>
          </div>
          <div className="stat">
            <span className="stat-key">Streak {state.settings.streakThreshold}+</span>
            <span className="stat-val">
              {streak80.current}d <span className="dim">· best {streak80.best}</span>
            </span>
          </div>
          <div className="stat">
            <span className="stat-key">Needle</span>
            <span className="stat-val">
              {needle.current}d <span className="dim">· best {needle.best}</span>
            </span>
          </div>
        </div>
      </div>

      <div className="pace">{paceLine(state, score.score, score.ceiling, date, isToday, habits, day)}</div>

      {categories.map(({ category, items }) => {
        const banked = items.reduce((sum, h) => sum + earnedPoints(h, day.values[h.id]), 0);
        const total = items.reduce((sum, h) => sum + h.points, 0);
        return (
          <section key={category.id}>
            <div className="section-head">
              <h2>{category.name}</h2>
              <span className="meta">
                {Math.round(banked * 10) / 10} / {total} pts
              </span>
            </div>
            {items.map((habit) => (
              <HabitRow
                key={habit.id}
                habit={habit}
                day={day}
                onTap={() => tap(habit)}
                onHold={() => setSheet(habit)}
              />
            ))}
          </section>
        );
      })}

      <section>
        <div className="section-head">
          <h2>One-off</h2>
          <span className="meta">
            {day.oneOffs.filter((o) => o.done).length} / {day.oneOffs.length} · unweighted
          </span>
        </div>

        {day.oneOffs.map((o) => (
          <div className="row" key={o.id} style={{ cursor: 'default' }}>
            <button
              className={`check${o.done ? ' done' : ' unlogged'}`}
              onClick={() => toggleOneOff(o.id)}
              aria-label={o.done ? 'Mark not done' : 'Mark done'}
            >
              {o.done ? <IconCheck /> : null}
            </button>
            <span className="row-main">
              <span className={`row-name${o.done ? ' done' : ''}`}>{o.text}</span>
            </span>
            <button className="row-value" onClick={() => removeOneOff(o.id)} aria-label="Delete">
              ✕
            </button>
          </div>
        ))}

        <div className="row" style={{ gap: 10 }}>
          <input
            value={draft}
            placeholder="Add a to-do"
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addOneOff()}
          />
          <button className="check partial" onClick={addOneOff} aria-label="Add">
            <span style={{ color: 'var(--accent)' }}>
              <IconPlus />
            </span>
          </button>
        </div>
      </section>

      {sheet && (
        <LogSheet
          habit={sheet}
          day={day}
          onSave={(value, missed) => setValue(sheet, value, missed)}
          onClose={() => setSheet(null)}
        />
      )}
    </div>
  );
}

function shift(date: string, n: number): string {
  const d = new Date(date + 'T00:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function paceLine(
  _state: AppState,
  score: number,
  ceiling: number,
  _date: string,
  isToday: boolean,
  habits: Habit[],
  day: DayLog,
): string {
  if (score >= 100) return 'Perfect day. Nothing left on the table.';

  const remaining = 100 - score;

  if (!isToday) {
    if (score >= 80) return `Finished at ${score}. That one counted.`;
    return `Finished at ${score}. ${remaining} left on the table.`;
  }

  if (score >= ceiling) return `Ceiling is ${ceiling} now — the rest is written off.`;

  const biggest = habits
    .filter((h) => !isComplete(h, day.values[h.id]) && !day.missed.includes(h.id))
    .sort((a, b) => b.points - a.points)[0];

  const expected = ceiling * dayProgress();
  const onPace = score >= expected;

  const lead = `${remaining} to go.`;
  if (onPace) return biggest ? `${lead} Even pace takes it — ${biggest.name} is the big one left.` : `${lead} Even pace takes it.`;
  return biggest ? `${lead} Behind pace. ${biggest.name} closes most of it.` : `${lead} Behind pace.`;
}
