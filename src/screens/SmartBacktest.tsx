import { useEffect, useRef, useState } from 'react';
import type { Asset, BacktestPeriod, BacktestResult } from '@/types';
import { ASSET_LIST, formatMoney, formatPrice, formatDateTime } from '@/lib/assets';
import { runBacktest, periodToDays, PERIOD_LABELS } from '@/lib/simulation';
import { Sparkline } from '@/components/ui/Sparkline';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Play, TrendingUp, DollarSign, Target, Activity, TrendingDown, Scale, Gauge, RefreshCw } from 'lucide-react';

const PERIODS: { value: BacktestPeriod; label: string }[] = [
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: '1y', label: '1 ano' },
  { value: 'custom', label: 'Personalizado' },
];

const ASSET_ICON: Record<Asset, typeof TrendingUp> = { WIN: TrendingUp, WDO: DollarSign };

type Phase = 'idle' | 'running' | 'done';

export default function SmartBacktest() {
  const [asset, setAsset] = useState<Asset>('WIN');
  const [period, setPeriod] = useState<BacktestPeriod>('90d');
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<BacktestResult | null>(null);
  const timersRef = useRef<number[]>([]);

  useEffect(() => {
    return () => timersRef.current.forEach(clearTimeout);
  }, []);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }

  function startBacktest() {
    clearTimers();
    setPhase('running');
    setProgress(0);
    setResult(null);

    const totalSteps = 24;
    const stepDelay = 55;
    for (let i = 1; i <= totalSteps; i++) {
      const id = window.setTimeout(() => {
        setProgress(Math.round((i / totalSteps) * 100));
        if (i === totalSteps) {
          const r = runBacktest(asset, period);
          setResult(r);
          setPhase('done');
        }
      }, i * stepDelay);
      timersRef.current.push(id);
    }
  }

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Backtest Inteligente</h2>
        <p className="text-xs text-slate-500">Teste estratégias com dados simulados</p>
      </section>

      {/* Selectors */}
      <section className="animate-fade-up space-y-4">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Ativo</label>
          <div className="grid grid-cols-2 gap-2">
            {ASSET_LIST.map((a) => {
              const Icon = ASSET_ICON[a.code];
              const isActive = asset === a.code;
              return (
                <button key={a.code} onClick={() => { setAsset(a.code); setPhase('idle'); setResult(null); }} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all ${isActive ? 'border-accent-500/60 bg-accent-500/10' : 'border-white/[0.06] bg-ink-850/60 hover:bg-ink-800'}`}>
                  <Icon className={`h-4 w-4 ${isActive ? 'text-accent-300' : 'text-slate-500'}`} />
                  <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{a.code}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Período</label>
          <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-white/[0.06] bg-ink-850/60 p-1.5">
            {PERIODS.map((p) => (
              <button key={p.value} onClick={() => { setPeriod(p.value); setPhase('idle'); setResult(null); }} className={`rounded-md px-2 py-2 text-xs font-bold transition-all ${period === p.value ? 'bg-accent-500 text-white' : 'text-slate-400 hover:bg-ink-800'}`}>
                {p.label}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-[11px] text-slate-600">{PERIOD_LABELS[period]} · {periodToDays(period)} pregões</p>
        </div>
      </section>

      {/* Start button */}
      <section className="animate-fade-up">
        <button
          onClick={startBacktest}
          disabled={phase === 'running'}
          className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 px-5 py-4 text-white shadow-lg shadow-accent-500/20 transition-all active:scale-[0.99] disabled:opacity-70"
        >
          <div className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />
          {phase === 'running' ? <RefreshCw className="h-5 w-5 animate-spin-slow" strokeWidth={2.5} /> : <Play className="h-5 w-5" fill="currentColor" strokeWidth={2} />}
          <span className="text-sm font-bold tracking-wide">{phase === 'running' ? 'Executando backtest...' : 'Iniciar Backtest'}</span>
        </button>
      </section>

      {/* Progress */}
      {phase === 'running' && (
        <section className="card animate-fade-in p-4">
          <div className="mb-2 flex items-center justify-between text-xs">
            <span className="font-semibold text-slate-300">Processando {periodToDays(period)} pregões...</span>
            <span className="font-mono font-bold tabular text-accent-300">{progress}%</span>
          </div>
          <ProgressBar value={progress} tone="accent" />
        </section>
      )}

      {/* Results */}
      {phase === 'done' && result && (
        <>
          {/* Equity chart */}
          <section className="card animate-fade-up p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-white">Evolução do capital</h3>
                <p className="text-[11px] text-slate-500 tabular">{result.totalTrades} operações · {PERIOD_LABELS[result.period]}</p>
              </div>
              <span className={`font-mono text-lg font-bold tabular ${result.netProfit >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                {result.netProfit >= 0 ? '+' : ''}{formatMoney(result.netProfit)}
              </span>
            </div>
            <div className="mt-3">
              <Sparkline points={result.equityCurve} width={340} height={120} positive={result.netProfit >= 0} className="w-full" />
            </div>
          </section>

          {/* Metrics grid */}
          <section className="animate-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Metric icon={Activity} label="Total de operações" value={`${result.totalTrades}`} />
            <Metric icon={TrendingUp} label="Vencedoras" value={`${result.wins}`} tone="bull" />
            <Metric icon={TrendingDown} label="Perdedoras" value={`${result.losses}`} tone="bear" />
            <Metric icon={Target} label="Taxa de acerto" value={`${result.winRate.toFixed(1)}%`} tone={result.winRate >= 50 ? 'bull' : 'bear'} />
            <Metric icon={DollarSign} label="Lucro líquido" value={formatMoney(result.netProfit)} tone={result.netProfit >= 0 ? 'bull' : 'bear'} />
            <Metric icon={TrendingDown} label="Drawdown máximo" value={formatMoney(result.maxDrawdown)} tone="bear" />
            <Metric icon={Scale} label="Profit Factor" value={result.profitFactor.toFixed(2)} tone={result.profitFactor >= 1 ? 'bull' : 'bear'} />
            <Metric icon={Gauge} label="Expectativa" value={formatMoney(result.expectancy)} tone={result.expectancy >= 0 ? 'bull' : 'bear'} />
            <Metric icon={Scale} label="Retorno sobre risco" value={`${result.returnOnRisk.toFixed(1)}%`} tone={result.returnOnRisk >= 0 ? 'bull' : 'bear'} />
          </section>

          {/* Trade list */}
          <section className="animate-fade-up pb-2">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Operações do backtest</h3>
            <div className="card overflow-hidden">
              <ul className="max-h-80 divide-y divide-white/[0.04] overflow-y-auto no-scrollbar">
                {result.trades.slice(-20).reverse().map((t) => (
                  <li key={t.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg text-[10px] font-bold ${t.direction === 'BUY' ? 'bg-bull-500/10 text-bull-400' : 'bg-bear-500/10 text-bear-400'}`}>
                        {t.direction === 'BUY' ? 'C' : 'V'}
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{t.asset} · {t.direction === 'BUY' ? 'Compra' : 'Venda'}</div>
                        <div className="text-[10px] text-slate-600 tabular">{formatDateTime(t.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-sm font-bold tabular ${t.pnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                        {t.pnl >= 0 ? '+' : ''}{formatMoney(t.pnl)}
                      </div>
                      <div className="text-[10px] text-slate-600 tabular">{t.points > 0 ? '+' : ''}{t.points} pts</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ icon: Icon, label, value, tone }: { icon: typeof Target; label: string; value: string; tone?: 'bull' | 'bear' }) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-1.5 font-mono text-base font-bold tabular ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}
