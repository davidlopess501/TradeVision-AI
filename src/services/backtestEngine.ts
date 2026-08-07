import type {
  Asset,
  Timeframe,
} from '@/types';

export interface BacktestConfig {
  asset: Asset;
  timeframe: Timeframe;
  initialCapital: number;
  quantity: number;
}

export interface BacktestTrade {
  id: string;
  side: 'BUY' | 'SELL';
  entry: number;
  exit: number;
  pnl: number;
  openedAt: number;
  closedAt: number;
}

export interface BacktestResult {
  config: BacktestConfig;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  winRate: number;
  netProfit: number;
  maxDrawdown: number;
  profitFactor: number;
  finalCapital: number;
  trades: BacktestTrade[];
}

function calculateMaxDrawdown(
  initialCapital: number,
  trades: BacktestTrade[],
): number {
  let equity = initialCapital;
  let peak = initialCapital;
  let maxDrawdown = 0;

  for (const trade of trades) {
    equity += trade.pnl;

    if (equity > peak) {
      peak = equity;
    }

    const drawdown =
      peak > 0
        ? ((peak - equity) / peak) * 100
        : 0;

    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  }

  return maxDrawdown;
}

function calculateProfitFactor(
  trades: BacktestTrade[],
): number {
  const grossProfit = trades
    .filter((trade) => trade.pnl > 0)
    .reduce(
      (total, trade) =>
        total + trade.pnl,
      0,
    );

  const grossLoss = Math.abs(
    trades
      .filter((trade) => trade.pnl < 0)
      .reduce(
        (total, trade) =>
          total + trade.pnl,
        0,
      ),
  );

  if (grossLoss === 0) {
    return grossProfit > 0
      ? Number.POSITIVE_INFINITY
      : 0;
  }

  return grossProfit / grossLoss;
}

export async function runBacktest(
  config: BacktestConfig,
  trades: BacktestTrade[] = [],
): Promise<BacktestResult> {
  const winningTrades =
    trades.filter(
      (trade) => trade.pnl > 0,
    ).length;

  const losingTrades =
    trades.filter(
      (trade) => trade.pnl < 0,
    ).length;

  const totalTrades =
    trades.length;

  const netProfit =
    trades.reduce(
      (total, trade) =>
        total + trade.pnl,
      0,
    );

  const winRate =
    totalTrades > 0
      ? (winningTrades / totalTrades) * 100
      : 0;

  const maxDrawdown =
    calculateMaxDrawdown(
      config.initialCapital,
      trades,
    );

  const profitFactor =
    calculateProfitFactor(
      trades,
    );

  return {
    config,
    totalTrades,
    winningTrades,
    losingTrades,
    winRate,
    netProfit,
    maxDrawdown,
    profitFactor,
    finalCapital:
      config.initialCapital +
      netProfit,
    trades,
  };
}