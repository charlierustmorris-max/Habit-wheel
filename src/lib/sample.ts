import type { AppState, DayLog } from '../types';
import { addDays } from './date';
import { newId } from './parse';
import { scheduledHabits } from './scoring';

/**
 * Fill the trailing `days` days with plausible history so the Week and Insights
 * screens have something to describe. Deliberately uneven: some habits are
 * near-automatic, others correlate with better days, sleep drifts.
 */
export function generateSample(state: AppState, endDate: string, days = 70): AppState {
  const rng = mulberry32(20260822);
  const filled: Record<string, DayLog> = { ...state.days };

  // Each habit gets a base rate, plus how strongly it tracks a good day.
  const profile = new Map<string, { base: number; pull: number }>();
  for (const habit of state.habits) {
    profile.set(habit.id, { base: 0.35 + rng() * 0.45, pull: rng() * 0.5 });
  }

  // Stops at the day before `endDate` — today is left for the user to log.
  for (let i = days; i >= 1; i--) {
    const date = addDays(endDate, -i);
    if (filled[date]) continue;

    // One latent "how the day went" factor everything leans on.
    const mood = clamp01(0.5 + (rng() - 0.5) * 0.9);
    const log: DayLog = { date, values: {}, missed: [], oneOffs: [] };

    for (const habit of scheduledHabits(state, date)) {
      const p = profile.get(habit.id)!;
      const chance = clamp01(p.base + (mood - 0.5) * p.pull * 2);
      const hit = rng() < chance;

      switch (habit.kind) {
        case 'binary':
          if (hit) log.values[habit.id] = 1;
          break;
        case 'session':
          if (hit) {
            const levels = habit.levels ?? [];
            const pick = levels[Math.min(levels.length - 1, Math.floor(rng() * rng() * levels.length))];
            log.values[habit.id] = pick ? pick.fraction : 1;
          }
          break;
        case 'quantity':
        case 'counter': {
          const target = habit.target ?? 1;
          const amount = hit ? target * (0.9 + rng() * 0.3) : target * (0.4 + rng() * 0.5);
          log.values[habit.id] = Math.round(amount * 10) / 10;
          break;
        }
      }
    }

    if (rng() < 0.4) {
      const chores = ['Called the orthodontist', 'Emailed coach', 'Fixed my desk lamp', 'Booked a court', 'Sent the form back'];
      log.oneOffs.push({ id: newId(), text: chores[Math.floor(rng() * chores.length)], done: rng() < 0.8 });
    }

    filled[date] = log;
  }

  return { ...state, days: filled };
}

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Small seeded PRNG so the sample history is the same every time. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
