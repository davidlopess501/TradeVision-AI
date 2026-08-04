import { useEffect, useMemo, useState } from 'react';
import type { ManagedOperation, OperationStatus, OperationPeriod, OperationSummary } from '@/types';
import {
  generateOperations,
  filterByPeriod,
  computeSummary,
  statusLabel,
  statusTone,
  statusBg,
  formatDuration,
} from '@/lib/operationsManager';
import { formatPrice, formatMoney, formatDateTime, formatTime } from '@/lib/assets';
import { Wallet, TrendingUp, TrendingDown, ArrowUpCircle, ArrowDownCircle, Clock, CheckCircle2, XCircle, Activity, Scale, Target } from 'lucide-react';

type Tab = OperationStatus | 'ALL';
const TABS: { id: Tab; label: string }[] = [
  { id: 'ALL', label: 'Todas' },
  { id: 'OPEN', label: 'Abertas' },
  { id: 'CLOSED', label: 'Encerradas' },
  { id: 'CANCELLED', label: 'Canceladas' },
];

const PERIODS: { id: OperationPeriod; label: string }[] = [
  { id: 'TODAY', label: 'Hoje' },
  { id: 'WEEK', label: 'Semana' },
  { id: 'MONTH', label: 'Mês' },
];

export default function OperationsManager() {
  const [allOps, setAllOps] = useState<ManagedOperation[]>([]);
  const [tab, setTab] = useState<Tab>('ALL');
  const [period, setPeriod] = useState<OperationPeriod>('WEEK');

  useEffect(() => { setAllOps(generateOperations()); }, []);

  const periodOps = useMemo(() => filterByPeriod(allOps, period), [allOps, period]);
  const tabOps = useMemo(() => {
    if (tab === 'ALL') return periodOps;
    return periodOps.filter((o) => o.status === tab);
  }, [periodOps, tab]);
  const summary: OperationSummary = useMemo(() => computeSummary(periodOps), [periodOps]);

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Gerenciador de Operações</h2>
        <p className="text-xs text-slate-500">Operações abertas, encerradas e canceladas</p>
      </section>

      {/* Financial summary */}
      <section className="animate-fade-up grid grid-cols-2 gap-3 sm:grid-cols-4">
        <SummaryCard icon={Wallet} label="Resultado líquido" value={formatMoney(summary.netPnl)} tone={summary.netPnl >= 0 ? 'bull' : 'bear'} />
        <SummaryCard icon={Activity} label="Total" value={`${summary.total}`} />
        <SummaryCard icon={Target} label="Taxa de acerto" value={`${summary.winRate.toFixed(0)}%`} tone={summary.winRate >= 50 ? 'bull' : 'wait'} />
        <SummaryCard icon={Scale} label="Acertos/Perdas" value={`${summary.wins}/${summary.losses}`} />
      </section>

      {/* Period filter */}
      <section className="animate-fade-up flex gap-1.5 rounded-lg border border-white/[0.06] bg-ink-850/60 p-1.5">
        {PERIODS.map((p) => (
          <button key={p.id} onClick={() => setPeriod(p.id)} className={`flex-1 rounded-md px-2 py-2 text-xs font-bold transition-all ${period === p.id ? 'bg-accent-500 text-white' : 'text-slate-400 hover:bg-ink-800'}`}>
            {p.label}
          </button>
        ))}
      </section>

      {/* Status tabs */}
      <section className="animate-fade-up flex gap-1.5 overflow-x-auto no-scrollbar">
        {TABS.map((t) => {
          const count = t.id === 'ALL' ? periodOps.length : periodOps.filter((o) => o.status === t.id).length;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-full px-3.5 py-2 text-xs font-bold transition-all ${tab === t.id ? 'bg-accent-500 text-white' : 'bg-ink-850 text-slate-400 hover:bg-ink-800'}`}
            >
              {t.label} <span className="tabular opacity-70">({count})</span>
            </button>
          );
        })}
      </section>

      {/* Operation cards */}
      <section className="animate-fade-up space-y-2.5">
        {tabOps.length === 0 ? (
          <div className="card py-12 text-center">
            <p className="text-sm text-slate-500">Nenhuma operação encontrada.</p>
          </div>
        ) : (
          tabOps.slice(0, 30).map((op, idx) => {
            const DirIcon = op.direction === 'BUY' ? ArrowUpCircle : ArrowDownCircle;
            const dirTone = op.direction === 'BUY' ? 'text-bull-400' : 'text-bear-400';
            return (
              <div
                key={op.id}
                className="overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850/70 p-3.5 transition-all hover:border-white/[0.10]"
                style={{ animation: 'fade-up 0.35s both', animationDelay: `${Math.min(idx, 8) * 40}ms` }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className={`grid h-8 w-8 place-items-center rounded-lg ${op.direction === 'BUY' ? 'bg-bull-500/10' : 'bg-bear-500/10'}`}>
                      <DirIcon className={`h-4 w-4 ${dirTone}`} />
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white">{op.asset}</span>
                        <span className={`text-[10px] font-bold ${dirTone}`}>{op.direction === 'BUY' ? 'COMPRA' : 'VENDA'}</span>
                      </div>
                      <div className="text-[10px] text-slate-600 tabular">{formatDateTime(op.openTime)}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    {op.status === 'CLOSED' ? (
                      <>
                        <div className={`font-mono text-sm font-bold tabular ${op.pnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                          {op.pnl >= 0 ? '+' : ''}{formatMoney(op.pnl)}
                        </div>
                        <div className="text-[10px] text-slate-600 tabular">{op.points > 0 ? '+' : ''}{op.points} pts</div>
                      </>
                    ) : (
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusBg(op.status)} ${statusTone(op.status)}`}>
                        {statusLabel(op.status)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Details grid */}
                <div className="mt-2.5 grid grid-cols-3 gap-2 text-[10px] tabular">
                  <Field label="Entrada" value={formatPrice(op.asset, op.entry)} />
                  <Field label="Stop" value={formatPrice(op.asset, op.stop)} tone="bear" />
                  <Field label="Alvo" value={formatPrice(op.asset, op.target)} tone="bull" />
                </div>

                {/* Footer */}
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="flex items-center gap-1 text-slate-500">
                    <Clock className="h-3 w-3" /> {formatDuration(op.durationMin)}
                  </span>
                  <span className="flex items-center gap-1.5">
                    {op.status === 'CLOSED' && (
                      <span className={`flex items-center gap-1 ${op.pnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                        {op.pnl >= 0 ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                        {op.closeReason}
                      </span>
                    )}
                    {op.status === 'CANCELLED' && (
                      <span className="flex items-center gap-1 text-wait-400">
                        <XCircle className="h-3.5 w-3.5" /> {op.closeReason}
                      </span>
                    )}
                    {op.status === 'OPEN' && (
                      <span className="flex items-center gap-1 text-accent-400">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-accent-400" /> Em andamento
                      </span>
                    )}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </section>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, value, tone }: { icon: typeof Wallet; label: string; value: string; tone?: 'bull' | 'bear' | 'wait' }) {
  return (
    <div className="card p-3.5">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-1.5 font-mono text-base font-bold tabular ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : tone === 'wait' ? 'text-wait-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function Field({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' }) {
  return (
    <div className="rounded-lg bg-ink-800/50 p-2">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-0.5 font-mono text-[11px] font-semibold ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-slate-300'}`}>{value}</div>
    </div>
  );
}
