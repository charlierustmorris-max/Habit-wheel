import { useState } from 'react';
import type { AppState, Habit, HabitKind } from '../types';
import { ONE_OFF_CATEGORY } from '../data/defaults';
import { newId } from '../lib/parse';
import { exportJSON, importJSON } from '../lib/store';
import { Sheet } from '../components/Sheet';
import { IconPlus } from '../components/Icons';

interface Props {
  state: AppState;
  setState: (fn: (s: AppState) => AppState) => void;
}

const KINDS: Array<{ id: HabitKind; label: string; blurb: string }> = [
  { id: 'binary', label: 'Yes / no', blurb: 'Done or not. All the points or none.' },
  { id: 'quantity', label: 'Amount', blurb: 'Hours, minutes, pages. Partial credit up to the target.' },
  { id: 'counter', label: 'Count', blurb: 'Tally toward a target, like glasses of water.' },
  { id: 'session', label: 'Session', blurb: 'Log an intensity, from full effort down to rest.' },
];

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function Manage({ state, setState }: Props) {
  const [editing, setEditing] = useState<Habit | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState<string | null>(null);

  const categories = [...state.categories].sort((a, b) => a.order - b.order);

  const saveHabit = (habit: Habit) => {
    setState((s) => {
      const exists = s.habits.some((h) => h.id === habit.id);
      return {
        ...s,
        habits: exists ? s.habits.map((h) => (h.id === habit.id ? habit : h)) : [...s.habits, habit],
      };
    });
    setEditing(null);
  };

  const deleteHabit = (id: string) => {
    setState((s) => ({ ...s, habits: s.habits.filter((h) => h.id !== id) }));
    setEditing(null);
  };

  const addHabit = (categoryId: string) => {
    const order = Math.max(0, ...state.habits.map((h) => h.order)) + 1;
    setEditing({ id: newId(), name: '', categoryId, kind: 'binary', points: 8, order });
  };

  const addCategory = () => {
    const name = prompt('New category name');
    if (!name?.trim()) return;
    setState((s) => ({
      ...s,
      categories: [
        ...s.categories,
        { id: newId(), name: name.trim(), order: Math.max(0, ...s.categories.map((c) => c.order)) + 1 },
      ],
    }));
  };

  const renameCategory = (id: string) => {
    const current = state.categories.find((c) => c.id === id);
    const name = prompt('Category name', current?.name ?? '');
    if (!name?.trim()) return;
    setState((s) => ({
      ...s,
      categories: s.categories.map((c) => (c.id === id ? { ...c, name: name.trim() } : c)),
    }));
  };

  const totalPoints = state.habits
    .filter((h) => !h.archived && h.categoryId !== ONE_OFF_CATEGORY)
    .reduce((sum, h) => sum + h.points, 0);

  return (
    <div className="screen">
      <div className="pad">
        <h1 className="screen-title">Manage</h1>
        <div className="screen-sub">{totalPoints} points on a full day</div>
      </div>

      {categories.map((category) => {
        const items = state.habits
          .filter((h) => h.categoryId === category.id)
          .sort((a, b) => a.order - b.order);
        if (category.id === ONE_OFF_CATEGORY && items.length === 0) return null;
        return (
          <section key={category.id}>
            <div className="section-head">
              <h2>
                <button onClick={() => renameCategory(category.id)}>{category.name}</button>
              </h2>
              <span className="meta">
                {items.filter((h) => !h.archived).reduce((s, h) => s + h.points, 0)} pts
              </span>
            </div>
            {items.map((habit) => (
              <button
                className={`manage-habit${habit.archived ? ' archived' : ''}`}
                key={habit.id}
                onClick={() => setEditing(habit)}
              >
                <span className="name">{habit.name}</span>
                <span className="pts">
                  {habit.kind === 'binary' ? '' : `${kindShort(habit)} · `}
                  {habit.points}
                </span>
              </button>
            ))}
            {category.id !== ONE_OFF_CATEGORY && (
              <button className="manage-habit" onClick={() => addHabit(category.id)}>
                <span style={{ color: 'var(--accent)', display: 'grid', placeItems: 'center' }}>
                  <IconPlus />
                </span>
                <span className="name" style={{ color: 'var(--accent)' }}>
                  Add habit
                </span>
              </button>
            )}
          </section>
        );
      })}

      <section>
        <div className="section-head">
          <h2>Scoring</h2>
        </div>
        <div className="pad" style={{ paddingTop: 18 }}>
          <div className="field">
            <label>Streak threshold — a day counts once it reaches this score</label>
            <input
              type="number"
              value={state.settings.streakThreshold}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  settings: { ...s.settings, streakThreshold: clampInt(e.target.value, 0, 100) },
                }))
              }
            />
          </div>
          <div className="field">
            <label>Needle threshold — the softer streak, for days that still moved something</label>
            <input
              type="number"
              value={state.settings.needleThreshold}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  settings: { ...s.settings, needleThreshold: clampInt(e.target.value, 0, 100) },
                }))
              }
            />
          </div>
          <div className="field">
            <label>Week starts on</label>
            <select
              value={state.settings.weekStart}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  settings: { ...s.settings, weekStart: Number(e.target.value) === 1 ? 1 : 0 },
                }))
              }
            >
              <option value={0}>Sunday</option>
              <option value={1}>Monday</option>
            </select>
          </div>
        </div>
      </section>

      <section>
        <div className="section-head">
          <h2>Data</h2>
        </div>
        <div className="pad" style={{ paddingTop: 18, display: 'grid', gap: 10 }}>
          <button
            className="btn"
            onClick={() => {
              void navigator.clipboard?.writeText(exportJSON(state));
              setNote('Copied your data to the clipboard as JSON.');
            }}
          >
            Copy my data as JSON
          </button>
          <button className="btn" onClick={() => setImportOpen(true)}>
            Restore from JSON
          </button>
          <button
            className="btn danger"
            onClick={() => {
              if (confirm('Delete every logged day? Your habits stay.')) {
                setState((s) => ({ ...s, days: {} }));
                setNote('Cleared all logged days.');
              }
            }}
          >
            Clear all logged days
          </button>
          {note && <p className="lede" style={{ margin: 0 }}>{note}</p>}
        </div>
      </section>

      {editing && (
        <HabitEditor
          habit={editing}
          state={state}
          onSave={saveHabit}
          onDelete={deleteHabit}
          onClose={() => setEditing(null)}
        />
      )}

      {importOpen && (
        <Sheet onClose={() => setImportOpen(false)}>
          <h3>Restore from JSON</h3>
          <p className="lede">This replaces everything currently on this device.</p>
          <textarea rows={8} value={raw} onChange={(e) => setRaw(e.target.value)} style={{ resize: 'none' }} />
          <div className="sheet-actions">
            <button className="btn" onClick={() => setImportOpen(false)}>
              Cancel
            </button>
            <button
              className="btn primary"
              onClick={() => {
                try {
                  const next = importJSON(raw);
                  setState(() => next);
                  setImportOpen(false);
                  setRaw('');
                  setNote('Restored.');
                } catch {
                  setNote("That didn't parse as Habit Wheel JSON.");
                }
              }}
            >
              Restore
            </button>
          </div>
        </Sheet>
      )}

      <div className="pad" style={{ marginTop: 26 }}>
        <button className="btn" onClick={addCategory}>
          Add category
        </button>
      </div>
    </div>
  );
}

