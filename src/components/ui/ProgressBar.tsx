interface ProgressBarProps {
  value: number; // 0..100
  className?: string;
  tone?: 'auto' | 'bull' | 'bear' | 'wait' | 'accent';
  height?: 'sm' | 'md';
}

export function ProgressBar({ value, className = '', tone = 'auto', height = 'md' }: ProgressBarProps) {
  const pct = Math.max(0, Math.min(100, value));
  const toneClass =
    tone === 'bull'
      ? 'bg-bull-500'
      : tone === 'bear'
        ? 'bg-bear-500'
        : tone === 'wait'
          ? 'bg-wait-500'
          : tone === 'accent'
            ? 'bg-accent-500'
            : pct >= 62
              ? 'bg-bull-500'
              : pct <= 38
                ? 'bg-bear-500'
                : 'bg-wait-500';
  return (
    <div className={`relative w-full overflow-hidden rounded-full bg-ink-800 ${height === 'sm' ? 'h-1.5' : 'h-2.5'} ${className}`}>
      <div
        className={`absolute inset-y-0 left-0 rounded-full ${toneClass} transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
