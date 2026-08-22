# Habit Wheel

Personal daily habit tracker. Phone-first, installable PWA, local-first — no
server, no login, no backend. All data lives in `localStorage` on the device.

Rendered through the **Nothing** design system: monochrome canvas, Swiss
typographic hierarchy, instrument-panel labels, colour reserved for meaning.

## Files

```
index.html               the whole app — markup, styles, logic
manifest.webmanifest     PWA install metadata
sw.js                    offline shell (precaches everything, fonts included)
icon.svg  icon-*.png     app icons (any + maskable)
fonts/                   Doto, Space Grotesk, Space Mono — latin subset, 61KB
Dockerfile  Caddyfile    static server for Railway / any container host
railway.json             pins Railway to the Dockerfile builder
```

There is no build step and no dependencies. The app is static files.

## Deploy

Any host must serve this over **HTTPS** — a service worker will not register
otherwise, so without it the app neither installs nor works offline. Railway
and Netlify both give you HTTPS automatically.

### Railway

Railway has no static-file default, so the `Dockerfile` here runs Caddy in
front of the folder. New Project → Deploy from GitHub repo → pick this repo
and branch. Railway reads `railway.json`, builds the Dockerfile, and binds
Caddy to the `PORT` it injects. Nothing to configure; no environment
variables needed.

Then **Settings → Networking → Generate Domain** to get the HTTPS URL.

The Caddy config also does two things that matter for a PWA:

- `index.html`, `sw.js` and the manifest are sent `Cache-Control: no-cache`,
  so a deploy actually reaches browsers. Cached without revalidation, a
  service worker can pin someone to an old build indefinitely.
- `.webmanifest` gets `application/manifest+json`, which Go's MIME table
  does not know about and which some browsers require before installing.

### Netlify

Drag the folder onto Netlify, or connect the repo. The `Dockerfile` and
`Caddyfile` are ignored — Netlify serves static files directly.

### Locally

```sh
python3 -m http.server 8899        # then open http://localhost:8899
```

Service workers are permitted on `localhost` without HTTPS, so install and
offline behaviour can be tested there.

## Screens

**Today** — the day's score in a gauge ring, a coaching line, four stats, then
habits grouped by category. `‹ ›` steps back through past days to log
retroactively. Tasks sit at the bottom, marked *no points*.

**Week** — seven bars against the qualifying threshold, the week average, and
the previous four weeks.

**Insights** — what moves the score (real correlations, computed once six days
are logged), a twelve-week dot heatmap, and a thirty-day category breakdown.

**Manage** — every habit fully editable, plus threshold, theme, export/import.

**Capture** (mic, centre of the tab bar) — talk or type a brain dump. It splits
on "and then", strips filler, tags times and days, and drops the results into
Tasks after a review step.

## Scoring

| Type | Scoring |
|---|---|
| `binary` | all or nothing |
| `graded` | `min(actual / target, 1) × points` |
| `tally` | `completed / total × points` |

Day score is `banked / possible` normalised to 0–100. A qualifying day is 80+
(configurable). **Streak** counts consecutive qualifying days; **Needle** counts
consecutive days scored above the day before. **Ceiling** is the best score
still reachable — it drops as habits pass their "locks at" hour.

Locking affects the ceiling only. Input stays open on every date, so
retroactive logging always works.

A habit with **0 points** is a metric: tracked and available to the correlation
engine, but outside the score. It renders in its own *Metrics* group.

## Data model

```ts
habits    { id, name, category, type, points, target, unit, locksAt, order, archived }
entries   { id, habitId, date: 'YYYY-MM-DD', value }
tasks     { id, text, done, due?, createdAt }   // unscored, never reset daily
settings  { qualifyingThreshold, theme }
```

Dates are **local** `YYYY-MM-DD` strings, never UTC timestamps — a habit checked
at 11pm lands on that day. Entries are created lazily; no row means "not done".
Tasks live in a separate array that the scoring path never reads, so they cannot
touch the score by construction.

Export before clearing browser storage.

## The three issues from the context doc

**1. The grade was punishing.** Letter grades are gone everywhere. The score
shows as a number with a trend arrow against yesterday. The gauge arc itself
stays neutral — colour only ever encodes *direction of travel*, never judgment.
On Insights, positive effects are neutral too; red is reserved for habits
actually costing points.

**2. Too many points seeded.** Rebalanced from 146 points to **78** across
twelve load-bearing habits. A genuinely good day now lands in the 80s; an
ordinary decent day lands in the 70s.

**3. Sleep was dragging everything.** Reseeded as a **0-point metric**. It is
still logged every day and still feeds the correlation engine — it just no
longer costs 12 points when it goes badly.

## Floor

One-handed on a phone. Every control is a 36px+ target. Visible keyboard focus.
`prefers-reduced-motion` respected. Dark by default, light mode built to equal
rigour for sunlight (15:1+ contrast on body text). Works fully offline from a
cold start. Tabular figures throughout so numbers do not jitter.

Motion budget: check-off fill, ring sweep on load, number count-up. Nothing else.