function kindShort(habit: Habit): string {
  if (habit.kind === 'session') return 'session';
  if (habit.target) return `${habit.target} ${habit.unit ?? ''}`.trim();
  return habit.kind;
}

function clampInt(raw: string, lo: number, hi: number): number {
  const n = Math.round(Number(raw));
  if (Number.isNaN(n)) return lo;
  return Math.min(hi, Math.max(lo, n));
}

/* ---------------- habit editor ---------------- */

interface EditorProps {
  habit: Habit;
  state: AppState;
  onSave: (h: Habit) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

function HabitEditor({ habit, state, onSave, onDelete, onClose }: EditorProps) {
  const [draft, setDraft] = useState<Habit>({ ...habit });
  const set = <K extends keyof Habit>(key: K, value: Habit[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const toggleDay = (d: number) => {
    const days = draft.days ?? [0, 1, 2, 3, 4, 5, 6];
    const next = days.includes(d) ? days.filter((x) => x !== d) : [...days, d].sort();
    set('days', next.length === 7 ? undefined : next);
  };
  const active = draft.days ?? [0, 1, 2, 3, 4, 5, 6];

  const needsTarget = draft.kind === 'quantity' || draft.kind === 'counter';

  return (
    <Sheet onClose={onClose}>
      <h3>{habit.name || 'New habit'}</h3>

      <div className="field">
        <label>Name</label>
        <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Cold plunge" />
      </div>

      <div className="field field-row">
        <div style={{ flex: 2 }}>
          <label>Category</label>
          <select value={draft.categoryId} onChange={(e) => set('categoryId', e.target.value)}>
            {state.categories
              .filter((c) => c.id !== ONE_OFF_CATEGORY)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </div>
        <div style={{ flex: 1 }}>
          <label>Points</label>
          <input
            type="number"
            value={draft.points}
            onChange={(e) => set('points', Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
      </div>

      <div className="field">
        <label>How it's logged</label>
        <select value={draft.kind} onChange={(e) => set('kind', e.target.value as HabitKind)}>
          {KINDS.map((k) => (
            <option key={k.id} value={k.id}>
              {k.label}
            </option>
          ))}
        </select>
        <p className="lede" style={{ margin: '8px 0 0', fontSize: 14 }}>
          {KINDS.find((k) => k.id === draft.kind)?.blurb}
        </p>
      </div>

      {needsTarget && (
        <div className="field field-row">
          <div style={{ flex: 1 }}>
            <label>Target</label>
            <input
              type="number"
              value={draft.target ?? 1}
              onChange={(e) => set('target', Math.max(0.1, Number(e.target.value) || 1))}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>Unit</label>
            <input
              value={draft.unit ?? ''}
              onChange={(e) => set('unit', e.target.value)}
              placeholder="hours, minutes, glasses"
            />
          </div>
        </div>
      )}

      <div className="field">
        <label>Scheduled on</label>
        <div className="daypick">
          {DAY_LABELS.map((label, i) => (
            <button key={i} className={active.includes(i) ? 'on' : ''} onClick={() => toggleDay(i)}>
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Also call it (helps the voice parser)</label>
        <input
          value={(draft.aliases ?? []).join(', ')}
          onChange={(e) =>
            set(
              'aliases',
              e.target.value
                .split(',')
                .map((s) => s.trim().toLowerCase())
                .filter(Boolean),
            )
          }
          placeholder="gym, lifted, trained"
        />
      </div>

      <div className="sheet-actions">
        <button className="btn" onClick={() => set('archived', !draft.archived)}>
          {draft.archived ? 'Unarchive' : 'Archive'}
        </button>
        <button className="btn primary" disabled={!draft.name.trim()} onClick={() => onSave(draft)}>
          Save
        </button>
      </div>
      <div className="sheet-actions">
        <button
          className="btn danger"
          onClick={() => {
            if (confirm(`Delete "${draft.name}" and its history from the score?`)) onDelete(draft.id);
          }}
        >
          Delete habit
        </button>
      </div>
    </Sheet>
  );
}
