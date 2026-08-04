import { useEffect, useMemo, useState } from 'react';
import type { ProPanelData, MarketQuality } from '@/types';
import { buildProPanel, classifyMarket, MARKET_BANDS } from '@/lib/simulation';
import { formatMoney, formatDate } from '@/lib/assets';
import { Sparkline } from '@/components/ui/Sparkline';
import { Wallet, TrendingUp, Calendar, Activity, Target, Scale, TrendingDown, Gauge, Brain, RefreshCw } from 'lucide-react';

const QUALITY_TONE: Record<MarketQuality, { text: string; bg: string; ring: string; arc: string }> = {
  EXCELLENT: { text: 'text-bull-400', bg: 'bg-bull-500/10', ring: 'ring-bull-500/40', arc: '#10b981' },
  GOOD: { text: 'text-accent-400', bg: 'bg-accent-500/10', ring: 'ring-accent-500/40', arc: '#0ea5e9' },
  NEUTRAL: { text: 'text-wait-400', bg: 'bg-wait-500/10', ring: 'ring-wait-500/30', arc: '#94a3b8' },
  RISKY: { text: 'text-gold-400', bg: 'bg-gold-500/10', ring: 'ring-gold-500/30', arc: '#f59e0b' },
  VERY_RISKY: { text: 'text-bear-400', bg: 'bg-bear-500/10', ring: 'ring-bear-500/30', arc: '#ef4444' },
};

const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

