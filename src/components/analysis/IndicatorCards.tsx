import type { AnalysisResult } from '@/types';
import { META_BY_KEY, signalLabel } from '@/lib/indicators';
import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDot,
  RefreshCw,
} from 'lucide-react';

interface IndicatorCardsProps {
  result: AnalysisResult;
  loading: boolean;
  onRefresh: () => void;
}

export function IndicatorCards({
  result,
  loading,
  onRefresh,
}: IndicatorCardsProps) {
  return (
    <section className="animate-fade-up">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Indicadores Técnicos
        </h3>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1 text-[11px] font-semibold text-accent-400 hover:text-accent-300 disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3 w-3 ${
              loading ? 'animate-spin-slow' : ''
            }`}
          />
          Atualizar
        </button>
      </div>

      <div className="grid gap-2.5">
        {result.indicators.map((indicator, index) => {
          const meta = META_BY_KEY[indicator.key];

          const config =
            indicator.signal === 'BUY'
              ? {
                  text: 'text-bull-400',
                  bg: 'bg-bull-500/10',
                  ring: 'ring-bull-500/30',
                  dot: 'bg-bull-500',
                  Icon: ArrowUpCircle,
                }
              : indicator.signal === 'SELL'
                ? {
                    text: 'text-bear-400',
                    bg: 'bg-bear-500/10',
                    ring: 'ring-bear-500/30',
                    dot: 'bg-bear-500',
                    Icon: ArrowDownCircle,
                  }
                : {
                    text: 'text-wait-400',
                    bg: 'bg-wait-500/10',
                    ring: 'ring-wait-500/20',
                    dot: 'bg-wait-500',
                    Icon: CircleDot,
                  };

          const bias = indicator.strength - 50;

          return (
            <div
              key={indicator.key}
              className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850/70 p-3.5 transition-all hover:border-white/[0.12]"
              style={{
                animation: 'fade-up 0.4s both',
                animationDelay: `${index * 50}ms`,
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-800 text-[10px] font-bold text-slate-400">
                    {meta.abbr}
                  </span>

                  <div className="min-w-0">
                    <div className="truncate text-sm font-bold text-white">
                      {meta.label}
                    </div>

                    <div className="truncate text-[10px] text-slate-500">
                      {meta.description}
                    </div>
                  </div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-semibold tabular text-slate-200">
                    {indicator.value}
                  </div>
                </div>
              </div>

              <div className="mt-3 flex items-center gap-3">
                <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                  <div className="absolute inset-y-0 left-1/2 w-px bg-white/15" />

                  <div
                    className={`absolute inset-y-0 rounded-full transition-all duration-500 ${
                      bias >= 0 ? 'bg-bull-500' : 'bg-bear-500'
                    }`}
                    style={{
                      width: `${Math.abs(bias) * 2}%`,
                      left: bias >= 0 ? '50%' : undefined,
                      right: bias < 0 ? '50%' : undefined,
                    }}
                  />
                </div>

                <div
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ${config.bg} ${config.ring}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
                  />

                  <config.Icon
                    className={`h-3.5 w-3.5 ${config.text}`}
                    strokeWidth={2.5}
                  />

                  <span
                    className={`text-[11px] font-bold ${config.text}`}
                  >
                    {signalLabel(indicator.signal)}
                  </span>
                </div>
              </div>

              <p className="mt-2 truncate text-[11px] text-slate-500">
                {indicator.detail}
              </p>
            </div>
          );
        })}
      </div>
    </section>
  );
}