import { useEffect, useState } from 'react';
import type { Asset, Timeframe, AnalysisResult, SignalExplanation } from '@/types';
import { getMarketDataProvider } from '@/services/types';
import { useStore } from '@/store';
import { explainSignal, signalExplanationLabel } from '@/lib/intelligence';
import { ASSET_LIST, TIMEFRAMES, formatPrice, formatDateTime } from '@/lib/assets';
import {
  Sparkles,
  RefreshCw,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  ArrowDownCircle,
  CircleDot,
  Brain,
  Info,
} from 'lucide-react';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { ScoreGauge } from '@/components/ui/ScoreGauge';

const ASSET_ICON: Record<Asset, typeof TrendingUp> = { WIN: TrendingUp, WDO: DollarSign };

const SIGNAL_CFG: Record<
  string,
  { label: string; text: string; bg: string; ring: string; Icon: typeof ArrowUpCircle }
> = {
  BUY: { label: 'COMPRA', text: 'text-bull-400', bg: 'from-bull-500/20 to-bull-600/5', ring: 'ring-bull-500/40', Icon: ArrowUpCircle },
  SELL: { label: 'VENDA', text: 'text-bear-400', bg: 'from-bear-500/20 to-bear-600/5', ring: 'ring-bear-500/40', Icon: ArrowDownCircle },
  WAIT: { label: 'AGUARDAR', text: 'text-wait-400', bg: 'from-wait-500/15 to-wait-600/5', ring: 'ring-wait-500/30', Icon: CircleDot },
};

interface IntelligenceProps {
  initialAsset: Asset;
}

