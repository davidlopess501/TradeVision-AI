interface FibonacciPanelProps {
  direction: 'BULLISH' | 'BEARISH';
  nearestLevel: string;
  nearestPrice: string;
  amplitude: string;
}

export function FibonacciPanel({
  direction,
  nearestLevel,
  nearestPrice,
  amplitude,
}: FibonacciPanelProps) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          Fibonacci
        </h3>

        <span
          className={`rounded-full px-2 py-1 text-xs font-bold ${
            direction === 'BULLISH'
              ? 'bg-bull-500/20 text-bull-400'
              : 'bg-bear-500/20 text-bear-400'
          }`}
        >
          {direction === 'BULLISH'
            ? 'ALTA'
            : 'BAIXA'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <MiniCard
          title="Nível"
          value={nearestLevel}
        />

        <MiniCard
          title="Preço"
          value={nearestPrice}
        />

        <MiniCard
          title="Amplitude"
          value={amplitude}
        />
      </div>
    </section>
  );
}

function MiniCard({
  title,
  value,
}: {
  title: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-ink-800/60 p-3 text-center">
      <div className="text-[10px] uppercase tracking-wider text-slate-500">
        {title}
      </div>

      <div className="mt-1 font-mono text-sm font-bold text-white">
        {value}
      </div>
    </div>
  );
}