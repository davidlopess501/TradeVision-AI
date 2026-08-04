interface ScoreGaugeProps {
  score: number; // 0..100
  size?: number;
  label?: string;
}

/** Circular gauge rendering a 0..100 score with a colored arc. */
export function ScoreGauge({ score, size = 132, label = 'Score' }: ScoreGaugeProps) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = c - (pct / 100) * c;

  const tone =
    pct >= 62 ? { ring: '#10b981', glow: 'rgba(16,185,129,0.35)' } : pct <= 38 ? { ring: '#ef4444', glow: 'rgba(239,68,68,0.35)' } : { ring: '#94a3b8', glow: 'rgba(148,163,184,0.3)' };

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={tone.ring}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.9s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 6px ${tone.glow})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-mono text-3xl font-bold tabular text-white">{pct}</span>
        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">{label}</span>
      </div>
    </div>
  );
}
