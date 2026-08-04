import { useState } from 'react';
import type { Asset, Strategy, StrategyTestResult } from '@/types';
import { STRATEGIES, RISK_TONE, testStrategy, compareStrategies, bestStrategy } from '@/lib/strategies';
import { ASSET_LIST, formatMoney, formatPct } from '@/lib/assets';
import { Sparkline } from '@/components/ui/Sparkline';
import {
  Zap,
  TrendingUp,
  Rocket,
  Undo2,
  Repeat,
  Play,
  RefreshCw,
  Clock,
  BarChart3,
  Target,
  Scale,
  Trophy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

const STRATEGY_ICONS: Record<string, typeof Zap> = {
  zap: Zap,
  trending: TrendingUp,
  breakout: Rocket,
  pullback: Undo2,
  reversal: Repeat,
};

const ASSET_LABELS: Record<Asset, string> = { WIN: 'Mini Índice', WDO: 'Mini Dólar' };

export default function Strategies() {
  const [asset, setAsset] = useState<Asset>('WIN');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [testing, setTesting] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, StrategyTestResult>>({});
  const [showCompare, setShowCompare] = useState(false);
  const [compareData, setCompareData] = useState<StrategyTestResult[] | null>(null);

  function handleTest(strategyKey: string) {
    setTesting(strategyKey);
    setTimeout(() => {
      const r = testStrategy(strategyKey as Strategy['key'], asset);
      setResults((prev) => ({ ...prev, [strategyKey]: r }));
      setTesting(null);
    }, 900);
  }

  function handleCompare() {
    setShowCompare(true);
    setCompareData(compareStrategies(asset));
  }

  const best = compareData ? bestStrategy(compareData) : null;

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Central de Estratégias</h2>
        <p className="text-xs text-slate-500">5 estratégias testáveis com comparador</p>
      </section>

      <section className="animate-fade-up grid grid-cols-2 gap-2">
        {ASSET_LIST.map((a) => {
          const isActive = asset === a.code;
          return (
            <button key={a.code} onClick={() => { setAsset(a.code); setResults({}); setCompareData(null); setShowCompare(false); }} className={`flex items-center justify-center gap-2 rounded-lg border px-3 py-2.5 transition-all ${isActive ? 'border-accent-500/60 bg-accent-500/10' : 'border-white/[0.06] bg-ink-850/60 hover:bg-ink-800'}`}>
              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{a.code}</span>
              <span className={`text-[11px] ${isActive ? 'text-accent-300' : 'text-slate-600'}`}>{a.name}</span>
            </button>
          );
        })}
      </section>

      <section className="animate-fade-up">
        <button onClick={handleCompare} disabled={showCompare && !!compareData} className="flex w-full items-center justify-center gap-2 rounded-xl bg-ink-800 py-3 text-sm font-bold text-slate-200 transition-colors hover:bg-ink-750 disabled:opacity-60">
          <Scale className="h-4 w-4 text-accent-400" /> Comparar estratégias
        </button>
      </section>

      <section className="animate-fade-up space-y-3">
        {STRATEGIES.map((s, idx) => {
          const Icon = STRATEGY_ICONS[s.icon] ?? Zap;
          const risk = RISK_TONE[s.riskLevel];
          const isOpen = expanded === s.key;
          const result = results[s.key];
          const isTesting = testing === s.key;
          return (
            <div key={s.key} className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-850/70 transition-all" style={{ animation: 'fade-up 0.4s both', animationDelay: `${idx * 60}ms` }}>
              <button onClick={() => setExpanded(isOpen ? null : s.key)} className="flex w-full items-center gap-3 p-4 text-left">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-300">
                  <Icon className="h-5 w-5" strokeWidth={2.2} />
                </span>
                <span className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{s.name}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold ${risk.bg} ${risk.text}`}>Risco {s.riskLevel}</span>
                  </div>
                  <span className="block truncate text-[11px] text-slate-500">{s.description}</span>
                </span>
                {isOpen ? <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" /> : <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />}
              </button>

              {isOpen && (
                <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
                    <Detail icon={Clock} label="Melhor horário" value={s.bestTime} />
                    <Detail icon={BarChart3} label="Melhor timeframe" value={s.bestTimeframe} />
                    <Detail icon={Target} label="Melhor ativo" value={`${s.bestAsset} · ${ASSET_LABELS[s.bestAsset]}`} />
                    <Detail icon={Target} label="Taxa de acerto" value={formatPct(s.winRate)} tone={s.winRate >= 55 ? 'bull' : 'wait'} />
                  </div>

                  <button onClick={() => handleTest(s.key)} disabled={isTesting} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-accent-500/10 py-2.5 text-xs font-bold text-accent-300 transition-colors hover:bg-accent-500/20 disabled:opacity-60">
                    {isTesting ? <RefreshCw className="h-3.5 w-3.5 animate-spin-slow" /> : <Play className="h-3.5 w-3.5" fill="currentColor" />}
                    {isTesting ? 'Testando...' : 'Testar Estratégia'}
                  </button>

                  {result && (
                    <div className="mt-3 rounded-xl border border-white/[0.06] bg-ink-800/50 p-3.5 animate-fade-in">
                      <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-500">Resultado do teste</div>
                      <div className="grid grid-cols-3 gap-2">
                        <ResultMini label="Operações" value={`${result.trades}`} />
                        <ResultMini label="Acerto" value={formatPct(result.winRate)} tone={result.winRate >= 55 ? 'bull' : 'wait'} />
                        <ResultMini label="Lucro" value={result.netProfit >= 0 ? `+${formatMoney(result.netProfit)}` : formatMoney(result.netProfit)} tone={result.netProfit >= 0 ? 'bull' : 'bear'} />
                      </div>
                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                        <ResultMini label="Drawdown" value={formatMoney(result.maxDrawdown)} tone="bear" />
                        <ResultMini label="Profit Factor" value={result.profitFactor.toFixed(2)} tone={result.profitFactor >= 1 ? 'bull' : 'bear'} />
                      </div>
                      <div className="mt-2.5">
                        <Sparkline points={result.equityCurve} width={300} height={56} positive={result.netProfit >= 0} className="w-full" />
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {showCompare && compareData && (
        <section className="animate-fade-up space-y-3">
          <div className="flex items-center gap-2">
            <Scale className="h-4 w-4 text-accent-400" />
            <h3 className="text-sm font-bold text-white">Comparador</h3>
            <span className="text-[11px] text-slate-500">· {asset}</span>
          </div>

          {best && (
            <div className="card flex items-center gap-3 p-4 ring-1 ring-bull-500/20">
              <span className="grid h-10 w-10 place-items-center rounded-lg bg-bull-500/10 text-bull-400">
                <Trophy className="h-5 w-5" />
              </span>
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Melhor estratégia</div>
                <div className="text-sm font-bold text-bull-400">{STRATEGIES.find((s) => s.key === best.strategy)?.name}</div>
              </div>
              <span className="ml-auto font-mono text-lg font-bold tabular text-bull-400">+{formatMoney(best.netProfit)}</span>
            </div>
          )}

          <div className="card overflow-hidden">
            <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr] gap-2 border-b border-white/[0.06] px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-slate-600">
              <span>Estratégia</span>
              <span className="text-center">Acerto</span>
              <span className="text-center">PF</span>
              <span className="text-right">Lucro</span>
            </div>
            {compareData.map((r) => {
              const strat = STRATEGIES.find((s) => s.key === r.strategy)!;
              const isBest = best?.strategy === r.strategy;
              return (
                <div key={r.strategy} className={`grid grid-cols-[1.4fr_0.8fr_0.8fr_0.9fr] items-center gap-2 border-b border-white/[0.04] px-4 py-3 last:border-0 ${isBest ? 'bg-bull-500/[0.04]' : ''}`}>
                  <div className="flex items-center gap-2">
                    {isBest && <Trophy className="h-3.5 w-3.5 shrink-0 text-bull-400" />}
                    <span className="truncate text-xs font-bold text-slate-200">{strat.name}</span>
                  </div>
                  <span className="text-center font-mono text-xs tabular text-slate-300">{formatPct(r.winRate, 0)}</span>
                  <span className={`text-center font-mono text-xs tabular ${r.profitFactor >= 1 ? 'text-bull-400' : 'text-bear-400'}`}>{r.profitFactor.toFixed(2)}</span>
                  <span className={`text-right font-mono text-xs font-bold tabular ${r.netProfit >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>{r.netProfit >= 0 ? '+' : ''}{formatMoney(r.netProfit)}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function Detail({ icon: Icon, label, value, tone }: { icon: typeof Clock; label: string; value: string; tone?: 'bull' | 'wait' }) {
  return (
    <div>
      <div className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        <Icon className="h-3 w-3" />{label}
      </div>
      <div className={`mt-0.5 text-xs font-bold ${tone === 'bull' ? 'text-bull-400' : tone === 'wait' ? 'text-wait-400' : 'text-slate-200'}`}>{value}</div>
    </div>
  );
}

function ResultMini({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' | 'wait' }) {
  return (
    <div className="rounded-lg bg-ink-850/60 p-2 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-0.5 font-mono text-xs font-bold tabular ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : tone === 'wait' ? 'text-wait-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}