export default function Intelligence({ initialAsset }: IntelligenceProps) {
  const provider = getMarketDataProvider();
  const { history, addHistory } = useStore();
  const [asset, setAsset] = useState<Asset>(initialAsset);
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [explanation, setExplanation] = useState<SignalExplanation | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await provider.analyze(asset, timeframe);
      setResult(r);
      addHistory(r);
      setExplanation(explainSignal(r));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, timeframe]);

  const sigCfg = SIGNAL_CFG[result?.finalSignal ?? 'WAIT'];
  const recentHistory = history.slice(0, 50);

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent-400" />
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">Central de Inteligência</h2>
            <p className="text-xs text-slate-500">Cada sinal explicado com confirmações técnicas</p>
          </div>
        </div>
      </section>

      {/* Selectors */}
      <section className="animate-fade-up space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {ASSET_LIST.map((a) => {
            const Icon = ASSET_ICON[a.code];
            const isActive = asset === a.code;
            return (
              <button key={a.code} onClick={() => setAsset(a.code)} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all ${isActive ? 'border-accent-500/60 bg-accent-500/10' : 'border-white/[0.06] bg-ink-850/60 hover:bg-ink-800'}`}>
                <Icon className={`h-4 w-4 ${isActive ? 'text-accent-300' : 'text-slate-500'}`} />
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{a.code}</span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-4 gap-1.5 rounded-lg border border-white/[0.06] bg-ink-850/60 p-1.5">
          {TIMEFRAMES.map((tf) => (
            <button key={tf.value} onClick={() => setTimeframe(tf.value)} className={`rounded-md px-2 py-2 text-xs font-bold transition-all ${timeframe === tf.value ? 'bg-accent-500 text-white' : 'text-slate-400 hover:bg-ink-800'}`}>{tf.value}</button>
          ))}
        </div>
      </section>

      {!result && loading ? (
        <div className="card flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin-slow" /> Explicando sinal...
        </div>
      ) : result && explanation ? (
        <>
          {/* Signal header */}
          <section className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${sigCfg.bg} p-5 ring-1 ${sigCfg.ring} animate-fade-up`}>
            <div className="absolute inset-0 grid-noise opacity-30" />
            <div className="relative flex items-center justify-between">
              <div className="flex items-center gap-3">
                <sigCfg.Icon className={`h-10 w-10 ${sigCfg.text}`} strokeWidth={2} />
                <div>
                  <div className={`text-2xl font-extrabold tracking-tight ${sigCfg.text}`}>{sigCfg.label}</div>
                  <div className="text-[11px] text-slate-400 tabular">{result.asset} · {result.timeframe} · {formatPrice(asset, result.price)}</div>
                </div>
              </div>
              <ScoreGauge score={result.score} size={88} label="Score" />
            </div>
          </section>

          {/* Reasoning title */}
          <section className="card animate-fade-up p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-bold text-white">{explanation.title}</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{explanation.summary}</p>
          </section>

          {/* Confidence bar */}
          <section className="card animate-fade-up p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Confiança da análise</span>
              <span className="font-mono text-sm font-bold tabular text-white">{explanation.confidence}%</span>
            </div>
            <ProgressBar value={explanation.confidence} tone="accent" height="md" />
            <div className="mt-2 flex items-center justify-between text-[11px] tabular">
              <span className="text-slate-500">Confirmações: <span className="font-bold text-slate-300">{explanation.confirmedCount}/{explanation.totalCount}</span></span>
              <span className="text-slate-500">Score: <span className="font-bold text-slate-300">{explanation.score}/100</span></span>
            </div>
          </section>

          {/* Confirmations checklist */}
          <section className="animate-fade-up">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Confirmações técnicas</h3>
            <div className="grid gap-2.5">
              {explanation.confirmations.map((c, i) => (
                <div
                  key={c.id}
                  className={`overflow-hidden rounded-xl border p-3.5 transition-all ${c.confirmed ? 'border-bull-500/20 bg-bull-500/[0.04]' : 'border-white/[0.06] bg-ink-850/70'}`}
                  style={{ animation: 'fade-up 0.4s both', animationDelay: `${i * 60}ms` }}
                >
                  <div className="flex items-center gap-3">
                    {c.confirmed ? (
                      <CheckCircle2 className="h-5 w-5 shrink-0 text-bull-400" strokeWidth={2.5} />
                    ) : (
                      <XCircle className="h-5 w-5 shrink-0 text-slate-600" strokeWidth={2.2} />
                    )}
                    <div className="min-w-0 flex-1">
                      <div className={`text-sm font-bold ${c.confirmed ? 'text-white' : 'text-slate-400'}`}>{c.label}</div>
                      <div className="truncate text-[11px] text-slate-500">{c.description}</div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-bold tabular text-slate-200">{c.score}</div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-600">score</div>
                    </div>
                  </div>
                  <div className="mt-2.5 pl-8">
                    <ProgressBar value={c.score} tone={c.confirmed ? 'bull' : 'wait'} height="sm" />
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* AI readiness note */}
          <section className="card animate-fade-up flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
            <p className="text-xs leading-relaxed text-slate-400">
              Esta explicação é gerada por um módulo simulado (<span className="font-mono text-slate-300">SimulatedSignalExplainer</span>). O sistema já está preparado para receber uma inteligência artificial que explicará automaticamente cada sinal — basta substituir o explicador, sem alterar esta tela.
            </p>
          </section>
        </>
      ) : null}

      {/* History of last 50 analyses */}
      <section className="animate-fade-up pb-2">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Histórico das últimas 50 análises</h3>
          <span className="text-[10px] tabular text-slate-600">{recentHistory.length}/50</span>
        </div>
        <div className="card overflow-hidden">
          {recentHistory.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-600">Nenhuma análise registrada ainda. Gere um sinal acima para começar.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-white/[0.04] overflow-y-auto no-scrollbar">
              {recentHistory.map((h) => {
                const cfg = SIGNAL_CFG[h.finalSignal];
                const Icon = cfg.Icon;
                return (
                  <li key={h.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg ${cfg.bg.replace('from-', 'bg-').split(' ')[0]} ${cfg.text}`}>
                        <Icon className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {cfg.label} · {h.asset} · {h.timeframe}
                        </div>
                        <div className="text-[11px] text-slate-600 tabular">{formatDateTime(h.createdAt)} · {formatPrice(h.asset, h.price)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-bold tabular text-white">{h.score}</div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-600">score · {h.confidence}%</div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
