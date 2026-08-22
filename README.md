# Habit Wheel

Personal daily habit tracker. Phone-first, installable PWA, local-first — no
server, no login, no backend, no analytics. Everything lives in `localStorage`
on the device.

This is v1's logic re-rendered in a **Nothing-inspired design language**: pure
black ground, exposed hairline grid, dot-matrix numerals, one red accent, and
monospaced uppercase micro-type.

---

## Deploy

Drag this folder onto Netlify. That's it — there is no build step.

```
index.html                 the whole app (markup, styles, logic)
manifest.webmanifest       PWA install metadata
sw.js                      offline shell cache
icon-*.png                 app icons (any + maskable)
_headers                   Netlify cache rules
```

Bump `CACHE` in `sw.js` on every deploy so returning devices pick up the new
shell instead of serving the old one from cache.

---

## The design language

| | |
|---|---|
| Ground | `#000` pure black, `#fff` pure white — legible in direct sun |
| Accent | `#d71921`, one colour, used only for **live / active / direction of travel** |
| Structure | 1px hairlines and a visible 25% column grid — the layout is shown, not hidden |
| Numerals | 5×7 dot matrix, rendered from a bitmap in `GLYPH` — the off-dots stay faintly visible, the way a real dot-matrix panel reads |
| Ring | 60 dots on a circle rather than a solid stroke, with the leading dot in accent |
| Type | System monospace, uppercase, wide tracking, tabular figures so numbers never jitter |

**Motion budget** — check-off fill, ring sweep on load, number count-up. Nothing
else. All three are gated behind `prefers-reduced-motion`.

**Floor** — one-handed on a phone (every control ≥ 44px), visible keyboard focus
(2px accent ring), no horizontal scroll at 360px, works offline, dark by default
with a light mode in Manage.

---

## Screens

- **Today** — score ring, trend, four stats (Banked / Ceiling / Streak / Needle),
  one coaching line, habits grouped by category, `‹ ›` to log past days, and
  Tasks at the bottom marked *no points*.
- **Week** — 7 bars with the qualifying line drawn across them at its true
  height, week average, last 4 weeks.
- **Insights** — what moves the score (real correlations), 12-week heatmap,
  30-day category breakdown.
- **Manage** — every habit fully editable, qualifying threshold, theme,
  export / import, clear finished tasks.
- **Capture** — talk or type a brain dump. Splits on "and then", strips filler
  ("um, remind me to…"), tags times and days, drops the results into Tasks.
  **Tasks never touch the score.** That separation is the whole feature.

---

## Scoring

| Type | Scoring |
|---|---|
| `binary` | All or nothing |
| `graded` | `min(actual / target, 1) × points` |
| `tally` | `completed / total × points` |
| `metric` | **Tracked and correlated, worth zero points** |

- Day score = banked / total possible, normalised 0–100
- Qualifying day = 80+ (editable)
- Streak = consecutive qualifying days
- Needle = consecutive days scored above the day before
- Ceiling = best score still reachable, recalculated as habits pass their
  "locks at" hour

Out of scope by design: streak freezes, multipliers, badges, levels.

---

## The three open issues, and what was done

**1. The grade was punishing.** A red D on a 60 every morning is the feedback
that makes someone stop opening the app. Letter grades are gone entirely — from
Today and from Week. What's left is the number, plus a trend arrow against the
last logged day. Colour now encodes *direction of travel only*: accent for up,
dim for down, never red-for-bad. The same rule governs the correlation list,
where the sign also carries a ▲/▼ glyph so colour is never the only channel.

The coaching line states the gap and the path and nothing else:

> `40 to go. Even pace takes it.`
> `Ceiling is 71. Line's out of reach — bank the rest.`
> `Line cleared. 15 still open.`

No praise, no scolding, on any branch.

**2. Too many points seeded.** 146 points across five categories meant an
ordinary good day scored 60. The seed is now **11 scored habits totalling
exactly 100 points**, so the score *is* the percentage and a full day is 100.
Balance check — both tennis blocks, workout, ate clean, water 3 of 4L, protein
3/3, 2 of 3 school blocks, Membean, journal, lights out, but no mobility:
**88**. An ordinary good day lands in the 80s, which is what the line is for.

**3. Sleep was dragging everything.** Sleep is no longer a scored habit. It is
a `metric`: logged, displayed on Today with a dashed marker and a "metric ·
unscored" tag, and still ranked in *What moves the score* — so its correlation
stays visible while it can no longer cost points. What's scored instead is the
behaviour that's actually controllable at 9:30pm: **Lights out 9:30**, 8 points,
binary. The `metric` type is available to any habit in Manage, for anything
worth watching without being graded on it.

---

## Data

```ts
habits   { id, name, category, type, points, target, unit, locksAt, order, archived }
entries  { id, habitId, date: 'YYYY-MM-DD', value }
tasks    { id, text, done, due?, dueLabel?, createdAt }   // unscored, never reset daily
settings { qualifyingThreshold, theme }
```

Dates are **local** `YYYY-MM-DD` strings, never UTC timestamps — a habit checked
at 11pm lands on that day. Entries are created lazily: no row means "not done",
and setting a value back to zero deletes the row.

All data is on the device. **Export before clearing browser storage or switching
phones** — Manage → Export writes a `.json` you can import back.
