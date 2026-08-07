import type {
  BacktestResult,
} from '@/services/backtestEngine';

import {
  Activity,
  BarChart3,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';

import {
  formatMoney,
} from '@/lib/assets';

interface BacktestPanelProps {
  result: BacktestResult | null;
  loading: boolean;
  onRun: () => void | Promise<void>;
}

export function BacktestPanel({
  result,
  loading,
  onRun,
}: BacktestPanelProps) {
  return (
    <section className="card animate-fade-up p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-accent-400" />

          <div>
            <h3 className="text-sm font-bold text-white">
              Backtesting
            </h3>

            <p className="mt-0.5 text-[11px] text-slate-600">
              Teste histórico da estratégia
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() =>
            void onRun()
          }
          disabled={loading}
          className="rounded-lg bg-accent-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? 'Executando...'
            : 'Rodar teste'}
        </button>
      </div>

      {!result ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-ink-800/40 px-4 py-8 text-center">
          <Activity className="h-5 w-5 text-slate-600" />

          <p className="mt-2 text-xs font-semibold text-slate-400">
            Nenhum backtest executado
          </p>

          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
            Execute o teste para visualizar as métricas.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              label="Operações"
              value={`${result.totalTrades}`}
            />

            <MiniStat
              label="Taxa de acerto"
              value={`${result.winRate.toFixed(1)}%`}
            />

            <MiniStat
              label="Lucro líquido"
              value={formatMoney(
                result.netProfit,
              )}
              tone={
                result.netProfit >= 0
                  ? 'bull'
                  : 'bear'
              }
            />

            <MiniStat
              label="Capital final"
              value={formatMoney(
                result.finalCapital,
              )}
            />
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniStat
              label="Vitórias"
              value={`${result.winningTrades}`}
              tone="bull"
            />

            <MiniStat
              label="Derrotas"
              value={`${result.losingTrades}`}
              tone="bear"
            />

            <MiniStat
              label="Drawdown"
              value={`${result.maxDrawdown.toFixed(2)}%`}
              tone="bear"
            />

            <MiniStat
              label="Profit Factor"
              value={
                Number.isFinite(
                  result.profitFactor,
                )
                  ? result.profitFactor.toFixed(2)
                  : '∞'
              }
            />
          </div>

          <div className="mt-4 flex items-center gap-2 rounded-xl bg-ink-800/50 p-3">
            {result.netProfit >= 0 ? (
              <TrendingUp className="h-4 w-4 text-bull-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-bear-400" />
            )}

            <p className="text-xs text-slate-400">
              Resultado do teste histórico da estratégia atual.
            </p>
          </div>
        </>
      )}
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'bull' | 'bear';
}) {
  return (
    <div className="rounded-lg bg-ink-800/60 p-2.5 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div
        className={`mt-0.5 truncate font-mono text-xs font-bold ${
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