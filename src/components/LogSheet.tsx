import { useState } from 'react';
import type { DayLog, Habit } from '../types';
import { earnedPoints } from '../lib/scoring';
import { Sheet } from './Sheet';

interface Props {
  habit: Habit;
  day: DayLog;
  onSave: (value: number | null, missed: boolean) => void;
  onClose: () => void;
}

/** Step size that feels right for the unit the habit is measured in. */
function stepFor(habit: Habit): number {
  if (habit.unit === 'hours') return 0.5;
  if (habit.unit === 'minutes') return 5;
  return 1;
}

export function LogSheet({ habit, day, onSave, onClose }: Props) {
  const initial = day.values[habit.id] ?? (habit.kind === 'session' ? 0 : 0);
  const [value, setValue] = useState<number>(initial);
  const step = stepFor(habit);

  return (
    <Sheet onClose={onClose}>
      <h3>{habit.name}</h3>
      <p className="lede">
        Worth {habit.points} points
        {habit.target ? ` at ${habit.target} ${habit.unit ?? ''}`.trimEnd() : ''}. Partial counts partially.
      </p>

      {habit.kind === 'session' ? (
        <div>
          {(habit.levels ?? []).map((level) => (
            <button
              key={level.id}
              className={`level${value === level.fraction ? ' selected' : ''}`}
              onClick={() => onSave(level.fraction, level.fraction === 0)}
            >
              <span>{level.label}</span>
              <span className="pts">{Math.round(level.fraction * habit.points * 10) / 10} pts</span>
            </button>
          ))}
        </div>
      ) : (
        <>
          <div className="stepper" style={{ justifyContent: 'center', margin: '10px 0 18px' }}>
            <button onClick={() => setValue((v) => Math.max(0, round2(v - step)))} aria-label="Less">
              −
            </button>
            <span className="amount">{round2(value)}</span>
            <button onClick={() => setValue((v) => round2(v + step))} aria-label="More">
              +
            </button>
          </div>
          <div style={{ textAlign: 'center', color: 'var(--muted)', fontSize: 15 }}>
            {habit.unit} · banks {earnedPoints(habit, value)} of {habit.points} points
          </div>
          <div className="sheet-actions">
            <button className="btn" onClick={() => setValue(habit.target ?? 1)}>
              Hit target
            </button>
            <button className="btn primary" onClick={() => onSave(value, false)}>
              Save
            </button>
          </div>
        </>
      )}

      <div className="sheet-actions">
        <button className="btn" onClick={() => onSave(null, false)}>
          Clear
        </button>
        <button className="btn danger" onClick={() => onSave(day.values[habit.id] ?? 0, true)}>
          Write off today
        </button>
      </div>
    </Sheet>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
