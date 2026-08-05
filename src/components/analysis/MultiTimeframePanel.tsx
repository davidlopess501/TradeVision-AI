import type {
  MultiTimeframeAnalysis,
} from '@/lib/multiTimeframe';

import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDot,
  RefreshCw,
} from 'lucide-react';

interface MultiTimeframePanelProps {
  analysis: MultiTimeframeAnalysis | null;
  loading: boolean;
  error?: string | null;
  onRefresh: () => void;
}

export function MultiTimeframePanel({
  analysis,
  loading,
  error,
  onRefresh,
}: MultiTimeframePanelProps) {
  const finalConfig =
    analysis?.finalSignal === 'BUY'
      ? {
          text: 'text-bull-400',
          bg: 'bg-bull-500/10',
          ring: 'ring-bull-500/30',
          Icon: ArrowUpCircle,
        }
      : analysis?.finalSignal === 'SELL'
        ? {
            text: 'text-bear-400',
            bg: 'bg-bear-500/10',
            ring: 'ring-bear-500/30',
            Icon: ArrowDownCircle,
          }
        : {
            text: 'text-wait-400',
            bg: 'bg-wait-500/10',
            ring: 'ring-wait-500/20',
            Icon: CircleDot,
          };

  return (
    <section className="card animate-fade-up p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white">
            Multi TimeFrame
          </h3>

          <p className="mt-0.5 text-[11px] text-slate-600">
            Confluência entre 1m, 5m, 15m e 60m
          </p>
        </div>

        <button
          type="button"
          onClick={onRefresh}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2.5 py-2 text-[11px] font-semibold text-accent-400 transition-colors hover:bg-white/[0.06] disabled:opacity-50"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              loading ? 'animate-spin-slow' : ''
            }`}
          />
          Atualizar
        </button>
      </div>

      {error ? (
        <div className="rounded-lg border border-bear-500/30 bg-bear-500/10 p-3 text-xs text-bear-300">
          {error}
        </div>
      ) : loading && !analysis ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin-slow" />
          Analisando timeframes...
        </div>
      ) : analysis ? (
        <>
          <div className="space-y-2">
            {analysis.analyses.map((item) => {
              const config =
                item.signal === 'BUY'
                  ? {
                      text: 'text-bull-400',
                      bg: 'bg-bull-500/10',
                      label: 'COMPRA',
                    }
                  : item.signal === 'SELL'
                    ? {
                        text: 'text-bear-400',
                        bg: 'bg-bear-500/10',
                        label: 'VENDA',
                      }
                    : {
                        text: 'text-wait-400',
                        bg: 'bg-wait-500/10',
                        label: 'NEUTRO',
                      };

              return (
                <div
                  key={item.timeframe}
                  className="grid grid-cols-[56px_1fr_70px] items-center gap-3 rounded-lg bg-ink-800/60 px-3 py-2.5"
                >
                  <span className="font-mono text-xs font-bold text-slate-300">
                    {item.timeframe}
                  </span>

                  <div>
                    <div
                      className={`inline-flex rounded-full px-2 py-1 text-[10px] font-bold ${config.bg} ${config.text}`}
                    >
                      {config.label}
                    </div>

                    <div className="mt-1 text-[10px] text-slate-600">
                      Score {item.score} · {item.trend}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-xs font-bold text-white">
                      {item.confidence}%
                    </div>

                    <div className="text-[9px] uppercase tracking-wider text-slate-600">
                      confiança
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <MiniStat
              label="Alinhamento"
              value={`${analysis.alignment}%`}
            />

            <MiniStat
              label="Score médio"
              value={`${analysis.averageScore}`}
            />

            <MiniStat
              label="Confiança"
              value={`${analysis.averageConfidence}%`}
            />
          </div>

          <div
            className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${finalConfig.bg} ${finalConfig.ring}`}
          >
            <div className="flex items-center gap-2">
              <finalConfig.Icon
                className={`h-5 w-5 ${finalConfig.text}`}
              />

              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  Sinal consolidado
                </div>

                <div className={`text-sm font-extrabold ${finalConfig.text}`}>
                  {analysis.finalLabel}
                </div>
              </div>
            </div>

            <span className="font-mono text-sm font-bold text-white">
              {analysis.alignment}%
            </span>
          </div>
        </>
      ) : null}
    </section>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-ink-800/60 p-2.5 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div className="mt-0.5 font-mono text-xs font-bold tabular text-slate-200">
        {value}
      </div>
    </div>
  );
}
