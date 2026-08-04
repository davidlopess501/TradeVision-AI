import type { ManagedOperation, OperationStatus, OperationPeriod, OperationSummary, Asset } from '@/types';
import { ASSETS } from '@/lib/assets';

/**
 * Gerenciador de Operações
 *
 * Generates and manages simulated operations with three statuses (OPEN,
 * CLOSED, CANCELLED). Provides period filtering (today / week / month)
 * and a financial summary.
 */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DAY = 24 * 60 * 60 * 1000;

const CLOSE_REASONS = ['Alvo atingido', 'Stop acionado', 'Reversão de mercado', 'Break-even', 'Tempo expirado', 'Sinal contrário'];
const CANCEL_REASONS = ['Cancelada pelo usuário', 'Spread amplado', 'Volatilidade extrema', 'Erro de execução'];

function uid(i: number): string {
  return `op-${i}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

/** Generates a full set of simulated operations across 30 days. */
export function generateOperations(seed?: number): ManagedOperation[] {
  const rng = mulberry32(seed ?? hashStr(`ops-${Math.floor(Date.now() / 60000)}`));
  const now = Date.now();
  const ops: ManagedOperation[] = [];
  let idx = 0;

  for (let d = 0; d < 30; d++) {
    const dayBase = now - d * DAY;
    const count = 1 + Math.floor(rng() * 4);
    for (let i = 0; i < count; i++) {
      const asset: Asset = rng() > 0.5 ? 'WIN' : 'WDO';
      const info = ASSETS[asset];
      const direction: 'BUY' | 'SELL' = rng() > 0.45 ? 'BUY' : 'SELL';
      const roll = rng();
      const status: OperationStatus = roll < 0.12 ? 'CANCELLED' : roll < 0.35 && d > 0 ? 'OPEN' : 'CLOSED';

      const stopPts = asset === 'WIN' ? 100 + Math.round(rng() * 5) * 25 : 10 + Math.round(rng() * 5) * 5;
      const targetPts = stopPts * 2;
      const entry = info.basePrice + (rng() - 0.5) * info.basePrice * 0.003;
      const hour = 9 + Math.floor(rng() * 7);
      const min = Math.floor(rng() * 60);
      const openTime = dayBase + hour * 3_600_000 + min * 60_000;
      const durationMin = 2 + Math.floor(rng() * 30);

      let pnl = 0;
      let points = 0;
      let closeReason: string | null = null;

      if (status === 'CLOSED') {
        const win = rng() > 0.42;
        points = win ? targetPts : -stopPts;
        const pointValue = info.tickValue / info.tick;
        const contracts = 1 + Math.floor(rng() * 2);
        pnl = points * pointValue * contracts;
        closeReason = win ? 'Alvo atingido' : 'Stop acionado';
      } else if (status === 'CANCELLED') {
        closeReason = CANCEL_REASONS[Math.floor(rng() * CANCEL_REASONS.length)];
      }

      const exit = status === 'CLOSED' ? (direction === 'BUY' ? entry + points : entry - points) : 0;
      const closeTime = status === 'OPEN' ? null : openTime + durationMin * 60_000;

      ops.push({
        id: uid(idx++),
        asset,
        direction,
        entry: Math.round(entry),
        stop: direction === 'BUY' ? Math.round(entry - stopPts) : Math.round(entry + stopPts),
        target: direction === 'BUY' ? Math.round(entry + targetPts) : Math.round(entry - targetPts),
        exit: Math.round(exit),
        pnl,
        points,
        status,
        openTime,
        closeTime,
        durationMin,
        closeReason,
      });
    }
  }

  return ops.sort((a, b) => b.openTime - a.openTime);
}

/** Filters operations by period (today / week / month). */
export function filterByPeriod(ops: ManagedOperation[], period: OperationPeriod): ManagedOperation[] {
  const now = Date.now();
  const cutoff = period === 'TODAY' ? now - DAY : period === 'WEEK' ? now - 7 * DAY : now - 30 * DAY;
  return ops.filter((o) => o.openTime >= cutoff);
}

/** Computes a financial summary from a list of operations. */
export function computeSummary(ops: ManagedOperation[]): OperationSummary {
  let open = 0;
  let closed = 0;
  let cancelled = 0;
  let netPnl = 0;
  let grossWin = 0;
  let grossLoss = 0;
  let wins = 0;
  let losses = 0;

  for (const o of ops) {
    if (o.status === 'OPEN') open++;
    else if (o.status === 'CANCELLED') cancelled++;
    else if (o.status === 'CLOSED') {
      closed++;
      netPnl += o.pnl;
      if (o.pnl >= 0) {
        grossWin += o.pnl;
        wins++;
      } else {
        grossLoss += Math.abs(o.pnl);
        losses++;
      }
    }
  }

  const winRate = wins + losses > 0 ? (wins / (wins + losses)) * 100 : 0;

  return { total: ops.length, open, closed, cancelled, netPnl, grossWin, grossLoss, wins, losses, winRate };
}

export function statusLabel(s: OperationStatus): string {
  return s === 'OPEN' ? 'Aberta' : s === 'CLOSED' ? 'Encerrada' : 'Cancelada';
}

export function statusTone(s: OperationStatus): string {
  return s === 'OPEN' ? 'text-accent-400' : s === 'CLOSED' ? 'text-slate-300' : 'text-wait-400';
}

export function statusBg(s: OperationStatus): string {
  return s === 'OPEN' ? 'bg-accent-500/10' : s === 'CLOSED' ? 'bg-slate-500/10' : 'bg-wait-500/10';
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}min` : `${h}h`;
}
