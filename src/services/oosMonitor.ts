import type {
  BacktestResult,
} from './backtestEngine';

export type OosMonitorStatus =
  | 'INSUFFICIENT'
  | 'EARLY'
  | 'BUILDING'
  | 'VALIDATING';

export interface OosMonitorSnapshot {
  strategy: string;
  locked: boolean;

  candles: number;
  trades: number;

  winRate: number;
  netProfit: number;
  profitFactor: number;
  maxDrawdown: number;

  status: OosMonitorStatus;
  statusLabel: string;

  nextMilestone: number;
  validationTarget: number;

  progressPct: number;
}

export interface BuildOosMonitorParams {
  candles: number;
  result: BacktestResult;
}

const FROZEN_STRATEGY =
  'RSI-strength >= 54 + Momentum10 >= 0.5%';

function resolveStatus(
  trades: number,
): {
  status: OosMonitorStatus;
  label: string;
} {
  if (trades < 10) {
    return {
      status: 'INSUFFICIENT',
      label:
        'AMOSTRA INSUFICIENTE',
    };
  }

  if (trades < 20) {
    return {
      status: 'EARLY',
      label:
        'VALIDAÇÃO INICIAL',
    };
  }

  if (trades < 30) {
    return {
      status: 'BUILDING',
      label:
        'AMOSTRA EM FORMAÇÃO',
    };
  }

  return {
    status: 'VALIDATING',
    label:
      'VALIDAÇÃO AVANÇADA',
  };
}

function resolveNextMilestone(
  trades: number,
): number {
  if (trades < 10) {
    return 10;
  }

  if (trades < 20) {
    return 20;
  }

  if (trades < 30) {
    return 30;
  }

  if (trades < 50) {
    return 50;
  }

  return 100;
}

export function buildOosMonitorSnapshot({
  candles,
  result,
}: BuildOosMonitorParams): OosMonitorSnapshot {
  const trades =
    result.totalTrades;

  const {
    status,
    label,
  } = resolveStatus(
    trades,
  );

  const nextMilestone =
    resolveNextMilestone(
      trades,
    );

  const validationTarget = 50;

  const progressPct =
    Math.min(
      100,
      (trades /
        validationTarget) *
        100,
    );

  return {
    strategy:
      FROZEN_STRATEGY,

    locked: true,

    candles,
    trades,

    winRate:
      result.winRate,

    netProfit:
      result.netProfit,

    profitFactor:
      result.profitFactor,

    maxDrawdown:
      result.maxDrawdown,

    status,

    statusLabel:
      label,

    nextMilestone,

    validationTarget,

    progressPct,
  };
}

export function printOosMonitor(
  snapshot: OosMonitorSnapshot,
): void {
  console.group(
    '[TradeVision] OOS MONITOR 🔒',
  );

  console.log(
    '[TradeVision] Estratégia congelada:',
    snapshot.strategy,
  );

  console.table({
    'OOS ACUMULADO': {
      candles:
        snapshot.candles,

      trades:
        snapshot.trades,

      winRate:
        snapshot.winRate,

      netProfit:
        snapshot.netProfit,

      profitFactor:
        snapshot.profitFactor,

      maxDrawdown:
        snapshot.maxDrawdown,

      status:
        snapshot.statusLabel,

      nextMilestone:
        snapshot.nextMilestone,

      validationTarget:
        snapshot.validationTarget,

      progressPct:
        snapshot.progressPct,
    },
  });

  console.log(
    '[TradeVision] OOS MONITOR — REGRA BLOQUEADA',
    snapshot.locked,
  );

  console.log(
    '[TradeVision] OOS MONITOR — STATUS',
    snapshot.statusLabel,
  );

  console.groupEnd();
}