import { useRef } from 'react';
import type { DayLog, Habit } from '../types';
import { earnedPoints, isComplete, isLogged } from '../lib/scoring';
import { IconCheck, IconX } from './Icons';

interface Props {
  habit: Habit;
  day: DayLog;
  onTap: () => void;
  onHold: () => void;
}

export function HabitRow({ habit, day, onTap, onHold }: Props) {
  const value = day.values[habit.id];
  const missed = day.missed.includes(habit.id);
  const logged = isLogged(day, habit);
  const complete = isComplete(habit, value);
  const earned = earnedPoints(habit, value);

  const timer = useRef<number | null>(null);
  const held = useRef(false);

  const start = () => {
    held.current = false;
    timer.current = window.setTimeout(() => {
      held.current = true;
      onHold();
    }, 480);
  };
  const end = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const click = () => {
    if (held.current) {
      held.current = false;
      return;
    }
    onTap();
  };

  return (
    <button
      className="row"
      onClick={click}
      onPointerDown={start}
      onPointerUp={end}
      onPointerLeave={end}
      onContextMenu={(e) => {
        e.preventDefault();
        onHold();
      }}
    >
      <span className={checkClass(missed, complete, logged)}>
        {missed ? <IconX /> : complete ? <IconCheck /> : null}
      </span>

      <span className="row-main">
        <span className={`row-name${missed ? ' missed' : complete ? ' done' : ''}`}>{habit.name}</span>
        {hint(habit, value, missed, logged) && (
          <span className="row-hint">{hint(habit, value, missed, logged)}</span>
        )}
      </span>

      <span className={`row-value${complete ? ' earned' : ''}`}>
        {complete ? habit.points : `${earned}/${habit.points}`}
      </span>
    </button>
  );
}

function checkClass(missed: boolean, complete: boolean, logged: boolean): string {
  if (missed) return 'check missed';
  if (complete) return 'check done';
  if (!logged) return 'check unlogged';
  return 'check partial';
}

function hint(habit: Habit, value: number | undefined, missed: boolean, logged: boolean) {
  if (missed) return 'written off for today';

  switch (habit.kind) {
    case 'quantity':
    case 'counter': {
      const amount = value ?? 0;
      return (
        <>
          <span className={amount >= (habit.target ?? 1) ? 'lit' : ''}>{trim(amount)}</span>
          {` / ${habit.target} ${habit.unit ?? ''}`}
        </>
      );
    }
    case 'session': {
      if (!logged) return 'tap to log your session';
      const level = habit.levels?.find((l) => l.fraction === value);
      return level?.label ?? `${Math.round((value ?? 0) * 100)}% session`;
    }
    default:
      return null;
  }
}

function trim(n: number): string {
  return String(Math.round(n * 10) / 10);
}
