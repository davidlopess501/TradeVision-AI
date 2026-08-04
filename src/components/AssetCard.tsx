import type { Asset, AnalysisResult } from '@/types';
import { ASSETS, formatPrice } from '@/lib/assets';
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react';
import { SignalBadge } from './ui/Badge';

interface AssetCardProps {
  asset: Asset;
  result: AnalysisResult | null;
  loading: boolean;
  onClick: () => void;
}

const TREND_ICON = {
  ALTA: TrendingUp,
  BAIXA: TrendingDown,
  LATERAL: Minus,
};

const TREND_TONE = {
  ALTA: 'text-bull-400',
  BAIXA: 'text-bear-400',
  LATERAL: 'text-wait-400',
};

export default function AssetCard({ asset, result, loading, onClick }: AssetCardProps) {
  const info = ASSETS[asset];
  const TrendIcon = result ? TREND_ICON[result.trend] : Minus;
  const trendTone = result ? TREND_TONE[result.trend] : 'text-slate-600';
  const signal = result?.finalSignal ?? 'WAIT';

  return (
    <button
      onClick={onClick}
      className="group relative w-full overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-850/70 p-4 text-left transition-all duration-200 hover:border-white/[0.12] hover:bg-ink-800/80 active:scale-[0.99]"
    >
      <div className="absolute inset-0 grid-noise opacity-30" />
      <div className="relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-sm font-extrabold text-accent-300">
              {asset}
            </span>
            <div>
              <div className="text-sm font-bold text-white">{info.code}</div>
              <div className="text-[11px] text-slate-500">{info.name}</div>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5" />
        </div>

        <div className="mt-3 flex items-end justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Preço</span>
            <div className="font-mono text-xl font-bold tabular text-white">
              {result ? formatPrice(asset, result.price) : '—'}
            </div>
          </div>
          {result ? (
            <span className={`flex items-center gap-1 text-xs font-bold ${result.changePct >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
              <TrendIcon className="h-3.5 w-3.5" strokeWidth={2.5} />
              {Math.abs(result.changePct).toFixed(2)}%
            </span>
          ) : null}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 border-t border-white/[0.06] pt-3">
          <Field label="Tendência" loading={loading} result={!!result}>
            {result ? (
              <span className={`flex items-center gap-1 text-xs font-bold ${trendTone}`}>
                <TrendIcon className="h-3.5 w-3.5" /> {result.trend}
              </span>
            ) : (
              <Placeholder />
            )}
          </Field>
          <Field label="Probabilidade" loading={loading} result={!!result}>
            {result ? <Value>{result.probability}%</Value> : <Placeholder />}
          </Field>
          <Field label="Entrada" loading={loading} result={!!result}>
            {result ? <Value>{formatPrice(asset, result.entry)}</Value> : <Placeholder />}
          </Field>
          <Field label="Stop" loading={loading} result={!!result}>
            {result ? <Value tone="bear">{formatPrice(asset, result.stop)}</Value> : <Placeholder />}
          </Field>
          <Field label="Alvo" loading={loading} result={!!result}>
            {result ? <Value tone="bull">{formatPrice(asset, result.target)}</Value> : <Placeholder />}
          </Field>
          <Field label="Status" loading={loading} result={!!result}>
            {result ? <SignalBadge signal={signal} /> : <Placeholder />}
          </Field>
        </div>
      </div>
    </button>
  );
}

function Field({
  label,
  children,
  loading,
  result,
}: {
  label: string;
  children: React.ReactNode;
  loading: boolean;
  result: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className="mt-0.5 min-h-[18px]">
        {loading && !result ? <span className="inline-block h-3.5 w-16 rounded shimmer-bg animate-shimmer" /> : children}
      </div>
    </div>
  );
}

function Value({ children, tone }: { children: React.ReactNode; tone?: 'bull' | 'bear' }) {
  return (
    <span
      className={`font-mono text-xs font-semibold tabular ${
        tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-slate-300'
      }`}
    >
      {children}
    </span>
  );
}

function Placeholder() {
  return <span className="text-xs font-medium text-slate-600">Aguardando análise</span>;
}
