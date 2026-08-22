import type { AppState } from '../types';
import { dayInitial, todayKey, weekDays, addDays, startOfWeek } from '../lib/date';
import { averageScore } from '../lib/insights';
import { countPerfect, gradeFor, gradeTone, scoreDay, streak } from '../lib/scoring';

interface Props {
  state: AppState;
  date: string;
  onPickDay: (date: string) => void;
}

export function Week({ state, date, onPickDay }: Props) {
  const today = todayKey();
  const days = weekDays(date, state.settings.weekStart);
  const scores = days.map((d) => scoreDay(state, d));

  // Today is still in progress, so it shows as a bar but stays out of the average.
  const settled = days.filter((d) => d < today);
  const average = averageScore(state, settled);
  const grade = average === null ? null : gradeFor(average);

  const streak80 = streak(state, today, state.settings.streakThreshold);
  const needle = streak(state, today, state.settings.needleThreshold);
  const perfect = countPerfect(state, days);

  const isCurrentWeek = startOfWeek(today, state.settings.weekStart) === startOfWeek(date, state.settings.weekStart);
  const max = Math.max(100, ...scores.map((s) => s.score));

  return (
    <div className="screen">
      <div className="pad head-row">
        <h1 className="screen-title">{isCurrentWeek ? 'This week' : 'That week'}</h1>
        <div className="date-nav" style={{ paddingTop: 22 }}>
          <button onClick={() => onPickDay(addDays(date, -7))} aria-label="Previous week">
            ‹
          </button>
          <button onClick={() => onPickDay(addDays(date, 7))} disabled={isCurrentWeek} aria-label="Next week">
            ›
          </button>
        </div>
      </div>

      <div className="card split" style={{ marginBottom: 24 }}>
        <div>
          <div className="k">Week average</div>
          <div className="v">{average ?? '—'}</div>
          <div className="n">
            {grade ? (
              <>
                grade <span className={`grade-${gradeTone(grade)}`}>{grade}</span>
              </>
            ) : (
              'nothing logged yet'
            )}
          </div>
        </div>
        <div>
          <div className="k">Streak ({state.settings.streakThreshold}+)</div>
          <div className="v">{streak80.current}</div>
          <div className="n">
            needle {needle.current}d · best {streak80.best} · perfect {perfect}
          </div>
        </div>
      </div>

      <div className="bars">
        {scores.map((s) => {
          const height = s.hasData ? Math.max(3, (s.score / max) * 100) : 3;
          const isToday = s.date === today;
          return (
            <button className="bar-col" key={s.date} onClick={() => onPickDay(s.date)}>
              <span className={`bar-num${s.hasData ? '' : ' empty'}`}>{s.hasData ? s.score : '·'}</span>
              <span
                className={`bar${!s.hasData ? ' empty' : ''}${isToday ? ' today' : ''}${
                  s.score >= 100 ? ' perfect' : ''
                }`}
                style={{ height: `${height}%` }}
              />
              <span className={`bar-day${isToday ? ' now' : ''}`}>{dayInitial(s.date)}</span>
            </button>
          );
        })}
      </div>

      <section>
        <div className="section-head">
          <h2>Day by day</h2>
          <span className="meta">tap to open</span>
        </div>
        {scores.map((s) => (
          <button className="row" key={s.date} onClick={() => onPickDay(s.date)} disabled={s.date > today}>
            <span className="row-main">
              <span className="row-name">{longDay(s.date)}</span>
              <span className="row-hint">
                {s.hasData ? `${s.banked} of ${s.available} points banked` : 'nothing logged'}
              </span>
            </span>
            <span className={`row-value${s.score >= state.settings.streakThreshold ? ' earned' : ''}`}>
              {s.hasData ? s.score : '—'}
            </span>
          </button>
        ))}
      </section>
    </div>
  );
}

const NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function longDay(key: string): string {
  return NAMES[new Date(key + 'T00:00:00').getDay()];
}
