import { useState } from 'react';
import { useStore } from '@/store';
import { computeStats, equityCurve } from '@/lib/stats';
import { formatMoney, formatDateTime, formatPrice } from '@/lib/assets';
import { Sparkline } from '@/components/ui/Sparkline';
import { Target, TrendingUp, Activity, TrendingDown, Scale, Wallet, Flame, Trophy } from 'lucide-react';

type Filter = 'today' | '7d' | '30d' | 'all';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'all', label: 'Todos' },
];

const DAY = 24 * 60 * 60 * 1000;

export default function Backtest() {
  const { trades } = useStore();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = trades.filter((t) => {
    if (filter === 'all') return true;
    const span = filter === 'today' ? DAY : filter === '7d' ? 7 * DAY : 30 * DAY;
    return Date.now() - t.createdAt <= span;
  });
  const stats = computeStats(filtered);
  const curve = equityCurve(filtered);

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Backtest</h2>
        <p className="text-xs text-slate-500">Desempenho histórico das operações simuladas</p>
      </section>

      {/* Filters */}
      <section className="animate-fade-up flex gap-1.5 rounded-lg border border-white/[0.06] bg-ink-850/60 p-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`flex-1 rounded-md px-2 py-2 text-xs font-bold transition-all ${filter === f.value ? 'bg-accent-500 text-white' : 'text-slate-400 hover:bg-ink-800'}`}
          >
            {f.label}
          </button>
        ))}
      </section>

      {/* Equity curve */}
      <section className="card animate-fade-up p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Lucro acumulado</h3>
            <p className="text-[11px] text-slate-500 tabular">{filtered.length} operações</p>
          </div>
          <span className={`font-mono text-lg font-bold tabular ${stats.cumulativePnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
            {stats.cumulativePnl >= 0 ? '+' : ''}{formatMoney(stats.cumulativePnl)}
          </span>
        </div>
        <div className="mt-3">
          <Sparkline points={curve.length > 1 ? curve : [{ x: 0, y: 0 }, { x: 1, y: stats.cumulativePnl }]} width={340} height={90} positive={stats.cumulativePnl >= 0} className="w-full" />
        </div>
      </section>

      {/* Metrics */}
      <section className="animate-fade-up grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Metric icon={Target} label="Taxa de acerto" value={`${stats.winRate.toFixed(1)}%`} tone={stats.winRate >= 50 ? 'bull' : 'bear'} />
        <Metric icon={Activity} label="Operações" value={`${stats.totalTrades}`} />
        <Metric icon={Wallet} label="Lucro acumulado" value={formatMoney(stats.cumulativePnl)} tone={stats.cumulativePnl >= 0 ? 'bull' : 'bear'} />
        <Metric icon={TrendingDown} label="Drawdown máximo" value={formatMoney(stats.maxDrawdown)} tone="bear" />
        <Metric icon={Scale} label="Risco x Retorno" value={`1:${stats.rewardRiskRatio.toFixed(1)}`} />
        <Metric icon={TrendingUp} label="Profit Factor" value={stats.profitFactor.toFixed(2)} tone={stats.profitFactor >= 1 ? 'bull' : 'bear'} />
      </section>

      {/* Streaks */}
      <section className="animate-fade-up grid grid-cols-2 gap-3">
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-bull-500/10 text-bull-400"><Trophy className="h-5 w-5" /></span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Melhor sequência de ganhos</div>
            <div className="font-mono text-lg font-bold tabular text-bull-400">{stats.bestWinStreak}</div>
          </div>
        </div>
        <div className="card flex items-center gap-3 p-4">
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-bear-500/10 text-bear-400"><Flame className="h-5 w-5" /></span>
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Maior sequência de perdas</div>
            <div className="font-mono text-lg font-bold tabular text-bear-400">{stats.worstLossStreak}</div>
          </div>
        </div>
      </section>

      {/* Trade history */}
      <section className="animate-fade-up pb-2">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Histórico de operações</h3>
        <div className="card overflow-hidden">
          {filtered.length === 0 ? (
            <p className="py-10 text-center text-xs text-slate-600">Nenhuma operação no período selecionado.</p>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {filtered.slice(0, 30).map((t) => (
                <li key={t.id} className="px-4 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`grid h-8 w-8 place-items-center rounded-lg text-[10px] font-bold ${t.direction === 'BUY' ? 'bg-bull-500/10 text-bull-400' : 'bg-bear-500/10 text-bear-400'}`}>
                        {t.direction === 'BUY' ? 'C' : 'V'}
                      </span>
                      <div>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-200">
                          {t.asset} · {t.direction === 'BUY' ? 'Compra' : 'Venda'}
                          <span className={`rounded px-1.5 py-0.5 text-[9px] font-bold ${t.result === 'WIN' ? 'bg-bull-500/15 text-bull-400' : t.result === 'LOSS' ? 'bg-bear-500/15 text-bear-400' : 'bg-wait-500/15 text-wait-400'}`}>
                            {t.result === 'WIN' ? 'GANHO' : t.result === 'LOSS' ? 'PERDA' : 'BE'}
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-600 tabular">{formatDateTime(t.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-mono text-sm font-bold tabular ${t.pnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                        {t.pnl >= 0 ? '+' : ''}{formatMoney(t.pnl)}
                      </div>
                      <div className="text-[10px] text-slate-600 tabular">{t.points > 0 ? '+' : ''}{t.points} pts</div>
                    </div>
                  </div>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] tabular">
                    <Cell label="Entrada" value={formatPrice(t.asset, t.entry)} />
                    <Cell label="Stop" value={formatPrice(t.asset, t.stop)} tone="bear" />
                    <Cell label="Alvo" value={formatPrice(t.asset, t.target)} tone="bull" />
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

function Cell({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' }) {
  return (
    <div className="rounded bg-ink-800/50 px-2 py-1">
      <span className="text-slate-600">{label}: </span>
      <span className={`font-semibold ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-slate-400'}`}>{value}</span>
    </div>
  );
}
