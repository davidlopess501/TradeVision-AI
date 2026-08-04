import { useEffect, useRef, useState } from 'react';
import type { Asset, SimOperation } from '@/types';
import { ASSET_LIST, formatMoney, formatPrice, formatTime } from '@/lib/assets';
import { genSimOperation, formatDuration } from '@/lib/simulation';
import { Sparkline } from '@/components/ui/Sparkline';
import { Play, Square, TrendingUp, DollarSign, Clock, Timer, ArrowUpCircle, ArrowDownCircle, CheckCircle2, XCircle, MinusCircle, History } from 'lucide-react';

const ASSET_ICON: Record<Asset, typeof TrendingUp> = { WIN: TrendingUp, WDO: DollarSign };

type Phase = 'idle' | 'running' | 'done';

interface LiveOp {
  op: SimOperation;
  status: 'open' | 'closed';
}

export default function Simulation() {
  const [asset, setAsset] = useState<Asset>('WIN');
  const [phase, setPhase] = useState<Phase>('idle');
  const [operations, setOperations] = useState<SimOperation[]>([]);
  const [current, setCurrent] = useState<SimOperation | null>(null);
  const [daysSimulated, setDaysSimulated] = useState(0);
  const [dayProgress, setDayProgress] = useState(0);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);

  useEffect(() => () => {
    timersRef.current.forEach(clearTimeout);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  function clearTimers() {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function startSimulation() {
    clearTimers();
    setPhase('running');
    setOperations([]);
    setCurrent(null);
    setDaysSimulated(0);
    setDayProgress(0);

    const totalDays = 5;
    const opsPerDay = 3;
    const opDelay = 1800; // ms between operations

    let opIndex = 0;
    let dayIndex = 0;

    function scheduleNext() {
      if (dayIndex >= totalDays) {
        setPhase('done');
        setCurrent(null);
        return;
      }
      const id = window.setTimeout(() => {
        const seed = Math.floor(Date.now() / 1000) + opIndex * 31;
        const op = genSimOperation(asset, dayIndex, opIndex % opsPerDay, seed);
        setCurrent(op);
        setOperations((prev) => [op, ...prev]);
        opIndex++;
        if (opIndex % opsPerDay === 0) {
          dayIndex++;
          setDaysSimulated(dayIndex);
          setDayProgress(0);
        } else {
          setDayProgress((opIndex % opsPerDay) / opsPerDay * 100);
        }
        scheduleNext();
      }, opDelay);
      timersRef.current.push(id);
    }
    scheduleNext();
  }

  function stopSimulation() {
    clearTimers();
    setPhase('done');
    setCurrent(null);
  }

  const totalPnl = operations.reduce((a, b) => a + b.pnl, 0);
  const wins = operations.filter((o) => o.result === 'WIN').length;
  const losses = operations.filter((o) => o.result === 'LOSS').length;
  const equityPts = [{ x: 0, y: 0 }, ...operations.slice().reverse().map((o, i) => ({ x: i + 1, y: operations.slice(0, i + 1).reduce((a, b) => a + b.pnl, 0) }))];

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Modo Simulação</h2>
        <p className="text-xs text-slate-500">Treine sem operar dinheiro real</p>
      </section>

      {/* Asset selector */}
      <section className="animate-fade-up grid grid-cols-2 gap-2">
        {ASSET_LIST.map((a) => {
          const Icon = ASSET_ICON[a.code];
          const isActive = asset === a.code;
          return (
            <button key={a.code} disabled={phase === 'running'} onClick={() => setAsset(a.code)} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all ${isActive ? 'border-accent-500/60 bg-accent-500/10' : 'border-white/[0.06] bg-ink-850/60 hover:bg-ink-800'} ${phase === 'running' ? 'opacity-50' : ''}`}>
              <Icon className={`h-4 w-4 ${isActive ? 'text-accent-300' : 'text-slate-500'}`} />
              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{a.code}</span>
            </button>
          );
        })}
      </section>

      {/* Start/Stop button */}
      <section className="animate-fade-up">
        {phase !== 'running' ? (
          <button onClick={startSimulation} className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 px-5 py-4 text-white shadow-lg shadow-accent-500/20 transition-all active:scale-[0.99]">
            <div className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />
            <Play className="h-5 w-5" fill="currentColor" strokeWidth={2} />
            <span className="text-sm font-bold tracking-wide">Iniciar Simulação</span>
          </button>
        ) : (
          <button onClick={stopSimulation} className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-bear-500/15 px-5 py-4 text-bear-400 shadow-lg shadow-bear-500/10 transition-all active:scale-[0.99]">
            <Square className="h-5 w-5" fill="currentColor" strokeWidth={2} />
            <span className="text-sm font-bold tracking-wide">Encerrar Simulação</span>
          </button>
        )}
      </section>

      {/* Day counter */}
      {(phase === 'running' || phase === 'done') && (
        <section className="card animate-fade-up p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-accent-400" />
              <span className="text-sm font-bold text-white">Dias simulados</span>
            </div>
            <span className="font-mono text-2xl font-bold tabular text-accent-300">{daysSimulated}</span>
          </div>
          {phase === 'running' && (
            <div className="mt-2.5">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
                <div className="h-full rounded-full bg-accent-500 transition-all duration-500" style={{ width: `${dayProgress}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-slate-600">Simulando pregão {daysSimulated + 1}...</p>
            </div>
          )}
        </section>
      )}

      {/* Current operation */}
      {current && phase === 'running' && (
        <section className="card animate-fade-up overflow-hidden p-4 ring-1 ring-accent-500/20">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-accent-400 animate-pulse-ring" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-400" />
              </span>
              <h3 className="text-sm font-bold text-white">Operação em andamento</h3>
            </div>
            <span className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${current.direction === 'BUY' ? 'bg-bull-500/10 text-bull-400' : 'bg-bear-500/10 text-bear-400'}`}>
              {current.direction === 'BUY' ? 'COMPRA' : 'VENDA'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Field label="Ativo" value={current.asset} icon={DollarSign} />
            <Field label="Horário" value={formatTime(current.openTime)} icon={Clock} />
            <Field label="Tipo" value={current.direction === 'BUY' ? 'Compra' : 'Venda'} icon={current.direction === 'BUY' ? ArrowUpCircle : ArrowDownCircle} />
            <Field label="Entrada" value={formatPrice(current.asset, current.entry)} />
            <Field label="Stop" value={formatPrice(current.asset, current.stop)} tone="bear" />
            <Field label="Alvo" value={formatPrice(current.asset, current.target)} tone="bull" />
            <Field label="Tempo" value={formatDuration(current.durationMin)} icon={Timer} />
          </div>
        </section>
      )}

      {/* Summary when done */}
      {phase === 'done' && operations.length > 0 && (
        <>
          <section className="card animate-fade-up p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">Resultado da simulação</h3>
              <span className={`font-mono text-lg font-bold tabular ${totalPnl >= 0 ? 'text-bull-400' : 'text-bear-400'}`}>
                {totalPnl >= 0 ? '+' : ''}{formatMoney(totalPnl)}
              </span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-3">
              <Mini label="Operações" value={`${operations.length}`} />
              <Mini label="Ganhos" value={`${wins}`} tone="bull" />
              <Mini label="Perdas" value={`${losses}`} tone="bear" />
            </div>
            {equityPts.length > 2 && (
              <div className="mt-3">
                <Sparkline points={equityPts} width={340} height={80} positive={totalPnl >= 0} className="w-full" />
              </div>
            )}
          </section>
        </>
      )}

      {/* Timeline */}
      {operations.length > 0 && (
        <section className="animate-fade-up pb-2">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Linha do tempo das operações</h3>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-px bg-white/[0.06]" />
            <ul className="space-y-2.5">
              {operations.map((op) => {
                const ResIcon = op.result === 'WIN' ? CheckCircle2 : op.result === 'LOSS' ? XCircle : MinusCircle;
                const resText = op.result === 'WIN' ? 'text-bull-400' : op.result === 'LOSS' ? 'text-bear-400' : 'text-wait-400';
                return (
                  <li key={op.id} className="relative pl-10">
                    <span className={`absolute left-2 top-1 grid h-5 w-5 place-items-center rounded-full ${op.result === 'WIN' ? 'bg-bull-500/15' : op.result === 'LOSS' ? 'bg-bear-500/15' : 'bg-wait-500/15'}`}>
                      <ResIcon className={`h-3.5 w-3.5 ${resText}`} strokeWidth={2.5} />
                    </span>
                    <div className="card p-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${op.direction === 'BUY' ? 'bg-bull-500/10 text-bull-400' : 'bg-bear-500/10 text-bear-400'}`}>
                            {op.direction === 'BUY' ? 'COMPRA' : 'VENDA'}
                          </span>
                          <span className="text-xs font-semibold text-slate-200">{op.asset}</span>
                          <span className="text-[10px] text-slate-600 tabular">{formatTime(op.openTime)} · {formatDuration(op.durationMin)}</span>
                        </div>
                        <span className={`font-mono text-sm font-bold tabular ${resText}`}>
                          {op.pnl >= 0 ? '+' : ''}{formatMoney(op.pnl)}
                        </span>
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-2 text-[10px] tabular">
                        <span className="text-slate-600">Entrada <span className="font-semibold text-slate-400">{formatPrice(op.asset, op.entry)}</span></span>
                        <span className="text-slate-600">Stop <span className="font-semibold text-bear-400">{formatPrice(op.asset, op.stop)}</span></span>
                        <span className="text-slate-600">Alvo <span className="font-semibold text-bull-400">{formatPrice(op.asset, op.target)}</span></span>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px]">
                        <span className="text-slate-500">Encerramento: <span className="font-semibold text-slate-300">{op.closeReason}</span></span>
                        <span className={`font-bold ${resText}`}>{op.result === 'WIN' ? 'GANHO' : op.result === 'LOSS' ? 'PERDA' : 'BE'}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>
      )}

      {phase === 'idle' && operations.length === 0 && (
        <section className="card flex flex-col items-center justify-center gap-2 py-16 text-center animate-fade-up">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-ink-800">
            <History className="h-5 w-5 text-slate-600" />
          </div>
          <p className="text-sm font-medium text-slate-400">Nenhuma simulação iniciada</p>
          <p className="text-xs text-slate-600">Toque em "Iniciar Simulação" para começar</p>
        </section>
      )}
    </div>
  );
}

function Field({ label, value, icon: Icon, tone }: { label: string; value: string; icon?: typeof DollarSign; tone?: 'bull' | 'bear' }) {
  return (
    <div className="rounded-lg bg-ink-800/50 p-2.5">
      <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        {Icon && <Icon className="h-3 w-3" />}{label}
      </div>
      <div className={`mt-0.5 font-mono text-xs font-bold tabular ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-slate-200'}`}>{value}</div>
    </div>
  );
}

function Mini({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' }) {
  return (
    <div className="rounded-lg bg-ink-800/50 p-2.5 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-0.5 font-mono text-base font-bold tabular ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}
