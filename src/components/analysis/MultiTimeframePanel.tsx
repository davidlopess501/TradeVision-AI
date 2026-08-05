interface TimeframeSignal {
  timeframe: string;
  signal: 'BUY' | 'SELL' | 'WAIT';
  confidence: number;
}

interface MultiTimeframePanelProps {
  alignment: number;
  signals: TimeframeSignal[];
}

export function MultiTimeframePanel({
  alignment,
  signals,
}: MultiTimeframePanelProps) {
  return (
    <section className="card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-white">
          Multi TimeFrame
        </h3>

        <span className="text-xs font-bold text-accent-400">
          {alignment}% alinhado
        </span>
      </div>

      <div className="space-y-2">
        {signals.map((item) => (
          <div
            key={item.timeframe}
            className="flex items-center justify-between rounded-lg bg-ink-800/60 px-3 py-2"
          >
            <span className="font-semibold text-slate-300">
              {item.timeframe}
            </span>

            <span
              className={`font-bold ${
                item.signal === 'BUY'
                  ? 'text-bull-400'
                  : item.signal === 'SELL'
                  ? 'text-bear-400'
                  : 'text-wait-400'
              }`}
            >
              {item.signal === 'BUY'
                ? 'COMPRA'
                : item.signal === 'SELL'
                ? 'VENDA'
                : 'NEUTRO'}
            </span>

            <span className="font-mono text-white">
              {item.confidence}%
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}