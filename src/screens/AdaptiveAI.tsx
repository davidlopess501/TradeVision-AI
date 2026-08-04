import { useEffect, useState } from 'react';
import type { Asset, Timeframe, AnalysisResult, AdaptiveEvaluation } from '@/types';
import { getMarketDataProvider } from '@/services/types';
import { useStore } from '@/store';
import { getAdaptiveAI, evaluateSignal, classifyQuality, QUALITY_BANDS, signalDirLabel } from '@/lib/adaptiveAI';
import { ASSET_LIST, TIMEFRAMES, formatDateTime, formatPrice } from '@/lib/assets';
import {
  Brain,
  RefreshCw,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  XCircle,
  ThumbsUp,
  ThumbsDown,
  Sparkles,
  Cpu,
  ArrowUpCircle,
  ArrowDownCircle,
  CircleDot,
  History,
} from 'lucide-react';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { ProgressBar } from '@/components/ui/ProgressBar';

const ASSET_ICON: Record<Asset, typeof TrendingUp> = { WIN: TrendingUp, WDO: DollarSign };

const SIGNAL_ICON: Record<string, typeof ArrowUpCircle> = {
  BUY: ArrowUpCircle,
  SELL: ArrowDownCircle,
  WAIT: CircleDot,
};

const SIGNAL_TONE: Record<string, string> = {
  BUY: 'text-bull-400',
  SELL: 'text-bear-400',
  WAIT: 'text-wait-400',
};

const QUALITY_TONE_TEXT: Record<string, string> = {
  EXCELLENT: 'text-bull-400',
  GOOD: 'text-accent-400',
  AVERAGE: 'text-wait-400',
  WEAK: 'text-gold-400',
  POOR: 'text-bear-400',
};

interface AdaptiveAIProps {
  initialAsset: Asset;
}

