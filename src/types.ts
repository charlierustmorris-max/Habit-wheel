export type HabitKind = 'binary' | 'quantity' | 'counter' | 'session';

/** One intensity option for a `session` habit. `fraction` is the share of the habit's points it banks. */
export interface SessionLevel {
  id: string;
  label: string;
  fraction: number;
}

export interface Habit {
  id: string;
  name: string;
  categoryId: string;
  kind: HabitKind;
  /** Weight. The day's ceiling is the sum of the points of everything scheduled that day. */
  points: number;
  /** `quantity` / `counter`: the amount that banks full points. */
  target?: number;
  unit?: string;
  /** `session`: the intensity options offered when you log it. */
  levels?: SessionLevel[];
  /** Days of the week this is scheduled, 0 = Sunday. Omitted means every day. */
  days?: number[];
  /** Extra words the voice/text parser should recognise for this habit. */
  aliases?: string[];
  archived?: boolean;
  order: number;
}

export interface Category {
  id: string;
  name: string;
  order: number;
}

/** An unweighted to-do. Tracked for completion, worth zero points. */
export interface OneOff {
  id: string;
  text: string;
  done: boolean;
}

export interface DayLog {
  /** Local calendar date, YYYY-MM-DD. */
  date: string;
  /**
   * Raw logged amounts by habit id:
   * `binary` 0 or 1, `quantity`/`counter` the amount, `session` the level fraction.
   */
  values: Record<string, number>;
  /** Habits explicitly written off for the day. These lower the day's ceiling. */
  missed: string[];
  oneOffs: OneOff[];
}

export interface Settings {
  /** Score a day must reach to extend the headline streak. */
  streakThreshold: number;
  /** Score a day must reach to count as "moved the needle". */
  needleThreshold: number;
  /** 0 = weeks start Sunday, 1 = Monday. */
  weekStart: 0 | 1;
}

export interface AppState {
  version: number;
  categories: Category[];
  habits: Habit[];
  days: Record<string, DayLog>;
  settings: Settings;
}
