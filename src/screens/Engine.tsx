import { useEffect, useMemo, useState } from 'react';
import type { Asset, Timeframe, EngineResult } from '@/types';
import { getMarketDataProvider } from '@/services/types';
import { useStore } from '@/store';
import { ASSET_LIST, TIMEFRAMES, formatPrice, formatDateTime } from '@/lib/assets';
import {
  CRITERION_META,
  META_BY_CRITERION,
  classifyScore,
  CLASSIFICATION_BANDS,
  scanEngine,
} from '@/lib/engine';
import { signalLabel } from '@/lib/indicators';
import { ArrowUpCircle, ArrowDownCircle, CircleDot, RefreshCw, TrendingUp, DollarSign, Cpu, ChevronRight } from 'lucide-react';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { ProgressBar } from '@/components/ui/ProgressBar';

const ASSET_ICON: Record<Asset, typeof TrendingUp> = { WIN: TrendingUp, WDO: DollarSign };

const CLASS_TONE: Record<string, { text: string; bg: string; ring: string; dot: string }> = {
  HIGH: { text: 'text-bull-400', bg: 'bg-bull-500/10', ring: 'ring-bull-500/40', dot: 'bg-bull-500' },
  GOOD: { text: 'text-bull-400', bg: 'bg-bull-500/10', ring: 'ring-bull-500/30', dot: 'bg-bull-500' },
  RISKY: { text: 'text-gold-400', bg: 'bg-gold-500/10', ring: 'ring-gold-500/30', dot: 'bg-gold-500' },
  AVOID: { text: 'text-bear-400', bg: 'bg-bear-500/10', ring: 'ring-bear-500/30', dot: 'bg-bear-500' },
};

interface EngineScreenProps {
  onGoToIntelligence: (asset: Asset) => void;
}

export default function EngineScreen({ onGoToIntelligence }: EngineScreenProps) {
  const provider = getMarketDataProvider();
  const { weights } = useStore();
  const [asset, setAsset] = useState<Asset>('WIN');
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [result, setResult] = useState<EngineResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      const quote = await provider.getQuote(asset);
      setResult(scanEngine(asset, timeframe, weights));
      void quote;
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, timeframe, weights]);

  const classification = useMemo(() => (result ? classifyScore(result.score) : null), [result]);
  const classTone = classification ? CLASS_TONE[classification.classification] : CLASS_TONE.AVOID;

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <div className="flex items-center gap-2">
          <Cpu className="h-5 w-5 text-accent-400" />
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">TradeVision Engine</h2>
            <p className="text-xs text-slate-500">Score inteligente de 0 a 100 por critérios ponderados</p>
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
          <RefreshCw className="h-4 w-4 animate-spin-slow" /> Calculando score...
        </div>
      ) : result && classification ? (
        <>
          {/* Final score + classification */}
          <section className="card animate-fade-up p-4 sm:p-5">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <ScoreGauge score={result.score} size={140} label="Score Final" />
              <div className="w-full flex-1 space-y-3">
                <div className={`rounded-xl ${classTone.bg} ring-1 ${classTone.ring} p-3.5`}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Classificação</div>
                  <div className={`mt-0.5 text-xl font-extrabold ${classTone.text}`}>{classification.label}</div>
                  <div className="text-[11px] text-slate-500 tabular">Faixa {classification.range} · {result.score}/100</div>
                </div>
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Confiança</span>
                    <span className="font-mono text-sm font-bold tabular text-white">{result.confidence}%</span>
                  </div>
                  <ProgressBar value={result.confidence} tone="accent" />
                </div>
              </div>
            </div>
          </section>

          {/* Classification bands */}
          <section className="animate-fade-up">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Faixas de classificação</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {CLASSIFICATION_BANDS.map((band) => {
                const tone = CLASS_TONE[band.classification];
                const isActive = band.classification === classification.classification;
                return (
                  <div key={band.classification} className={`rounded-xl border p-3 transition-all ${isActive ? `${tone.bg} border-current ${tone.text}` : 'border-white/[0.06] bg-ink-850/60 text-slate-500'}`}>
                    <div className={`text-[10px] font-bold tabular ${isActive ? tone.text : 'text-slate-600'}`}>{band.range}</div>
                    <div className={`mt-0.5 text-xs font-bold ${isActive ? tone.text : 'text-slate-400'}`}>{band.label}</div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Criterion breakdown */}
          <section className="animate-fade-up">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Critérios do Score</h3>
              <button onClick={run} className="flex items-center gap-1 text-[11px] font-semibold text-accent-400 hover:text-accent-300">
                <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin-slow' : ''}`} /> Recalcular
              </button>
            </div>
            <div className="grid gap-2.5">
              {result.criteria.map((c, i) => {
                const meta = META_BY_CRITERION[c.key];
                const pct = (c.points / c.maxPoints) * 100;
                const cfg = c.signal === 'BUY' ? { Icon: ArrowUpCircle, text: 'text-bull-400' } : c.signal === 'SELL' ? { Icon: ArrowDownCircle, text: 'text-bear-400' } : { Icon: CircleDot, text: 'text-wait-400' };
                return (
                  <div
                    key={c.key}
                    className="overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850/70 p-3.5 transition-all hover:border-white/[0.12]"
                    style={{ animation: 'fade-up 0.4s both', animationDelay: `${i * 50}ms` }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-white">{meta.label}</span>
                            <span className="text-[10px] font-semibold tabular text-slate-600">/ {meta.maxPoints} pts</span>
                          </div>
                          <div className="truncate text-[10px] text-slate-500">{meta.description}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span className={`flex items-center gap-1 text-[11px] font-bold ${cfg.text}`}>
                          <cfg.Icon className="h-3.5 w-3.5" /> {signalLabel(c.signal)}
                        </span>
                        <span className="font-mono text-base font-bold tabular text-white">{c.points}</span>
                      </div>
                    </div>
                    <div className="mt-2.5">
                      <ProgressBar value={pct} tone={c.signal === 'BUY' ? 'bull' : c.signal === 'SELL' ? 'bear' : 'wait'} height="sm" />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{c.detail}</p>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Total + signal + link to intelligence */}
          <section className="animate-fade-up">
            <div className="card flex items-center justify-between p-4">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Sinal do Engine</div>
                <div className={`mt-0.5 text-lg font-extrabold ${result.finalSignal === 'BUY' ? 'text-bull-400' : result.finalSignal === 'SELL' ? 'text-bear-400' : 'text-wait-400'}`}>
                  {result.finalSignal === 'BUY' ? 'COMPRA' : result.finalSignal === 'SELL' ? 'VENDA' : 'AGUARDAR'}
                </div>
                <div className="text-[11px] text-slate-500 tabular">{formatPrice(asset, result.price)} · {formatDateTime(result.createdAt)}</div>
              </div>
              <button onClick={() => onGoToIntelligence(asset)} className="flex items-center gap-1.5 rounded-lg bg-accent-500/10 px-3 py-2 text-xs font-bold text-accent-300 transition-colors hover:bg-accent-500/20">
                Central de Inteligência <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
