import type { AppState, Category, Habit, SessionLevel } from '../types';

export const ONE_OFF_CATEGORY = 'one-off';

const trainingLevels: SessionLevel[] = [
  { id: 'full', label: 'Full session', fraction: 1 },
  { id: 'solid', label: 'Solid but short', fraction: 0.7 },
  { id: 'light', label: 'Light / technique', fraction: 0.45 },
  { id: 'recovery', label: 'Recovery only', fraction: 0.25 },
  { id: 'none', label: "Didn't happen", fraction: 0 },
];

export const defaultCategories: Category[] = [
  { id: 'body', name: 'Body', order: 0 },
  { id: 'nutrition', name: 'Nutrition', order: 1 },
  { id: 'mind', name: 'Mind', order: 2 },
  { id: 'learning', name: 'Learning', order: 3 },
  { id: ONE_OFF_CATEGORY, name: 'One-off', order: 4 },
];

export const defaultHabits: Habit[] = [
  // Body
  {
    id: 'workout', name: 'Workout', categoryId: 'body', kind: 'session', points: 16,
    levels: trainingLevels, order: 0,
    aliases: ['lifted', 'lift', 'gym', 'trained', 'training', 'run', 'ran', 'cardio', 'erg'],
  },
  {
    id: 'tennis', name: 'Tennis', categoryId: 'body', kind: 'session', points: 12,
    levels: trainingLevels, order: 1,
    aliases: ['court', 'match', 'rally', 'drills', 'hitting', 'groundstrokes'],
  },
  {
    id: 'stretch', name: 'Stretched', categoryId: 'body', kind: 'binary', points: 6, order: 2,
    aliases: ['stretch', 'stretching', 'mobility', 'foam roll', 'foam rolled', 'yoga'],
  },
  {
    id: 'sleep', name: 'Sleep', categoryId: 'body', kind: 'quantity', points: 10,
    target: 8, unit: 'hours', order: 3,
    aliases: ['slept', 'sleeping', 'bedtime'],
  },

  // Nutrition
  {
    id: 'eat-clean', name: 'Ate clean', categoryId: 'nutrition', kind: 'binary', points: 8, order: 4,
    aliases: ['ate clean', 'eating clean', 'clean eating', 'whole foods'],
  },
  {
    id: 'calories', name: 'Hit calorie goal', categoryId: 'nutrition', kind: 'binary', points: 8, order: 5,
    aliases: ['calories', 'calorie', 'kcal', 'cals', 'ate enough'],
  },
  {
    id: 'protein', name: 'Hit protein goal', categoryId: 'nutrition', kind: 'binary', points: 8, order: 6,
    aliases: ['protein', 'macros'],
  },
  {
    id: 'water', name: 'Drank water', categoryId: 'nutrition', kind: 'counter', points: 6,
    target: 8, unit: 'glasses', order: 7,
    aliases: ['water', 'hydrated', 'hydration', 'drank', 'glasses'],
  },

  // Mind
  {
    id: 'journal', name: 'Journaled', categoryId: 'mind', kind: 'binary', points: 8, order: 8,
    aliases: ['journal', 'journaling', 'wrote', 'writing', 'diary'],
  },
  {
    id: 'meditate', name: 'Meditated', categoryId: 'mind', kind: 'binary', points: 8, order: 9,
    aliases: ['meditation', 'meditate', 'breathwork', 'breathing', 'mindfulness'],
  },

  // Learning
  {
    id: 'schoolwork', name: 'Finished all schoolwork', categoryId: 'learning', kind: 'binary', points: 14, order: 10,
    aliases: ['schoolwork', 'homework', 'hw', 'assignments', 'school work'],
  },
  {
    id: 'sat', name: 'SAT prep', categoryId: 'learning', kind: 'quantity', points: 10,
    target: 30, unit: 'minutes', order: 11,
    aliases: ['sat', 'sat prep', 'test prep', 'practice test'],
  },
  {
    id: 'membean', name: 'Membean', categoryId: 'learning', kind: 'binary', points: 8, order: 12,
    aliases: ['vocab', 'vocabulary', 'membean'],
  },
  {
    id: 'learned', name: 'Learned something new', categoryId: 'learning', kind: 'binary', points: 8, order: 13,
    aliases: ['learned', 'learn', 'read', 'reading', 'studied', 'course'],
  },
];

export const defaultState = (): AppState => ({
  version: 1,
  categories: defaultCategories.map((c) => ({ ...c })),
  habits: defaultHabits.map((h) => ({ ...h })),
  days: {},
  settings: { streakThreshold: 80, needleThreshold: 50, weekStart: 0 },
});
