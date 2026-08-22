import type { AppState, DayLog, Habit } from '../types';
import { getDay } from './scoring';

export type ParsedAction =
  | { kind: 'habit'; habitId: string; value: number; missed: boolean; label: string; detail: string; source: string }
  | { kind: 'oneoff'; text: string; done: boolean; label: string; detail: string; source: string }
  | { kind: 'clear-oneoffs'; label: string; detail: string; source: string };

const NEGATIONS = /\b(no|not|didn'?t|did not|dont|don'?t|skipped|skip|missed|miss|failed|forgot|never|zero|none|nope)\b/;
const PENDING = /\b(need to|needs to|have to|has to|todo|to-do|to do|remind me to|gotta|should|must|going to|will)\b/;
const CLEAR_ALL = /\b(i'?m there|im there|all done|done with (everything|it all|them all)|everything'?s? done|cleared? (the )?list|knocked (them|it) all out|all of them)\b/;

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7,
  eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12, half: 0.5, couple: 2, few: 3,
};

/** Keyword -> share of a session habit's points. */
const INTENSITY: Array<[RegExp, number]> = [
  [/\b(rest|off day|day off|nothing|skipped)\b/, 0],
  [/\b(recovery|mobility|rehab|shakeout|walk|stretch only)\b/, 0.25],
  [/\b(light|easy|technique|drills only|short and easy)\b/, 0.45],
  [/\b(short|quick|solid|decent|okay|ok|half)\b/, 0.7],
  [/\b(full|hard|long|big|crushed|great|pr|max)\b/, 1],
];

interface Clause {
  text: string;
  negated: boolean;
}

/** Split a spoken sentence into the individual things it claims. */
export function splitClauses(input: string): Clause[] {
  const cleaned = input
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned) return [];

  return cleaned
    .split(/\s*(?:,|;|\band\b|\bthen\b|\balso\b|\bplus\b|\.|\n)\s*/)
    .map((t) => t.trim())
    .filter((t) => t.length > 1)
    .filter((t) => !/^(i|and|then|also|today|yeah|ok|okay|um|uh|so)$/.test(t))
    .map((text) => ({ text, negated: NEGATIONS.test(text) }));
}

/** Pull the first quantity out of a clause, with its unit if it has one. */
export function extractQuantity(text: string): { amount: number; unit: string | null } | null {
  const numeric = text.match(
    /(\d+(?:\.\d+)?)\s*(hours?|hrs?|h\b|minutes?|mins?|m\b|glasses|glass|cups?|bottles?|liters?|l\b|oz|ounces?|pages?|reps?|sets?|miles?|km)?/,
  );
  if (numeric) return { amount: parseFloat(numeric[1]), unit: normaliseUnit(numeric[2]) };

  const worded = text.match(
    /\b(a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|half|couple|few)\s+(hours?|hrs?|minutes?|mins?|glasses|glass|cups?|bottles?|pages?|miles?)\b/,
  );
  if (worded) return { amount: NUMBER_WORDS[worded[1]], unit: normaliseUnit(worded[2]) };

  return null;
}

function normaliseUnit(raw: string | undefined): string | null {
  if (!raw) return null;
  const u = raw.trim();
  if (/^(hours?|hrs?|h)$/.test(u)) return 'hours';
  if (/^(minutes?|mins?|m)$/.test(u)) return 'minutes';
  if (/^(glasses|glass|cups?|bottles?|liters?|l)$/.test(u)) return 'glasses';
  return u;
}

/** Convert an amount spoken in one unit into the unit the habit is measured in. */
export function convertUnit(amount: number, from: string | null, to: string | undefined): number {
  if (!from || !to || from === to) return amount;
  if (from === 'minutes' && to === 'hours') return amount / 60;
  if (from === 'hours' && to === 'minutes') return amount * 60;
  return amount;
}

interface Match {
  habit: Habit;
  /** Length of the matched phrase — longer phrases beat shorter ones. */
  weight: number;
  at: number;
}

function matchHabit(text: string, habits: Habit[]): Habit | null {
  let best: Match | null = null;
  for (const habit of habits) {
    if (habit.archived) continue;
    const phrases = [habit.name.toLowerCase(), ...(habit.aliases ?? []).map((a) => a.toLowerCase())];
    for (const phrase of phrases) {
      if (phrase.length < 3) continue;
      const at = indexOfWord(text, phrase);
      if (at < 0) continue;
      if (!best || phrase.length > best.weight || (phrase.length === best.weight && at < best.at)) {
        best = { habit, weight: phrase.length, at };
      }
    }
  }
  return best?.habit ?? null;
}

