import type { Trade, BacktestSummary } from '@/types';

/**
 * Aggregates a list of trades into backtest / statistics metrics.
 * Pure function — used by both the Backtest screen and the risk stats panel.
 */
export function computeStats(trades: Trade[]): BacktestSummary {
  const totalTrades = trades.length;
  const wins = trades.filter((t) => t.result === 'WIN').length;
  const losses = trades.filter((t) => t.result === 'LOSS').length;
  const winRate = totalTrades ? (wins / totalTrades) * 100 : 0;

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let bestWinStreak = 0;
  let worstLossStreak = 0;
  let curWin = 0;
  let curLoss = 0;
  let grossWin = 0;
  let grossLoss = 0;

  const ordered = [...trades].sort((a, b) => a.createdAt - b.createdAt);
  for (const t of ordered) {
    cumulative += t.pnl;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;

    if (t.result === 'WIN') {
      curWin++;
      curLoss = 0;
      if (curWin > bestWinStreak) bestWinStreak = curWin;
      grossWin += t.pnl;
    } else if (t.result === 'LOSS') {
      curLoss++;
      curWin = 0;
      if (curLoss > worstLossStreak) worstLossStreak = curLoss;
      grossLoss += Math.abs(t.pnl);
    } else {
      curWin = 0;
      curLoss = 0;
    }
  }

  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
  const rewardRiskRatio =
    trades.length && losses > 0
      ? Math.abs(
          trades.filter((t) => t.result === 'WIN').reduce((a, b) => a + b.pnl, 0) /
            trades.filter((t) => t.result === 'LOSS').reduce((a, b) => a + Math.abs(b.pnl), 0),
        )
      : 0;

  const now = Date.now();
  const week = 7 * 24 * 60 * 60 * 1000;
  const month = 30 * 24 * 60 * 60 * 1000;
  const weeklyPnl = trades.filter((t) => now - t.createdAt <= week).reduce((a, b) => a + b.pnl, 0);
  const monthlyPnl = trades.filter((t) => now - t.createdAt <= month).reduce((a, b) => a + b.pnl, 0);

  const expectancy = totalTrades ? cumulative / totalTrades : 0;

  return {
    winRate,
    totalTrades,
    wins,
    losses,
    cumulativePnl: cumulative,
    maxDrawdown,
    rewardRiskRatio,
    profitFactor,
    bestWinStreak,
    worstLossStreak,
    monthlyPnl,
    weeklyPnl,
    expectancy,
  };
}

/** Simple equity curve points for charting. */
export function equityCurve(trades: Trade[]): { x: number; y: number }[] {
  let cum = 0;
  return [...trades]
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((t) => {
      cum += t.pnl;
      return { x: t.createdAt, y: cum };
    });
}
