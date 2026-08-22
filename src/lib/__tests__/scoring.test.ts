import { describe, expect, it } from 'vitest';
import { defaultState } from '../../data/defaults';
import type { AppState } from '../../types';
import { earnedPoints, gradeFor, isComplete, scoreDay, scoreDayExcluding, streak } from '../scoring';

function stateWith(days: AppState['days']): AppState {
  return { ...defaultState(), days };
}

const habit = (id: string) => defaultState().habits.find((h) => h.id === id)!;

describe('earnedPoints', () => {
  it('gives all or nothing for yes/no habits', () => {
    expect(earnedPoints(habit('stretch'), 1)).toBe(6);
    expect(earnedPoints(habit('stretch'), 0)).toBe(0);
    expect(earnedPoints(habit('stretch'), undefined)).toBe(0);
  });

  it('gives partial credit against the target', () => {
    // Sleep is worth 10 at a target of 8 hours.
    expect(earnedPoints(habit('sleep'), 8)).toBe(10);
    expect(earnedPoints(habit('sleep'), 6)).toBe(7.5);
    expect(earnedPoints(habit('sleep'), 0)).toBe(0);
  });

  it('does not pay out beyond the target', () => {
    expect(earnedPoints(habit('sleep'), 12)).toBe(10);
    expect(earnedPoints(habit('water'), 20)).toBe(6);
  });

  it('scales a session by its intensity', () => {
    expect(earnedPoints(habit('workout'), 1)).toBe(16);
    expect(earnedPoints(habit('workout'), 0.45)).toBe(7.2);
  });
});

describe('isComplete', () => {
  it('only counts a habit once it is fully banked', () => {
    expect(isComplete(habit('sleep'), 8)).toBe(true);
    expect(isComplete(habit('sleep'), 7.9)).toBe(false);
    expect(isComplete(habit('stretch'), 1)).toBe(true);
  });
});

describe('scoreDay', () => {
  it('scores an empty day at zero but still counts what is available', () => {
    const s = scoreDay(stateWith({}), '2026-08-21');
    expect(s.score).toBe(0);
    expect(s.available).toBeGreaterThan(0);
    expect(s.hasData).toBe(false);
  });

  it('scores a full day at 100', () => {
    const state = defaultState();
    const values: Record<string, number> = {};
    for (const h of state.habits) values[h.id] = h.kind === 'binary' ? 1 : h.kind === 'session' ? 1 : h.target!;
    const s = scoreDay(stateWith({ '2026-08-21': { date: '2026-08-21', values, missed: [], oneOffs: [] } }), '2026-08-21');
    expect(s.score).toBe(100);
    expect(s.banked).toBe(s.available);
  });

  it('is the share of the day\'s points that were banked', () => {
    const day = { date: '2026-08-21', values: { stretch: 1, sleep: 8 }, missed: [], oneOffs: [] };
    const s = scoreDay(stateWith({ '2026-08-21': day }), '2026-08-21');
    expect(s.banked).toBe(16); // 6 + 10
    expect(s.score).toBe(Math.round((16 / s.available) * 100));
  });

  it('leaves the ceiling at 100 while everything is still reachable', () => {
    const day = { date: '2026-08-21', values: { sleep: 5 }, missed: [], oneOffs: [] };
    expect(scoreDay(stateWith({ '2026-08-21': day }), '2026-08-21').ceiling).toBe(100);
  });

  it('drops the ceiling by exactly what was written off', () => {
    const day = { date: '2026-08-21', values: {}, missed: ['workout'], oneOffs: [] };
    const s = scoreDay(stateWith({ '2026-08-21': day }), '2026-08-21');
    expect(s.lost).toBe(16);
    expect(s.ceiling).toBe(Math.round(((s.available - 16) / s.available) * 100));
    expect(s.ceiling).toBeLessThan(100);
  });

  it('splits points across categories', () => {
    const day = { date: '2026-08-21', values: { stretch: 1 }, missed: [], oneOffs: [] };
    const body = scoreDay(stateWith({ '2026-08-21': day }), '2026-08-21').byCategory.find(
      (c) => c.categoryId === 'body',
    )!;
    expect(body.banked).toBe(6);
    expect(body.available).toBe(44);
  });
});

describe('scoreDayExcluding', () => {
  it('removes the habit from both sides of the ratio', () => {
    const day = { date: '2026-08-21', values: { stretch: 1, journal: 1 }, missed: [], oneOffs: [] };
    const state = stateWith({ '2026-08-21': day });
    const full = scoreDay(state, '2026-08-21');
    const without = scoreDayExcluding(state, '2026-08-21', 'stretch')!;
    // Dropping a completed habit lowers the numerator by 6 and the denominator by 6.
    expect(without).toBe(Math.round(((full.banked - 6) / (full.available - 6)) * 100));
  });

  it('is unaffected by whether the excluded habit was done', () => {
    const base = { stretch: 1, journal: 1 };
    const a = stateWith({ '2026-08-21': { date: '2026-08-21', values: base, missed: [], oneOffs: [] } });
    const b = stateWith({ '2026-08-21': { date: '2026-08-21', values: { journal: 1 }, missed: [], oneOffs: [] } });
    expect(scoreDayExcluding(a, '2026-08-21', 'stretch')).toBe(scoreDayExcluding(b, '2026-08-21', 'stretch'));
  });
});

describe('gradeFor', () => {
  it('maps the score onto letters', () => {
    expect(gradeFor(100)).toBe('A');
    expect(gradeFor(90)).toBe('A');
    expect(gradeFor(80)).toBe('B');
    expect(gradeFor(70)).toBe('C');
    expect(gradeFor(64)).toBe('D');
    expect(gradeFor(59)).toBe('F');
  });
});

describe('streak', () => {
  const perfect = (date: string) => {
    const state = defaultState();
    const values: Record<string, number> = {};
    for (const h of state.habits) values[h.id] = h.kind === 'binary' ? 1 : h.kind === 'session' ? 1 : h.target!;
    return { date, values, missed: [], oneOffs: [] };
  };

  it('counts back from today', () => {
    const state = stateWith({
      '2026-08-19': perfect('2026-08-19'),
      '2026-08-20': perfect('2026-08-20'),
      '2026-08-21': perfect('2026-08-21'),
    });
    expect(streak(state, '2026-08-21', 80).current).toBe(3);
  });

  it('does not let an in-progress today break the streak', () => {
    const state = stateWith({
      '2026-08-19': perfect('2026-08-19'),
      '2026-08-20': perfect('2026-08-20'),
      // Nothing logged for the 21st yet.
    });
    expect(streak(state, '2026-08-21', 80).current).toBe(2);
  });

  it('breaks on a gap and keeps the best run', () => {
    const state = stateWith({
      '2026-08-17': perfect('2026-08-17'),
      '2026-08-18': perfect('2026-08-18'),
      '2026-08-19': { date: '2026-08-19', values: {}, missed: [], oneOffs: [] },
      '2026-08-20': perfect('2026-08-20'),
    });
    const s = streak(state, '2026-08-20', 80);
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });
});
