import type { AppState, DayLog, Habit } from '../types';
import { dayOfWeek } from './date';

export const EMPTY_DAY = (date: string): DayLog => ({ date, values: {}, missed: [], oneOffs: [] });

export function getDay(state: AppState, date: string): DayLog {
  return state.days[date] ?? EMPTY_DAY(date);
}

export function isScheduled(h: Habit, date: string): boolean {
  if (h.archived) return false;
  if (!h.days || h.days.length === 0) return true;
  return h.days.includes(dayOfWeek(date));
}

export function scheduledHabits(state: AppState, date: string): Habit[] {
  return state.habits.filter((h) => isScheduled(h, date)).sort((a, b) => a.order - b.order);
}

/** Share of a habit's points banked by `value`, clamped to 0..1. */
export function earnedFraction(h: Habit, value: number | undefined): number {
  if (value == null || Number.isNaN(value)) return 0;
  switch (h.kind) {
    case 'binary':
      return value > 0 ? 1 : 0;
    case 'session':
      return clamp01(value);
    case 'quantity':
    case 'counter': {
      const target = h.target && h.target > 0 ? h.target : 1;
      return clamp01(value / target);
    }
  }
}

export function earnedPoints(h: Habit, value: number | undefined): number {
  return round1(earnedFraction(h, value) * h.points);
}

/** Whether the habit was touched at all today (drives the dashed vs solid checkbox). */
export function isLogged(day: DayLog, h: Habit): boolean {
  return h.id in day.values || day.missed.includes(h.id);
}

/** Whether the habit is fully banked. Partial credit does not count as complete. */
export function isComplete(h: Habit, value: number | undefined): boolean {
  return earnedFraction(h, value) >= 0.999;
}

export interface CategoryScore {
  categoryId: string;
  banked: number;
  available: number;
}

export interface DayScore {
  date: string;
  /** Points banked so far. */
  banked: number;
  /** Points on the table today. */
  available: number;
  /** 0..100. */
  score: number;
  /** Highest score still reachable today, given what has been written off. */
  ceiling: number;
  /** Points written off via `missed`. */
  lost: number;
  byCategory: CategoryScore[];
  hasData: boolean;
}

export function scoreDay(state: AppState, date: string): DayScore {
  const day = getDay(state, date);
  const habits = scheduledHabits(state, date);

  let banked = 0;
  let available = 0;
  let lost = 0;
  const cats = new Map<string, CategoryScore>();

  for (const h of habits) {
    const earned = earnedPoints(h, day.values[h.id]);
    const missed = day.missed.includes(h.id);
    banked += earned;
    available += h.points;
    if (missed) lost += h.points - earned;

    const c = cats.get(h.categoryId) ?? { categoryId: h.categoryId, banked: 0, available: 0 };
    c.banked += earned;
    c.available += h.points;
    cats.set(h.categoryId, c);
  }

  banked = round1(banked);
  const score = available > 0 ? clampScore((banked / available) * 100) : 0;
  const ceiling = available > 0 ? clampScore(((available - lost) / available) * 100) : 0;
  const hasData = Object.keys(day.values).length > 0 || day.missed.length > 0 || day.oneOffs.length > 0;

  return {
    date,
    banked,
    available: round1(available),
    score,
    ceiling,
    lost: round1(lost),
    byCategory: [...cats.values()],
    hasData,
  };
}

/**
 * The day's score with one habit removed from both sides of the ratio.
 * Insights compare this rather than the raw score, so a habit is not
 * credited with the points it banks itself.
 */
export function scoreDayExcluding(state: AppState, date: string, habitId: string): number | null {
  const day = getDay(state, date);
  const habits = scheduledHabits(state, date).filter((h) => h.id !== habitId);
  if (habits.length === 0) return null;
  let banked = 0;
  let available = 0;
  for (const h of habits) {
    banked += earnedPoints(h, day.values[h.id]);
    available += h.points;
  }
  if (available <= 0) return null;
  return clampScore((banked / available) * 100);
}

export type Grade = 'A' | 'B' | 'C' | 'D' | 'F';

export function gradeFor(score: number): Grade {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}

export function gradeTone(grade: Grade): 'good' | 'ok' | 'bad' {
  if (grade === 'A' || grade === 'B') return 'good';
  if (grade === 'C') return 'ok';
  return 'bad';
}

export interface StreakInfo {
  current: number;
  best: number;
}

/**
 * Consecutive days at or above `threshold`, counting back from `today`.
 * Today only breaks the streak once it is over — an in-progress day that has
 * not reached the threshold yet is skipped rather than counted as a miss.
 */
export function streak(state: AppState, today: string, threshold: number): StreakInfo {
  const keys = Object.keys(state.days).sort();
  const scored = new Map<string, number>();
  for (const k of keys) scored.set(k, scoreDay(state, k).score);

  let current = 0;
  let cursor = today;
  if ((scored.get(today) ?? 0) < threshold) cursor = prev(today);
  while ((scored.get(cursor) ?? 0) >= threshold) {
    current++;
    cursor = prev(cursor);
  }

  let best = 0;
  let run = 0;
  let expected: string | null = null;
  for (const k of keys) {
    if (expected !== null && k !== expected) run = 0;
    run = (scored.get(k) ?? 0) >= threshold ? run + 1 : 0;
    best = Math.max(best, run);
    expected = next(k);
  }
  return { current, best: Math.max(best, current) };
}

export function countPerfect(state: AppState, dates: string[]): number {
  return dates.filter((d) => scoreDay(state, d).score >= 100).length;
}

function prev(key: string): string {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}
function next(key: string): string {
  const d = new Date(key + 'T00:00:00');
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
function clampScore(n: number): number {
  return Math.round(Math.min(100, Math.max(0, n)));
}
export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