export default function AdaptiveAI({ initialAsset }: AdaptiveAIProps) {
  const provider = getMarketDataProvider();
  const { history, trades } = useStore();
  const [asset, setAsset] = useState<Asset>(initialAsset);
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [evaluation, setEvaluation] = useState<AdaptiveEvaluation | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const r = await provider.analyze(asset, timeframe);
      setResult(r);
      const ai = getAdaptiveAI();
      ai.learnFromHistory(trades);
      setEvaluation(ai.evaluate(r));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, timeframe]);

  const q = evaluation ? classifyQuality(evaluation.qualityScore) : null;
  const evalHistory = history.slice(0, 20);

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <div className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-accent-400" />
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">IA Adaptativa</h2>
            <p className="text-xs text-slate-500">Avaliação inteligente de cada sinal</p>
          </div>
        </div>
      </section>

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
          <RefreshCw className="h-4 w-4 animate-spin-slow" /> IA analisando sinal...
        </div>
      ) : evaluation && result && q ? (
        <>
          <section className="card animate-fade-up p-4 sm:p-5">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <ScoreGauge score={evaluation.qualityScore} size={140} label="Qualidade" />
              <div className="w-full flex-1 space-y-3">
                <div className={`rounded-xl bg-gradient-to-br p-4 ${q.tone === 'bull' ? 'from-bull-500/15 to-bull-600/5 ring-1 ring-bull-500/30' : q.tone === 'accent' ? 'from-accent-500/15 to-accent-600/5 ring-1 ring-accent-500/30' : q.tone === 'wait' ? 'from-wait-500/10 to-wait-600/5 ring-1 ring-wait-500/20' : q.tone === 'gold' ? 'from-gold-500/10 to-gold-600/5 ring-1 ring-gold-500/20' : 'from-bear-500/15 to-bear-600/5 ring-1 ring-bear-500/30'}`}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Qualidade do sinal</div>
                  <div className={`mt-0.5 text-xl font-extrabold ${QUALITY_TONE_TEXT[evaluation.quality]}`}>{q.label}</div>
                  <div className="text-[11px] text-slate-500 tabular">{evaluation.qualityScore}/100</div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Nível de confiança</span>
                    <span className="font-mono text-sm font-bold tabular text-white">{evaluation.confidence}%</span>
                  </div>
                  <ProgressBar value={evaluation.confidence} tone="accent" />
                </div>
              </div>
            </div>
          </section>

          <section className="animate-fade-up">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Faixas de qualidade</h3>
            <div className="grid grid-cols-5 gap-1.5">
              {QUALITY_BANDS.map((b) => {
                const isActive = b.quality === evaluation.quality;
                const toneCls = b.tone === 'bull' ? 'text-bull-400' : b.tone === 'accent' ? 'text-accent-400' : b.tone === 'wait' ? 'text-wait-400' : b.tone === 'gold' ? 'text-gold-400' : 'text-bear-400';
                return (
                  <div key={b.quality} className={`rounded-md p-1.5 text-center transition-all ${isActive ? 'bg-white/5 ring-1 ring-white/10' : 'opacity-50'}`}>
                    <div className={`text-[9px] font-bold ${toneCls}`}>{b.label}</div>
                    <div className="text-[8px] tabular text-slate-600">{b.range}</div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="card animate-fade-up p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-bold text-white">Explicação detalhada</h3>
            </div>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{evaluation.detailedExplanation}</p>
          </section>

          <section className="animate-fade-up">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Indicadores utilizados</h3>
            <div className="space-y-2">
              {evaluation.indicatorsUsed.map((ind, i) => {
                const SigIcon = SIGNAL_ICON[ind.direction] ?? CircleDot;
                const dirTone = SIGNAL_TONE[ind.direction] ?? 'text-wait-400';
                return (
                  <div key={i} className="card flex items-center gap-3 p-3.5" style={{ animation: 'fade-up 0.35s both', animationDelay: `${i * 50}ms` }}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{ind.name}</span>
                        <span className={`flex items-center gap-1 text-[11px] font-bold ${dirTone}`}>
                          <SigIcon className="h-3.5 w-3.5" /> {signalDirLabel(ind.direction)}
                        </span>
                      </div>
                      <div className="mt-2">
                        <ProgressBar value={ind.contribution} tone={ind.direction === 'BUY' ? 'bull' : ind.direction === 'SELL' ? 'bear' : 'wait'} height="sm" />
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-bold tabular text-white">{ind.contribution}</div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-600">contrib.</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-3 animate-fade-up sm:grid-cols-2">
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-bull-400" />
                <h3 className="text-sm font-bold text-white">Pontos positivos</h3>
              </div>
              <ul className="mt-2.5 space-y-2">
                {evaluation.positivePoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bull-400" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-4">
              <div className="flex items-center gap-2">
                <ThumbsDown className="h-4 w-4 text-bear-400" />
                <h3 className="text-sm font-bold text-white">Pontos negativos</h3>
              </div>
              <ul className="mt-2.5 space-y-2">
                {evaluation.negativePoints.map((p, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-300">
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-bear-400" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="card animate-fade-up flex items-start gap-3 p-4">
            <Cpu className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
            <p className="text-xs leading-relaxed text-slate-400">
              Esta IA é adaptativa: ela já processa o histórico de {trades.length} operações para ajustar suas avaliações. O sistema está preparado para aprendizado futuro — ao conectar resultados reais, a IA refina automaticamente seus critérios de qualidade.
            </p>
          </section>
        </>
      ) : null}

      <section className="animate-fade-up pb-2">
        <div className="mb-2 flex items-center gap-2">
          <History className="h-3.5 w-3.5 text-slate-600" />
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Histórico de avaliações da IA</h3>
        </div>
        <div className="card overflow-hidden">
          {evalHistory.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-600">Nenhuma avaliação registrada ainda.</p>
          ) : (
            <ul className="max-h-80 divide-y divide-white/[0.04] overflow-y-auto no-scrollbar">
              {evalHistory.map((h) => {
                const ev = evaluateSignal(h);
                const q2 = classifyQuality(ev.qualityScore);
                const SigIcon = SIGNAL_ICON[h.finalSignal] ?? CircleDot;
                return (
                  <li key={h.id} className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg ${q2.tone === 'bull' ? 'bg-bull-500/10' : q2.tone === 'accent' ? 'bg-accent-500/10' : q2.tone === 'wait' ? 'bg-wait-500/10' : q2.tone === 'gold' ? 'bg-gold-500/10' : 'bg-bear-500/10'} ${QUALITY_TONE_TEXT[ev.quality]}`}>
                        <SigIcon className="h-4 w-4" strokeWidth={2.5} />
                      </span>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">{signalDirLabel(h.finalSignal)} · {h.asset} · {h.timeframe}</div>
                        <div className="text-[11px] text-slate-600 tabular">{formatDateTime(h.createdAt)} · {formatPrice(h.asset, h.price)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-sm font-bold tabular ${QUALITY_TONE_TEXT[ev.quality]}`}>{ev.qualityScore}</div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-600">{q2.label}</div>
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
