import type { AppState, Habit } from '../types';
import { addDays, startOfWeek } from './date';
import { ONE_OFF_CATEGORY } from '../data/defaults';
import { getDay, isComplete, isScheduled, scoreDay, scoreDayExcluding, round1 } from './scoring';

export interface Mover {
  habit: Habit;
  label: string;
  /** Average rest-of-day score on days this habit was completed. */
  withAvg: number;
  /** Average rest-of-day score on the days it was not. */
  withoutAvg: number;
  lift: number;
  days: number;
}

/**
 * What each habit is worth to the rest of the day.
 *
 * Both sides of the comparison use the day's score with this habit taken out of
 * the ratio, so a habit is not credited with the points it banks itself — what
 * is left is how the day tends to go around it.
 */
export function movers(state: AppState, dates: string[], minPerSide = 3): Mover[] {
  const out: Mover[] = [];

  for (const habit of state.habits) {
    if (habit.archived || habit.categoryId === ONE_OFF_CATEGORY) continue;

    const withScores: number[] = [];
    const withoutScores: number[] = [];

    for (const date of dates) {
      if (!isScheduled(habit, date)) continue;
      const day = getDay(state, date);
      const hasData = Object.keys(day.values).length > 0 || day.missed.length > 0;
      if (!hasData) continue;

      const rest = scoreDayExcluding(state, date, habit.id);
      if (rest === null) continue;

      if (isComplete(habit, day.values[habit.id])) withScores.push(rest);
      else withoutScores.push(rest);
    }

    if (withScores.length < minPerSide || withoutScores.length < minPerSide) continue;

    const withAvg = mean(withScores);
    const withoutAvg = mean(withoutScores);
    out.push({
      habit,
      label: moverLabel(habit),
      withAvg: Math.round(withAvg),
      withoutAvg: Math.round(withoutAvg),
      lift: Math.round(withAvg - withoutAvg),
      days: withScores.length + withoutScores.length,
    });
  }

  return out.sort((a, b) => Math.abs(b.lift) - Math.abs(a.lift));
}

function moverLabel(habit: Habit): string {
  if ((habit.kind === 'quantity' || habit.kind === 'counter') && habit.target) {
    return `${habit.name} at ${habit.target}+ ${habit.unit ?? ''}`.trim();
  }
  if (habit.kind === 'session') return `Full "${habit.name}" sessions`;
  return `Days with "${habit.name}"`;
}

export interface CategoryRate {
  categoryId: string;
  name: string;
  /** 0..1 */
  rate: number;
}

/** Share of each category's available points that were actually banked over the window. */
export function categoryRates(state: AppState, dates: string[]): CategoryRate[] {
  const banked = new Map<string, number>();
  const available = new Map<string, number>();
  let oneOffDone = 0;
  let oneOffTotal = 0;

  for (const date of dates) {
    const score = scoreDay(state, date);
    if (!score.hasData) continue;
    for (const c of score.byCategory) {
      banked.set(c.categoryId, (banked.get(c.categoryId) ?? 0) + c.banked);
      available.set(c.categoryId, (available.get(c.categoryId) ?? 0) + c.available);
    }
    for (const o of getDay(state, date).oneOffs) {
      oneOffTotal++;
      if (o.done) oneOffDone++;
    }
  }

  const rates: CategoryRate[] = [];
  for (const category of [...state.categories].sort((a, b) => a.order - b.order)) {
    if (category.id === ONE_OFF_CATEGORY) {
      if (oneOffTotal > 0) {
        rates.push({ categoryId: category.id, name: category.name, rate: oneOffDone / oneOffTotal });
      }
      continue;
    }
    const total = available.get(category.id) ?? 0;
    if (total <= 0) continue;
    rates.push({ categoryId: category.id, name: category.name, rate: (banked.get(category.id) ?? 0) / total });
  }

  return rates.sort((a, b) => b.rate - a.rate);
}

export interface HeatCell {
  date: string;
  score: number;
  hasData: boolean;
}

/** `weeks` columns of 7 days, oldest week first, each column running weekStart..+6. */
export function heatmap(state: AppState, end: string, weeks: number): HeatCell[][] {
  const thisWeek = startOfWeek(end, state.settings.weekStart);
  const columns: HeatCell[][] = [];

  for (let w = weeks - 1; w >= 0; w--) {
    const weekStart = addDays(thisWeek, -7 * w);
    const column: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(weekStart, d);
      const score = scoreDay(state, date);
      column.push({ date, score: score.score, hasData: score.hasData && date <= end });
    }
    columns.push(column);
  }

  return columns;
}

/** Average score across the days in `dates` that actually have data. */
export function averageScore(state: AppState, dates: string[]): number | null {
  const scores = dates.map((d) => scoreDay(state, d)).filter((s) => s.hasData).map((s) => s.score);
  if (scores.length === 0) return null;
  return Math.round(mean(scores));
}

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return round1(values.reduce((a, b) => a + b, 0) / values.length);
}
