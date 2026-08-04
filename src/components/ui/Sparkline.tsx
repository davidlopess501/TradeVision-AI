interface SparklineProps {
  points: { x: number; y: number }[];
  width?: number;
  height?: number;
  positive?: boolean;
  className?: string;
}

/** Lightweight equity/curve sparkline rendered as an SVG path. */
export function Sparkline({ points, width = 120, height = 40, positive, className = '' }: SparklineProps) {
  if (points.length < 2) {
    return <div className={`${className}`} style={{ width, height }} />;
  }
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const rangeX = maxX - minX || 1;
  const rangeY = maxY - minY || 1;
  const pad = 3;
  const w = width;
  const h = height;
  const coords = points.map((p) => {
    const x = pad + ((p.x - minX) / rangeX) * (w - pad * 2);
    const y = h - pad - ((p.y - minY) / rangeY) * (h - pad * 2);
    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });
  const isPos = positive ?? points[points.length - 1].y >= points[0].y;
  const color = isPos ? '#10b981' : '#ef4444';
  const id = `sg-${Math.random().toString(36).slice(2, 8)}`;
  const areaPath = `M ${coords[0]} L ${coords.join(' L ')} L ${(w - pad).toFixed(2)},${(h - pad).toFixed(2)} L ${pad},${(h - pad).toFixed(2)} Z`;
  const linePath = `M ${coords.join(' L ')}`;

  return (
    <svg width={w} height={h} className={className} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#${id})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
