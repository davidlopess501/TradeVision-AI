import type { Timeframe } from '@/types';
import { TIMEFRAMES } from '@/lib/assets';

interface TimeframeSelectorProps {
  timeframe: Timeframe;
  onChange: (
    timeframe: Timeframe,
  ) => void;
}

export function TimeframeSelector({
  timeframe,
  onChange,
}: TimeframeSelectorProps) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Timeframe
      </label>

      <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-white/[0.06] bg-ink-850/60 p-1.5">
        {TIMEFRAMES.map((item) => {
          const isActive =
            timeframe === item.value;

          return (
            <button
              key={item.value}
              type="button"
              onClick={() =>
                onChange(item.value)
              }
              className={`rounded-lg px-2 py-2.5 text-center text-xs font-bold transition-all ${
                isActive
                  ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/20'
                  : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
              }`}
            >
              {item.value}
            </button>
          );
        })}
      </div>
    </div>
  );
}