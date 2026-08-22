import { gradeFor, gradeTone } from '../lib/scoring';

interface Props {
  score: number;
  /** Faint outer arc showing the best score still reachable today. */
  ceiling?: number;
  size?: number;
}

export function ScoreRing({ score, ceiling, size = 148 }: Props) {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const grade = gradeFor(score);
  const showCeiling = ceiling != null && ceiling < 100;

  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--track)" strokeWidth={stroke} fill="none" />
        {showCeiling && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--line)"
            strokeWidth={stroke}
            fill="none"
            strokeDasharray={`${(c * ceiling) / 100} ${c}`}
            strokeLinecap="round"
          />
        )}
        {score > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            stroke="var(--accent)"
            strokeWidth={stroke}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={`${(c * score) / 100} ${c}`}
            style={{ transition: 'stroke-dasharray 0.45s cubic-bezier(.4,1.2,.5,1)' }}
          />
        )}
      </svg>
      <div className="ring-label">
        <div className="ring-score">{score}</div>
        <div className={`ring-grade grade-${gradeTone(grade)}`}>{grade}</div>
      </div>
    </div>
  );
}
