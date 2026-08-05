import type {
  Asset,
  AnalysisResult,
} from '@/types';

import {
  ArrowDownCircle,
  ArrowUpCircle,
  CircleDot,
  Cpu,
  Sparkles,
} from 'lucide-react';

import {
  formatDateTime,
  formatPrice,
} from '@/lib/assets';

interface SignalPanelProps {
  asset: Asset;
  result: AnalysisResult;
  onGoToAI: (asset: Asset) => void;
  onGoToEngine: (asset: Asset) => void;
}

export function SignalPanel({
  asset,
  result,
  onGoToAI,
  onGoToEngine,
}: SignalPanelProps) {
  const signalConfig =
    result.finalSignal === 'BUY'
      ? {
          label: 'COMPRA',
          text: 'text-bull-400',
          bg: 'from-bull-500/20 to-bull-600/5',
          ring: 'ring-bull-500/40',
          Icon: ArrowUpCircle,
        }
      : result.finalSignal === 'SELL'
        ? {
            label: 'VENDA',
            text: 'text-bear-400',
            bg: 'from-bear-500/20 to-bear-600/5',
            ring: 'ring-bear-500/40',
            Icon: ArrowDownCircle,
          }
        : {
            label: 'AGUARDAR',
            text: 'text-wait-400',
            bg: 'from-wait-500/15 to-wait-600/5',
            ring: 'ring-wait-500/30',
            Icon: CircleDot,
          };

  return (
    <section className="animate-fade-up">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Sinal Final
      </h3>

      <div
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${signalConfig.bg} p-5 ring-1 ${signalConfig.ring}`}
      >
        <div className="absolute inset-0 grid-noise opacity-30" />

        <div className="relative flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <signalConfig.Icon
              className={`h-10 w-10 ${signalConfig.text}`}
              strokeWidth={2}
            />

            <div>
              <div
                className={`text-2xl font-extrabold tracking-tight ${signalConfig.text}`}
              >
                {signalConfig.label}
              </div>

              <div className="text-[11px] text-slate-400">
                Score {result.score} · Confiança{' '}
                {result.confidence}% · {result.timeframe}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-2">
            <button
              type="button"
              onClick={() => onGoToAI(asset)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
            >
              <Sparkles className="h-3.5 w-3.5 text-accent-400" />
              Ver IA
            </button>

            <button
              type="button"
              onClick={() => onGoToEngine(asset)}
              className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
            >
              <Cpu className="h-3.5 w-3.5 text-accent-400" />
              Engine
            </button>
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        <LevelCard
          label="Entrada"
          value={formatPrice(
            asset,
            result.entry,
          )}
        />

        <LevelCard
          label="Stop"
          value={formatPrice(
            asset,
            result.stop,
          )}
          tone="bear"
        />

        <LevelCard
          label="Alvo"
          value={formatPrice(
            asset,
            result.target,
          )}
          tone="bull"
        />
      </div>

      <p className="mt-2 text-center text-[11px] text-slate-600 tabular">
        Atualizado em{' '}
        {formatDateTime(result.createdAt)} · Dados simulados
      </p>
    </section>
  );
}

function LevelCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'bull' | 'bear';
}) {
  return (
    <div className="card p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-sm font-bold tabular ${
          tone === 'bull'
            ? 'text-bull-400'
            : tone === 'bear'
              ? 'text-bear-400'
              : 'text-slate-200'
        }`}
      >
        {value}
      </div>
    </div>
  );
}