export default function ProPanel() {
  const [data, setData] = useState<ProPanelData | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    setTimeout(() => {
      setData(buildProPanel());
      setLoading(false);
    }, 350);
  }

  useEffect(() => { load(); }, []);

  const quality = useMemo(() => (data ? classifyMarket(data.marketQualityScore) : null), [data]);
  const qTone = data ? QUALITY_TONE[data.marketQuality] : QUALITY_TONE.NEUTRAL;

  if (loading || !data || !quality) {
    return (
      <div className="flex items-center justify-center py-24">
        <RefreshCw className="h-5 w-5 animate-spin-slow text-accent-400" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="animate-fade-up flex items-end justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-white">Painel Profissional</h2>
          <p className="text-xs text-slate-500">Visão completa do desempenho</p>
        </div>
        <button onClick={load} className="flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-1.5 text-xs font-bold text-slate-300 transition-colors hover:bg-ink-750">
          <RefreshCw className="h-3.5 w-3.5" /> Atualizar
        </button>
      </section>

      {/* KPI cards */}
      <section className="animate-fade-up grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi icon={Wallet} label="Capital" value={formatMoney(data.capital)} />
        <Kpi icon={TrendingUp} label="Lucro do dia" value={data.dayPnl >= 0 ? `+${formatMoney(data.dayPnl)}` : formatMoney(data.dayPnl)} tone={data.dayPnl >= 0 ? 'bull' : 'bear'} />
        <Kpi icon={Calendar} label="Lucro da semana" value={data.weekPnl >= 0 ? `+${formatMoney(data.weekPnl)}` : formatMoney(data.weekPnl)} tone={data.weekPnl >= 0 ? 'bull' : 'bear'} />
        <Kpi icon={TrendingUp} label="Lucro do mês" value={data.monthPnl >= 0 ? `+${formatMoney(data.monthPnl)}` : formatMoney(data.monthPnl)} tone={data.monthPnl >= 0 ? 'bull' : 'bear'} />
        <Kpi icon={Activity} label="Operações" value={`${data.totalTrades}`} />
        <Kpi icon={Target} label="Taxa de acerto" value={`${data.winRate.toFixed(0)}%`} tone={data.winRate >= 50 ? 'bull' : 'bear'} />
        <Kpi icon={Scale} label="Profit Factor" value={data.profitFactor.toFixed(2)} tone={data.profitFactor >= 1 ? 'bull' : 'bear'} />
        <Kpi icon={TrendingDown} label="Drawdown" value={formatMoney(data.maxDrawdown)} tone="bear" />
      </section>

      {/* Market speedometer */}
      <section className={`card animate-fade-up p-5 ring-1 ${qTone.ring}`}>
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <Speedometer score={data.marketQualityScore} arc={qTone.arc} />
          <div className="w-full flex-1 space-y-3">
            <div className={`rounded-xl ${qTone.bg} p-4 text-center sm:text-left`}>
              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Qualidade atual do mercado</div>
              <div className={`mt-0.5 text-xl font-extrabold ${qTone.text}`}>{quality.label}</div>
              <div className="text-[11px] text-slate-500 tabular">Score {data.marketQualityScore}/100</div>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {MARKET_BANDS.map((b) => {
                const isActive = b.quality === data.marketQuality;
                const toneCls = b.tone === 'bull' ? 'text-bull-400' : b.tone === 'accent' ? 'text-accent-400' : b.tone === 'wait' ? 'text-wait-400' : b.tone === 'gold' ? 'text-gold-400' : 'text-bear-400';
                return (
                  <div key={b.quality} className={`rounded-md p-1.5 text-center transition-all ${isActive ? 'bg-white/5 ring-1 ring-white/10' : 'opacity-50'}`}>
                    <div className={`text-[9px] font-bold ${toneCls}`}>{b.label}</div>
                    <div className="text-[8px] tabular text-slate-600">{b.range}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Equity + weekly charts */}
      <section className="grid gap-3 sm:grid-cols-2 animate-fade-up">
        <div className="card p-4">
          <h3 className="text-sm font-bold text-white">Evolução do capital</h3>
          <p className="text-[11px] text-slate-500">Últimos 30 pregões</p>
          <div className="mt-2">
            <Sparkline points={data.equityCurve} width={280} height={90} positive={data.capital >= 10000} className="w-full" />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-sm font-bold text-white">Evolução semanal</h3>
          <p className="text-[11px] text-slate-500">Acumulado últimos 7 dias</p>
          <div className="mt-2">
            <Sparkline points={data.weeklyCurve} width={280} height={90} positive={data.weekPnl >= 0} className="w-full" />
          </div>
        </div>
      </section>

      {/* Calendar */}
      <section className="card animate-fade-up p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Calendário de resultados</h3>
          <div className="flex items-center gap-3 text-[10px]">
            <span className="flex items-center gap-1 text-slate-500"><span className="h-2.5 w-2.5 rounded bg-bull-500" /> Positivo</span>
            <span className="flex items-center gap-1 text-slate-500"><span className="h-2.5 w-2.5 rounded bg-bear-500" /> Negativo</span>
            <span className="flex items-center gap-1 text-slate-500"><span className="h-2.5 w-2.5 rounded bg-ink-700" /> Sem op.</span>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {WEEKDAYS.map((d, i) => (
            <div key={i} className="text-center text-[9px] font-bold uppercase text-slate-600">{d}</div>
          ))}
          {/* offset first day to align weekday */}
          {(() => {
            const firstDate = new Date(data.calendar[0].date);
            const offset = firstDate.getDay();
            const cells: React.ReactNode[] = [];
            for (let i = 0; i < offset; i++) cells.push(<div key={`e-${i}`} />);
            data.calendar.forEach((day) => {
              const hasTrades = day.trades > 0;
              const tone = !hasTrades ? 'bg-ink-800 text-slate-600' : day.win ? 'bg-bull-500/15 text-bull-300 ring-1 ring-bull-500/20' : 'bg-bear-500/15 text-bear-300 ring-1 ring-bear-500/20';
              cells.push(
                <div key={day.date} className={`relative rounded-lg p-1.5 text-center ${tone}`}>
                  <div className="text-[10px] font-bold tabular">{new Date(day.date).getDate()}</div>
                  {hasTrades && <div className="text-[8px] tabular opacity-80">{day.pnl >= 0 ? '+' : ''}{Math.round(day.pnl)}</div>}
                </div>,
              );
            });
            return cells;
          })()}
        </div>
      </section>

      {/* AI Summary */}
      <section className="card animate-fade-up p-4 sm:p-5">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-bold text-white">Resumo da IA</h3>
        </div>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{data.aiSummary}</p>
        <div className="mt-3 flex items-center gap-2 text-[11px] text-slate-600">
          <Gauge className="h-3.5 w-3.5" /> Análise gerada com base no desempenho do dia · {formatDate(Date.now())}
        </div>
      </section>
    </div>
  );
}

function Kpi({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: string; tone?: 'bull' | 'bear' }) {
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

/** Half-gauge speedometer for market quality 0..100. */
function Speedometer({ score, arc }: { score: number; arc: string }) {
  const size = 150;
  const stroke = 12;
  const r = (size - stroke) / 2;
  const cx = size / 2;
  const cy = size / 2;
  // Half circle: 180 degrees
  const circ = Math.PI * r;
  const pct = Math.max(0, Math.min(100, score));
  const offset = circ - (pct / 100) * circ;

  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size / 2 + 20 }}>
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
          strokeLinecap="round"
        />
        <path
          d={`M ${stroke / 2} ${cy} A ${r} ${r} 0 0 1 ${size - stroke / 2} ${cy}`}
          fill="none"
          stroke={arc}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.22,1,0.36,1)', filter: `drop-shadow(0 0 5px ${arc}66)` }}
        />
        {/* needle */}
        <line
          x1={cx}
          y1={cy}
          x2={cx + Math.cos(Math.PI - (pct / 100) * Math.PI) * (r - 4)}
          y2={cy - Math.sin(Math.PI - (pct / 100) * Math.PI) * (r - 4)}
          stroke={arc}
          strokeWidth="2.5"
          strokeLinecap="round"
          style={{ transition: 'all 1s cubic-bezier(0.22,1,0.36,1)' }}
        />
        <circle cx={cx} cy={cy} r="4" fill={arc} />
      </svg>
      <div className="absolute bottom-0 flex flex-col items-center">
        <span className="font-mono text-2xl font-bold tabular text-white">{pct}</span>
        <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">Mercado</span>
      </div>
    </div>
  );
}
