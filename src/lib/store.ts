import { useCallback, useEffect, useRef, useState } from 'react';
import type { AppState, DayLog } from '../types';
import { defaultState } from '../data/defaults';
import { EMPTY_DAY } from './scoring';

const KEY = 'habit-wheel/state/v1';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    return migrate(parsed);
  } catch {
    return defaultState();
  }
}

export function saveState(state: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked (private window). The session still works in memory.
  }
}

function migrate(state: Partial<AppState>): AppState {
  const base = defaultState();
  return {
    version: base.version,
    categories: state.categories?.length ? state.categories : base.categories,
    habits: state.habits?.length ? state.habits : base.habits,
    days: state.days ?? {},
    settings: { ...base.settings, ...(state.settings ?? {}) },
  };
}

export function useStore() {
  const [state, setState] = useState<AppState>(loadState);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    saveState(state);
  }, [state]);

  /** Edit a single day, creating it if it does not exist yet. */
  const updateDay = useCallback((date: string, fn: (day: DayLog) => DayLog) => {
    setState((s) => {
      const current = s.days[date] ?? EMPTY_DAY(date);
      return { ...s, days: { ...s.days, [date]: fn(current) } };
    });
  }, []);

  return { state, setState, updateDay };
}

export function exportJSON(state: AppState): string {
  return JSON.stringify(state, null, 2);
}

export function importJSON(raw: string): AppState {
  return migrate(JSON.parse(raw) as Partial<AppState>);
}
