# Habit Wheel

A habit tracker that grades your day out of 100 instead of just ticking boxes.
Every habit carries a point weight, the day's score is the share of those points
you banked, and the app spends the rest of its time telling you which habits
actually move that number.

Mobile-first web app — React + TypeScript + Vite, no backend. Everything lives in
`localStorage` on the device. Add it to your iPhone home screen and it opens
full-screen like a native app.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # scoring + parser tests
npm run build
```

## The four tabs

**Today** — the score ring, what's banked out of what's available, and every
habit grouped by category. Tap a yes/no habit to check it off; tap anything else
to open its logger. Long-press any habit to write it off for the day.

**Week** — the week's average and streaks, a bar per day, and a day-by-day list.
Today shows as an outlined bar and stays *out* of the average, since it isn't
finished yet.

**Insights** — what moves the score, a twelve-week heatmap, and a completion rate
per category.

**Manage** — add, edit, reweight, reschedule, and archive habits and categories,
change the scoring thresholds, and export/restore your data as JSON.

Days before you start using it stay empty on purpose — nothing is backfilled or
invented. The heatmap shows them as blank cells, the week average ignores them,
and streaks simply start when you do. If you want to fill a past day in yourself,
the arrows on Today walk back through the calendar.

## The middle button

The mic button parses a sentence into a day's log. Say or type it however it
comes out:

> "slept 7 hours, hit protein, light workout, 45 minutes of SAT prep, called the
> orthodontist, didn't meditate"

That single line sets Sleep to 7 hours, checks Hit protein goal, logs Workout at
its *Light / technique* intensity, sets SAT prep to 45 minutes, writes off
Meditated, and files "Called the orthodontist" as a one-off to-do.

It handles:

- **Amounts and units** — `450 minutes` on an hours-based habit becomes 7.5 hours.
- **Implied targets** — "drank my water" with no number banks the full target.
- **Intensity** — `light`, `hard`, `recovery`, `rest` pick a session level.
- **Negation** — "didn't meditate", "skipped tennis" write the habit off.
- **Leftovers** — anything that doesn't match a habit becomes an unweighted
  one-off to-do, done by default. Phrase it as an intention ("need to email my
  coach") and it stays open instead.
- **"I'm there"** — clears every open one-off at once.

Nothing is applied until you confirm it: the sheet previews each parsed action
with a checkbox so you can drop the ones it got wrong. Voice uses the browser's
speech recognition where available (Safari and Chrome); everywhere else you type.

Habits carry an `aliases` list that feeds the matcher, editable in Manage — add
"gym, lifted, erg" to Workout and it'll recognise those too. When two habits both
match, the longer matched phrase wins, which is why "hit protein goal" reads as
protein rather than tennis.

## How scoring works

Each habit has a point weight. A day's **available** points are the weights of
everything scheduled that day; **banked** is what you earned; the **score** is
`banked / available × 100`.

| Kind | Logged as | Banks |
| --- | --- | --- |
| Yes / no | a tap | all of it or none |
| Amount | hours, minutes, pages | pro rata up to the target |
| Count | a tally | pro rata up to the target |
| Session | an intensity level | that level's share |

Partial credit is real credit: sleeping 7 of 8 hours on a 10-point habit banks
8.8. Overshooting the target never banks more than the weight.

**Ceiling** is the best score still reachable today. It sits at 100 until you
write something off — a written-off habit removes its points from what's still
possible, so the ceiling tells you what's actually left rather than pretending
the day is still perfect.

**Grades** are A 90+, B 80+, C 70+, D 60+, F below. **Streak** counts consecutive
days at 80 or better; **needle** is the softer streak at 50 or better, for days
that still moved something. A day in progress that hasn't reached the threshold
yet doesn't break either streak — only a finished day does. A **perfect day** is
100.

Both thresholds are editable in Manage.

## What moves the score

The Insights list compares the average score on days you completed a habit
against days you didn't — but it removes that habit from both sides of the ratio
first. Completing a 16-point workout trivially raises a raw score by 16 points,
which would make every habit look positive. Scoring the *rest* of the day instead
answers the question worth asking: when you get this one, how does everything
else tend to go?

So `+15` next to "Days with Hit protein goal" means the rest of your day averages
15 points higher when protein lands — not that protein is worth 15 points.

A habit needs at least three days on each side before it appears, so the list
stays empty until there's enough history to say anything.

## Layout

```
src/
  types.ts              habits, categories, day logs
  data/defaults.ts      the starting habit set
  lib/
    scoring.ts          points, scores, ceiling, streaks
    parse.ts            the natural-language logger
    insights.ts         movers, heatmap, category rates
    store.ts            localStorage + the app state hook
    date.ts             local calendar-day helpers
  components/           ring, tab bar, rows, sheets
  screens/              Today, Week, Insights, Manage
```

The scoring engine and the parser are pure functions over plain data with no
React in sight, which is what the tests in `src/lib/__tests__` cover.
