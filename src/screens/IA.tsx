import { useEffect, useState } from 'react';
import type { Asset, Timeframe, AnalysisResult } from '@/types';
import { getMarketDataProvider } from '@/services/types';
import { useStore } from '@/store';
import { buildAIExplanation } from '@/lib/ai';
import { META_BY_KEY, signalLabel } from '@/lib/indicators';
import { ASSET_LIST, TIMEFRAMES, formatDateTime, formatPrice } from '@/lib/assets';
import { Sparkles, Brain, RefreshCw, TrendingUp, DollarSign, ArrowUpCircle, ArrowDownCircle, CircleDot } from 'lucide-react';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { ProgressBar } from '@/components/ui/ProgressBar';

const ASSET_ICON: Record<Asset, typeof TrendingUp> = { WIN: TrendingUp, WDO: DollarSign };

interface IAProps {
  initialAsset: Asset;
}

export default function IA({ initialAsset }: IAProps) {
  const provider = getMarketDataProvider();
  const { history } = useStore();
  const [asset, setAsset] = useState<Asset>(initialAsset);
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    try {
      setResult(await provider.analyze(asset, timeframe));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, timeframe]);

  const ai = result ? buildAIExplanation(result) : null;
  const assetHistory = history.filter((h) => h.asset === asset).slice(0, 6);

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-accent-400" />
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">IA</h2>
            <p className="text-xs text-slate-500">Explicação da decisão e histórico</p>
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
          <RefreshCw className="h-4 w-4 animate-spin-slow" /> Processando IA...
        </div>
      ) : result && ai ? (
        <>
          <section className="card animate-fade-up p-4 sm:p-5">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-accent-400" />
              <h3 className="text-sm font-bold text-white">Score da IA</h3>
            </div>
            <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
              <ScoreGauge score={ai.score} size={120} label="IA Score" />
              <div className="w-full flex-1 space-y-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Confiança</span>
                    <span className="font-mono text-sm font-bold tabular text-white">{ai.confidence}%</span>
                  </div>
                  <ProgressBar value={ai.confidence} tone="accent" />
                </div>
                <div className="rounded-lg bg-ink-800/60 p-3">
                  <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Sinal atual</div>
                  <div className={`mt-0.5 text-lg font-extrabold ${result.finalSignal === 'BUY' ? 'text-bull-400' : result.finalSignal === 'SELL' ? 'text-bear-400' : 'text-wait-400'}`}>
                    {result.finalSignal === 'BUY' ? 'COMPRA' : result.finalSignal === 'SELL' ? 'VENDA' : 'AGUARDAR'}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Reasoning */}
          <section className="card animate-fade-up p-4 sm:p-5">
            <h3 className="mb-2 text-sm font-bold text-white">Motivo do sinal</h3>
            <p className="text-sm leading-relaxed text-slate-300">{ai.reasoning}</p>
          </section>

          {/* Contributing indicators */}
          <section className="animate-fade-up">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Indicadores que contribuíram</h3>
            <div className="space-y-2">
              {ai.contributingIndicators.map((c) => {
                const meta = META_BY_KEY[c.key];
                const ind = result.indicators.find((i) => i.key === c.key);
                const cfg = ind?.signal === 'BUY' ? { Icon: ArrowUpCircle, text: 'text-bull-400' } : ind?.signal === 'SELL' ? { Icon: ArrowDownCircle, text: 'text-bear-400' } : { Icon: CircleDot, text: 'text-wait-400' };
                return (
                  <div key={c.key} className="card flex items-center gap-3 p-3.5">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-[10px] font-bold text-accent-300">{meta.abbr}</span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-bold text-white">{meta.label}</span>
                        <span className={`flex items-center gap-1 text-xs font-bold ${cfg.text}`}>
                          <cfg.Icon className="h-3.5 w-3.5" /> {signalLabel(ind?.signal ?? 'WAIT')}
                        </span>
                      </div>
                      <p className="truncate text-[11px] text-slate-500">{c.note}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <div className="font-mono text-sm font-bold tabular text-white">{c.weight}%</div>
                      <div className="text-[9px] uppercase tracking-wider text-slate-600">peso</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      ) : null}

      {/* History */}
      <section className="animate-fade-up pb-2">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Histórico de análises</h3>
        <div className="card overflow-hidden">
          {assetHistory.length === 0 ? (
            <p className="py-8 text-center text-xs text-slate-600">Nenhuma análise registrada para {asset}.</p>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {assetHistory.map((h) => (
                <li key={h.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg text-[11px] font-bold ${h.finalSignal === 'BUY' ? 'bg-bull-500/10 text-bull-400' : h.finalSignal === 'SELL' ? 'bg-bear-500/10 text-bear-400' : 'bg-wait-500/10 text-wait-400'}`}>
                      {h.finalSignal === 'BUY' ? 'C' : h.finalSignal === 'SELL' ? 'V' : 'A'}
                    </span>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{h.finalSignal === 'BUY' ? 'COMPRA' : h.finalSignal === 'SELL' ? 'VENDA' : 'AGUARDAR'} · {h.timeframe}</div>
                      <div className="text-[11px] text-slate-600 tabular">{formatDateTime(h.createdAt)} · {formatPrice(h.asset, h.price)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-sm font-bold tabular text-white">{h.aiScore}</div>
                    <div className="text-[9px] uppercase tracking-wider text-slate-600">IA</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