function indexOfWord(haystack: string, needle: string): number {
  const re = new RegExp(`(^|[^a-z0-9])${escapeRe(needle)}([^a-z0-9]|$)`);
  const m = haystack.match(re);
  return m?.index != null ? m.index : -1;
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function sessionFraction(text: string, habit: Habit, negated: boolean): number {
  if (negated) return 0;
  let target = 1;
  for (const [re, fraction] of INTENSITY) {
    if (re.test(text)) {
      target = fraction;
      break;
    }
  }
  const levels = habit.levels;
  if (!levels || levels.length === 0) return target;
  return levels.reduce((a, b) =>
    Math.abs(b.fraction - target) < Math.abs(a.fraction - target) ? b : a,
  ).fraction;
}

/** Tidy a leftover clause into something that reads like a to-do. */
function toTaskText(text: string): string {
  const stripped = text
    .replace(/^(i|i've|ive|i have)\s+/, '')
    .replace(/^(just\s+)?(did|do|finished|completed|got|went|need to|have to|gotta|should|must|remind me to|going to|will)\s+/, '')
    .replace(/^(to|the)\s+/, '')
    .trim();
  const out = stripped.length > 1 ? stripped : text;
  return out.charAt(0).toUpperCase() + out.slice(1);
}

export function parseEntry(input: string, state: AppState, date: string): ParsedAction[] {
  const day: DayLog = getDay(state, date);
  const actions: ParsedAction[] = [];
  const seen = new Set<string>();

  if (CLEAR_ALL.test(input.toLowerCase()) && day.oneOffs.some((o) => !o.done)) {
    actions.push({
      kind: 'clear-oneoffs',
      label: 'Clear the to-do list',
      detail: `${day.oneOffs.filter((o) => !o.done).length} open`,
      source: input,
    });
  }

  for (const clause of splitClauses(input)) {
    if (CLEAR_ALL.test(clause.text)) continue;

    const habit = matchHabit(clause.text, state.habits);

    if (!habit) {
      const text = toTaskText(clause.text);
      if (text.length < 2) continue;
      const pending = PENDING.test(clause.text);
      actions.push({
        kind: 'oneoff',
        text,
        done: !pending,
        label: text,
        detail: pending ? 'to-do, not done yet' : 'one-off, done',
        source: clause.text,
      });
      continue;
    }

    if (seen.has(habit.id)) continue;
    seen.add(habit.id);

    const quantity = extractQuantity(clause.text);
    let value = 0;
    let detail = '';

    switch (habit.kind) {
      case 'binary':
        value = clause.negated ? 0 : 1;
        detail = clause.negated ? 'missed' : 'done';
        break;
      case 'session': {
        value = sessionFraction(clause.text, habit, clause.negated);
        const level = habit.levels?.find((l) => l.fraction === value);
        detail = clause.negated ? 'missed' : level?.label ?? `${Math.round(value * 100)}%`;
        break;
      }
      case 'quantity':
      case 'counter': {
        if (clause.negated) {
          value = 0;
          detail = 'missed';
        } else if (quantity) {
          value = round2(convertUnit(quantity.amount, quantity.unit, habit.unit));
          detail = `${value} ${habit.unit ?? ''}`.trim();
        } else {
          value = habit.target ?? 1;
          detail = `${value} ${habit.unit ?? ''}`.trim();
        }
        break;
      }
    }

    actions.push({
      kind: 'habit',
      habitId: habit.id,
      value,
      missed: clause.negated,
      label: habit.name,
      detail,
      source: clause.text,
    });
  }

  return actions;
}

/** Fold parsed actions into a day's log. Returns a new log. */
export function applyActions(day: DayLog, actions: ParsedAction[]): DayLog {
  const next: DayLog = {
    ...day,
    values: { ...day.values },
    missed: [...day.missed],
    oneOffs: day.oneOffs.map((o) => ({ ...o })),
  };

  for (const action of actions) {
    if (action.kind === 'habit') {
      next.values[action.habitId] = action.value;
      const already = next.missed.includes(action.habitId);
      if (action.missed && !already) next.missed.push(action.habitId);
      if (!action.missed && already) next.missed = next.missed.filter((id) => id !== action.habitId);
    } else if (action.kind === 'oneoff') {
      next.oneOffs.push({ id: newId(), text: action.text, done: action.done });
    } else {
      next.oneOffs = next.oneOffs.map((o) => ({ ...o, done: true }));
    }
  }

  return next;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
