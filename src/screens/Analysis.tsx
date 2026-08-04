import { useEffect, useState } from 'react';
import type { Asset, Timeframe, AnalysisResult } from '@/types';
import { getMarketDataProvider } from '@/services/types';
import { useStore } from '@/store';
import { ASSET_LIST, TIMEFRAMES, formatPrice, formatDateTime } from '@/lib/assets';
import { INDICATOR_META, META_BY_KEY, signalShort, signalLabel } from '@/lib/indicators';
import { ArrowUpCircle, ArrowDownCircle, CircleDot, RefreshCw, TrendingUp, DollarSign, Sparkles, Cpu } from 'lucide-react';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { ProgressBar } from '@/components/ui/ProgressBar';

const ASSET_ICON: Record<Asset, typeof TrendingUp> = { WIN: TrendingUp, WDO: DollarSign };

interface AnalysisScreenProps {
  initialAsset: Asset;
  onGoToAI: (asset: Asset) => void;
  onGoToEngine: (asset: Asset) => void;
}

export default function AnalysisScreen({ initialAsset, onGoToAI, onGoToEngine }: AnalysisScreenProps) {
  const provider = getMarketDataProvider();
  const { addHistory } = useStore();
  const [asset, setAsset] = useState<Asset>(initialAsset);
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await provider.analyze(asset, timeframe);
      setResult(r);
      addHistory(r);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, timeframe]);

  const finalSignal = result?.finalSignal ?? 'WAIT';
  const signalCfg =
    finalSignal === 'BUY'
      ? { label: 'COMPRA', text: 'text-bull-400', bg: 'from-bull-500/20 to-bull-600/5', ring: 'ring-bull-500/40', Icon: ArrowUpCircle }
      : finalSignal === 'SELL'
        ? { label: 'VENDA', text: 'text-bear-400', bg: 'from-bear-500/20 to-bear-600/5', ring: 'ring-bear-500/40', Icon: ArrowDownCircle }
        : { label: 'AGUARDAR', text: 'text-wait-400', bg: 'from-wait-500/15 to-wait-600/5', ring: 'ring-wait-500/30', Icon: CircleDot };

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Análise</h2>
        <p className="text-xs text-slate-500">Indicadores técnicos e sinal final</p>
      </section>

      {/* Selectors */}
      <section className="space-y-4 animate-fade-up">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Ativo</label>
          <div className="grid grid-cols-2 gap-2">
            {ASSET_LIST.map((a) => {
              const Icon = ASSET_ICON[a.code];
              const isActive = asset === a.code;
              return (
                <button
                  key={a.code}
                  onClick={() => setAsset(a.code)}
                  className={`group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                    isActive
                      ? 'border-accent-500/60 bg-accent-500/10 shadow-lg shadow-accent-500/10'
                      : 'border-white/[0.06] bg-ink-850/60 hover:border-white/[0.12] hover:bg-ink-800'
                  }`}
                >
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${isActive ? 'bg-accent-500/20 text-accent-300' : 'bg-ink-800 text-slate-500'}`}>
                    <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
                  </span>
                  <span className="min-w-0">
                    <span className={`block text-sm font-bold leading-tight ${isActive ? 'text-white' : 'text-slate-300'}`}>{a.code}</span>
                    <span className="block truncate text-[11px] text-slate-500">{a.name}</span>
                  </span>
                  {isActive && <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-accent-400 shadow-[0_0_8px] shadow-accent-400" />}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">Timeframe</label>
          <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-white/[0.06] bg-ink-850/60 p-1.5">
            {TIMEFRAMES.map((tf) => {
              const isActive = timeframe === tf.value;
              return (
                <button
                  key={tf.value}
                  onClick={() => setTimeframe(tf.value)}
                  className={`rounded-lg px-2 py-2.5 text-center text-xs font-bold transition-all ${
                    isActive ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/20' : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
                  }`}
                >
                  {tf.value}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {!result && loading ? (
        <div className="card flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin-slow" /> Analisando...
        </div>
      ) : result ? (
        <>
          {/* Score + confidence */}
          <section className="card animate-fade-up p-4 sm:p-5">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <ScoreGauge score={result.score} label="Score" />
              <div className="w-full flex-1 space-y-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Confiança</span>
                    <span className="font-mono text-sm font-bold tabular text-white">{result.confidence}%</span>
                  </div>
                  <ProgressBar value={result.confidence} tone="accent" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Tendência" value={result.trend} tone={result.trend === 'ALTA' ? 'bull' : result.trend === 'BAIXA' ? 'bear' : 'wait'} />
                  <MiniStat label="Probabilidade" value={`${result.probability}%`} />
                  <MiniStat label="Preço" value={formatPrice(asset, result.price)} />
                </div>
              </div>
            </div>
          </section>

          {/* Indicators */}
          <section className="animate-fade-up">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Indicadores Técnicos</h3>
              <button onClick={run} className="flex items-center gap-1 text-[11px] font-semibold text-accent-400 hover:text-accent-300">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin-slow' : ''}`} /> Atualizar
              </button>
            </div>
            <div className="grid gap-2.5">
              {result.indicators.map((ind, i) => {
                const meta = META_BY_KEY[ind.key];
                const cfg =
                  ind.signal === 'BUY'
                    ? { text: 'text-bull-400', bg: 'bg-bull-500/10', ring: 'ring-bull-500/30', dot: 'bg-bull-500', Icon: ArrowUpCircle }
                    : ind.signal === 'SELL'
                      ? { text: 'text-bear-400', bg: 'bg-bear-500/10', ring: 'ring-bear-500/30', dot: 'bg-bear-500', Icon: ArrowDownCircle }
                      : { text: 'text-wait-400', bg: 'bg-wait-500/10', ring: 'ring-wait-500/20', dot: 'bg-wait-500', Icon: CircleDot };
                const bias = ind.strength - 50;
                return (
                  <div
                    key={ind.key}
                    className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850/70 p-3.5 transition-all hover:border-white/[0.12]"
                    style={{ animation: 'fade-up 0.4s both', animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-800 text-[10px] font-bold text-slate-400">{meta.abbr}</span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-bold text-white">{meta.label}</div>
                          <div className="truncate text-[10px] text-slate-500">{meta.description}</div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="font-mono text-sm font-semibold tabular text-slate-200">{ind.value}</div>
                      </div>
                    </div>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                        <div className="absolute inset-y-0 left-1/2 w-px bg-white/15" />
                        <div
                          className={`absolute inset-y-0 rounded-full transition-all duration-500 ${bias >= 0 ? 'bg-bull-500' : 'bg-bear-500'}`}
                          style={{ width: `${Math.abs(bias) * 2}%`, left: bias >= 0 ? '50%' : undefined, right: bias < 0 ? '50%' : undefined }}
                        />
                      </div>
                      <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ${cfg.bg} ${cfg.ring}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                        <cfg.Icon className={`h-3.5 w-3.5 ${cfg.text}`} strokeWidth={2.5} />
                        <span className={`text-[11px] font-bold ${cfg.text}`}>{signalLabel(ind.signal)}</span>
                      </div>
                    </div>
                    <p className="mt-2 truncate text-[11px] text-slate-500">{ind.detail}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Final signal */}
          <section className="animate-fade-up">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Sinal Final</h3>
            <div className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${signalCfg.bg} p-5 ring-1 ${signalCfg.ring}`}>
              <div className="absolute inset-0 grid-noise opacity-30" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <signalCfg.Icon className={`h-10 w-10 ${signalCfg.text}`} strokeWidth={2} />
                  <div>
                    <div className={`text-2xl font-extrabold tracking-tight ${signalCfg.text}`}>{signalCfg.label}</div>
                    <div className="text-[11px] text-slate-400">
                      Score {result.score} · Confiança {result.confidence}% · {result.timeframe}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => onGoToAI(asset)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-accent-400" /> Ver IA
                  </button>
                  <button
                    onClick={() => onGoToEngine(asset)}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
                  >
                    <Cpu className="h-3.5 w-3.5 text-accent-400" /> Engine
                  </button>
                </div>
              </div>
            </div>

            {/* Levels */}
            <div className="mt-3 grid grid-cols-3 gap-2">
              <LevelCard label="Entrada" value={formatPrice(asset, result.entry)} />
              <LevelCard label="Stop" value={formatPrice(asset, result.stop)} tone="bear" />
              <LevelCard label="Alvo" value={formatPrice(asset, result.target)} tone="bull" />
            </div>
            <p className="mt-2 text-center text-[11px] text-slate-600 tabular">Atualizado em {formatDateTime(result.createdAt)} · Dados simulados</p>
          </section>
        </>
      ) : null}
    </div>
  );
}

function MiniStat({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' | 'wait' }) {
  return (
    <div className="rounded-lg bg-ink-800/60 p-2.5 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div
        className={`mt-0.5 font-mono text-xs font-bold tabular ${
          tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : tone === 'wait' ? 'text-wait-400' : 'text-slate-200'
        }`}
      >
        {value}
      </div>
    </div>
  );
}

function LevelCard({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1 font-mono text-sm font-bold tabular ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-slate-200'}`}>{value}</div>
    </div>
  );
}
