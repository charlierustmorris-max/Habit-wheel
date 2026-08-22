import { describe, expect, it } from 'vitest';
import { defaultState } from '../../data/defaults';
import type { AppState, DayLog } from '../../types';
import { applyActions, convertUnit, extractQuantity, parseEntry, splitClauses } from '../parse';

const DATE = '2026-08-21';
const state: AppState = defaultState();

function parse(text: string, day?: Partial<DayLog>) {
  const s: AppState = day
    ? { ...state, days: { [DATE]: { date: DATE, values: {}, missed: [], oneOffs: [], ...day } } }
    : state;
  return parseEntry(text, s, DATE);
}

function habitAction(text: string, id: string) {
  const found = parse(text).find((a) => a.kind === 'habit' && a.habitId === id);
  return found?.kind === 'habit' ? found : undefined;
}

describe('splitClauses', () => {
  it('splits on commas and joining words', () => {
    expect(splitClauses('slept 7 hours, hit protein and stretched').map((c) => c.text)).toEqual([
      'slept 7 hours',
      'hit protein',
      'stretched',
    ]);
  });

  it('flags negated clauses', () => {
    const [clause] = splitClauses("didn't meditate");
    expect(clause.negated).toBe(true);
  });
});

describe('extractQuantity', () => {
  it('reads digits with a unit', () => {
    expect(extractQuantity('slept 7 hours')).toEqual({ amount: 7, unit: 'hours' });
    expect(extractQuantity('45 min of sat prep')).toEqual({ amount: 45, unit: 'minutes' });
  });

  it('reads spelled-out amounts', () => {
    expect(extractQuantity('drank eight glasses')).toEqual({ amount: 8, unit: 'glasses' });
  });

  it('returns null when there is no amount', () => {
    expect(extractQuantity('stretched')).toBeNull();
  });
});

describe('convertUnit', () => {
  it('converts minutes into hours and back', () => {
    expect(convertUnit(90, 'minutes', 'hours')).toBe(1.5);
    expect(convertUnit(2, 'hours', 'minutes')).toBe(120);
  });

  it('leaves matching or unknown units alone', () => {
    expect(convertUnit(6, 'glasses', 'glasses')).toBe(6);
    expect(convertUnit(6, null, 'glasses')).toBe(6);
  });
});

describe('parseEntry', () => {
  it('checks off a yes/no habit', () => {
    expect(habitAction('stretched', 'stretch')).toMatchObject({ value: 1, missed: false });
  });

  it('writes off a negated habit', () => {
    expect(habitAction("didn't meditate", 'meditate')).toMatchObject({ value: 0, missed: true });
  });

  it('reads an amount into a quantity habit', () => {
    expect(habitAction('slept 7 hours', 'sleep')).toMatchObject({ value: 7 });
  });

  it('converts units to what the habit is measured in', () => {
    expect(habitAction('slept 450 minutes', 'sleep')).toMatchObject({ value: 7.5 });
  });

  it('falls back to the target when an amount is implied but not given', () => {
    expect(habitAction('drank my water', 'water')).toMatchObject({ value: 8 });
  });

  it('picks the intensity for a session habit', () => {
    expect(habitAction('light workout', 'workout')).toMatchObject({ value: 0.45 });
    expect(habitAction('hard workout', 'workout')).toMatchObject({ value: 1 });
    expect(habitAction('recovery workout', 'workout')).toMatchObject({ value: 0.25 });
  });

  it('prefers the longer phrase when aliases overlap', () => {
    // "hit protein goal" must not be read as tennis just because of a shared word.
    const actions = parse('hit protein goal');
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({ kind: 'habit', habitId: 'protein' });
  });

  it('handles several things in one sentence', () => {
    const actions = parse('slept 7 hours, hit protein, 30 minutes of sat prep');
    expect(actions.filter((a) => a.kind === 'habit')).toHaveLength(3);
    expect(actions.find((a) => a.kind === 'habit' && a.habitId === 'sat')).toMatchObject({ value: 30 });
  });

  it('turns anything unrecognised into a completed one-off', () => {
    const actions = parse('called the orthodontist');
    expect(actions[0]).toMatchObject({ kind: 'oneoff', text: 'Called the orthodontist', done: true });
  });

  it('keeps a stated intention as an open to-do', () => {
    expect(parse('need to email my coach')[0]).toMatchObject({ kind: 'oneoff', done: false });
  });

  it('clears the open to-dos on "I\'m there"', () => {
    const actions = parse("I'm there", { oneOffs: [{ id: 'a', text: 'Email coach', done: false }] });
    expect(actions[0]).toMatchObject({ kind: 'clear-oneoffs' });
  });

  it('does not offer to clear when nothing is open', () => {
    const actions = parse("I'm there", { oneOffs: [{ id: 'a', text: 'Email coach', done: true }] });
    expect(actions.some((a) => a.kind === 'clear-oneoffs')).toBe(false);
  });

  it('logs each habit once even if it is mentioned twice', () => {
    const actions = parse('stretched, stretched again');
    expect(actions.filter((a) => a.kind === 'habit' && a.habitId === 'stretch')).toHaveLength(1);
  });

  it('returns nothing for empty input', () => {
    expect(parse('')).toEqual([]);
  });
});

describe('applyActions', () => {
  const empty: DayLog = { date: DATE, values: {}, missed: [], oneOffs: [] };

  it('writes habit values into the day', () => {
    const next = applyActions(empty, parse('slept 7 hours, stretched'));
    expect(next.values.sleep).toBe(7);
    expect(next.values.stretch).toBe(1);
  });

  it('records a write-off', () => {
    const next = applyActions(empty, parse("didn't meditate"));
    expect(next.missed).toContain('meditate');
  });

  it('un-writes-off a habit that is later logged', () => {
    const missed = applyActions(empty, parse("didn't meditate"));
    const fixed = applyActions(missed, parse('meditated'));
    expect(fixed.missed).not.toContain('meditate');
    expect(fixed.values.meditate).toBe(1);
  });

  it('appends one-offs without touching existing ones', () => {
    const start: DayLog = { ...empty, oneOffs: [{ id: 'a', text: 'Old', done: true }] };
    const next = applyActions(start, parse('took out the trash'));
    expect(next.oneOffs).toHaveLength(2);
    expect(next.oneOffs[0].text).toBe('Old');
  });

  it('does not mutate the day it was given', () => {
    const start: DayLog = { ...empty, values: { stretch: 1 } };
    applyActions(start, parse('slept 7 hours'));
    expect(start.values).toEqual({ stretch: 1 });
  });
});
