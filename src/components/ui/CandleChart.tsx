import type { Candle } from '@/types';

interface CandleChartProps {
  candles: Candle[];
  width?: number;
  height?: number;
  className?: string;
}

/** Simple candlestick chart rendered with SVG. */
export function CandleChart({ candles, width = 320, height = 180, className = '' }: CandleChartProps) {
  if (candles.length < 2) {
    return <div className={`${className} grid place-items-center text-xs text-slate-600`} style={{ width, height }}>Sem dados</div>;
  }
  const pad = 6;
  const w = width;
  const h = height;
  const all = candles.flatMap((c) => [c.high, c.low]);
  const min = Math.min(...all);
  const max = Math.max(...all);
  const range = max - min || 1;
  const slot = (w - pad * 2) / candles.length;
  const bodyW = Math.max(2, slot * 0.6);
  const yOf = (v: number) => pad + (1 - (v - min) / range) * (h - pad * 2);

  return (
    <svg width={w} height={h} className={className} viewBox={`0 0 ${w} ${h}`}>
      {[0.25, 0.5, 0.75].map((f) => (
        <line key={f} x1={pad} x2={w - pad} y1={pad + f * (h - pad * 2)} y2={pad + f * (h - pad * 2)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
      ))}
      {candles.map((c, i) => {
        const cx = pad + slot * i + slot / 2;
        const isUp = c.close >= c.open;
        const color = isUp ? '#10b981' : '#ef4444';
        const yHigh = yOf(c.high);
        const yLow = yOf(c.low);
        const yOpen = yOf(c.open);
        const yClose = yOf(c.close);
        const top = Math.min(yOpen, yClose);
        const bodyH = Math.max(1, Math.abs(yClose - yOpen));
        return (
          <g key={i}>
            <line x1={cx} x2={cx} y1={yHigh} y2={yLow} stroke={color} strokeWidth="1" opacity="0.8" />
            <rect x={cx - bodyW / 2} y={top} width={bodyW} height={bodyH} fill={color} rx="1" />
          </g>
        );
      })}
    </svg>
  );
}
