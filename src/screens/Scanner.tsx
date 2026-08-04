import { useEffect, useRef, useState } from 'react';
import type { ScanResult, ScanFilter } from '@/types';
import { scanAll, rankByScore, filterScans, FILTER_LABELS, trendLabel, signalShortLabel } from '@/lib/scanner';
import { formatPrice, formatTime } from '@/lib/assets';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Radar, TrendingUp, TrendingDown, Minus, ArrowUpCircle, ArrowDownCircle, CircleDot, RefreshCw, Activity, Trophy, Clock } from 'lucide-react';

const TREND_ICON = { ALTA: TrendingUp, BAIXA: TrendingDown, LATERAL: Minus };
const TREND_TONE = { ALTA: 'text-bull-400', BAIXA: 'text-bear-400', LATERAL: 'text-wait-400' };
const SIGNAL_TONE = { BUY: 'text-bull-400', SELL: 'text-bear-400', WAIT: 'text-wait-400' };
const SIGNAL_ICON = { BUY: ArrowUpCircle, SELL: ArrowDownCircle, WAIT: CircleDot };
const FILTERS: ScanFilter[] = ['ALL', 'STRONG', 'BUY', 'SELL'];

export default function Scanner() {
  const [results, setResults] = useState<ScanResult[]>([]);
  const [filter, setFilter] = useState<ScanFilter>('ALL');
  const [autoUpdate, setAutoUpdate] = useState(true);
  const [lastScan, setLastScan] = useState(0);
  const intervalRef = useRef<number | null>(null);

  function doScan() {
    setResults(scanAll());
    setLastScan(Date.now());
  }

  useEffect(() => { doScan(); }, []);

  useEffect(() => {
    if (!autoUpdate) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = window.setInterval(doScan, 4000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [autoUpdate]);

  const ranked = rankByScore(results);
  const filtered = filterScans(ranked, filter);
  const best = ranked[0] ?? null;

  return (
    <div className="space-y-5">
      <section className="animate-fade-up flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Radar className="h-5 w-5 text-accent-400" />
            <h2 className="text-lg font-extrabold tracking-tight text-white">Scanner Inteligente</h2>
          </div>
          <p className="text-xs text-slate-500">Monitorando WIN & WDO simultaneamente</p>
        </div>
        <button
          onClick={() => setAutoUpdate((v) => !v)}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition-colors ${autoUpdate ? 'bg-bull-500/10 text-bull-400' : 'bg-ink-800 text-slate-400'}`}
        >
          <span className={`h-2 w-2 rounded-full ${autoUpdate ? 'animate-pulse bg-bull-400' : 'bg-slate-600'}`} />
          {autoUpdate ? 'Auto' : 'Pausado'}
        </button>
      </section>

      {/* Best opportunity banner */}
      {best && (
        <section className="card animate-fade-up flex items-center gap-3 p-4 ring-1 ring-bull-500/20">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-bull-500/10 text-bull-400">
            <Trophy className="h-5 w-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Melhor oportunidade agora</div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-white">{best.asset}</span>
              <span className="text-xs text-slate-500">{best.name}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="font-mono text-xl font-bold tabular text-bull-400">{best.score}</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-600">score</div>
          </div>
        </section>
      )}

      {/* Filters */}
      <section className="animate-fade-up flex gap-1.5 overflow-x-auto no-scrollbar">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-all ${filter === f ? 'bg-accent-500 text-white' : 'bg-ink-850 text-slate-400 hover:bg-ink-800'}`}
          >
            {FILTER_LABELS[f]}
          </button>
        ))}
      </section>

      {/* Ranking list */}
      <section className="animate-fade-up space-y-3">
        {filtered.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm text-slate-500">Nenhum resultado para o filtro selecionado.</p>
          </div>
        ) : (
          filtered.map((r, idx) => {
            const TrendIcon = TREND_ICON[r.trend];
            const SigIcon = SIGNAL_ICON[r.signal];
            return (
              <div
                key={r.asset}
                className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-850/70 p-4 transition-all hover:border-white/[0.12]"
                style={{ animation: 'fade-up 0.4s both', animationDelay: `${idx * 60}ms` }}
              >
                {/* Header row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-7 w-7 place-items-center rounded-lg text-[10px] font-bold ${idx === 0 ? 'bg-bull-500/10 text-bull-400' : 'bg-ink-800 text-slate-500'}`}>
                      #{idx + 1}
                    </span>
                    <div>
                      <div className="text-sm font-bold text-white">{r.asset}</div>
                      <div className="text-[10px] text-slate-500">{r.name}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-mono text-base font-bold tabular text-white">{formatPrice(r.asset, r.price)}</div>
                    <div className={`text-[11px] font-semibold tabular ${r.changePct >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                      {r.changePct >= 0 ? '+' : ''}{r.changePct}%
                    </div>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="mt-3 grid grid-cols-4 gap-2">
                  <Stat label="Tendência" icon={TrendIcon} value={trendLabel(r.trend)} tone={TREND_TONE[r.trend]} />
                  <Stat label="Força" value={`${r.trendStrength}`} />
                  <Stat label="Volume" value={`${r.volumeRatio}x`} />
                  <Stat label="Sinal" icon={SigIcon} value={signalShortLabel(r.signal)} tone={SIGNAL_TONE[r.signal]} />
                </div>

                {/* Score bar */}
                <div className="mt-3">
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-600">Score</span>
                    <span className={`font-mono text-sm font-bold tabular ${r.score >= 62 ? 'text-bull-400' : r.score <= 38 ? 'text-bear-400' : 'text-wait-400'}`}>{r.score}/100</span>
                  </div>
                  <ProgressBar value={r.score} tone={r.score >= 62 ? 'bull' : r.score <= 38 ? 'bear' : 'wait'} height="sm" />
                </div>

                {/* Updated time */}
                <div className="mt-2 flex items-center gap-1 text-[10px] text-slate-600 tabular">
                  <Clock className="h-3 w-3" /> Atualizado às {formatTime(r.updatedAt)}
                </div>
              </div>
            );
          })
        )}
      </section>

      {/* Scan info */}
      <section className="card animate-fade-up flex items-center justify-between p-3.5">
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <Activity className="h-3.5 w-3.5 text-accent-400" />
          <span>{filtered.length} ativo{filtered.length !== 1 ? 's' : ''} · atualização a cada 4s</span>
        </div>
        <button onClick={doScan} className="flex items-center gap-1 text-[11px] font-bold text-accent-400 hover:text-accent-300">
          <RefreshCw className="h-3.5 w-3.5" /> Escanear agora
        </button>
      </section>
    </div>
  );
}

function Stat({ label, value, icon: Icon, tone }: { label: string; value: string; icon?: typeof TrendingUp; tone?: string }) {
  return (
    <div className="rounded-lg bg-ink-800/50 p-2">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-0.5 flex items-center gap-1 text-xs font-bold ${tone ?? 'text-slate-200'}`}>
        {Icon && <Icon className="h-3 w-3" />}{value}
      </div>
    </div>
  );
}
