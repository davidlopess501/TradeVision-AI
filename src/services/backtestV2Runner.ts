import type {
  Asset,
  Candle,
  Timeframe,
} from '@/types';

import {
  buildHistoricalAnalysis,
} from './historicalAnalysisBuilder';

import {
  evaluateAnalysis,
} from './decisionEngine';

import {
  prepareOrder,
} from './orderManager';

import {
  DEFAULT_RISK_RULES,
  evaluateOrderRisk,
} from './riskManager';

import {
  runBacktest,
  type BacktestResult,
  type BacktestTrade,
} from './backtestEngine';

import {
  simulateBacktestExit,
  type BacktestExitReason,
} from './backtestExitSimulator';

import {
  ASSETS,
} from '@/lib/assets';

export interface BacktestV2Config {
  asset: Asset;
  timeframe: Timeframe;
  initialCapital: number;
  candles: Candle[];

  /**
   * BOTH = executa BUY e SELL normalmente.
   * BUY_ONLY = mantém toda a estratégia, mas ignora ordens SELL.
   *
   * Default: BOTH.
   */
  strategyMode?: 'BOTH' | 'BUY_ONLY';
}

interface BacktestDiagnostics {
  candlesReceived: number;
  windowsEvaluated: number;

  finalSignalBuy: number;
  finalSignalSell: number;
  finalSignalWait: number;

  trendAlta: number;
  trendBaixa: number;
  trendNeutra: number;

  scoreAtLeast65: number;
  confidenceAtLeast65: number;

  buySignalAndTrend: number;
  sellSignalAndTrend: number;

  buyAllCriteria: number;
  sellAllCriteria: number;

  decisionBuy: number;
  decisionSell: number;
  decisionWait: number;

  ordersReady: number;
  ordersBlocked: number;

  riskApproved: number;
  riskBlocked: number;

  tradesExecuted: number;

  winningTrades: number;
  losingTrades: number;
  grossProfit: number;
  grossLoss: number;
  bestTrade: number;
  worstTrade: number;
  currentWinStreak: number;
  currentLossStreak: number;
  maxWinStreak: number;
  maxLossStreak: number;

  buyTrades: number;
  buyWins: number;
  buyLosses: number;
  buyGrossProfit: number;
  buyGrossLoss: number;

  sellTrades: number;
  sellWins: number;
  sellLosses: number;
  sellGrossProfit: number;
  sellGrossLoss: number;

  exitsByStop: number;
  exitsByTarget: number;
  exitsByEndOfData: number;

  minScore: number;
  maxScore: number;
  scoreTotal: number;

  minConfidence: number;
  maxConfidence: number;
  confidenceTotal: number;

  riskBlockReasons: Record<string, number>;
}


interface SellBucketStats {
  trades: number;
  wins: number;
  losses: number;
  grossProfit: number;
  grossLoss: number;
}

function createSellBucketStats(): SellBucketStats {
  return {
    trades: 0,
    wins: 0,
    losses: 0,
    grossProfit: 0,
    grossLoss: 0,
  };
}

function registerSellBucketTrade(
  bucket: SellBucketStats,
  pnl: number,
): void {
  bucket.trades += 1;

  if (pnl > 0) {
    bucket.wins += 1;
    bucket.grossProfit += pnl;
  } else if (pnl < 0) {
    bucket.losses += 1;
    bucket.grossLoss += Math.abs(pnl);
  }
}

function sellBucketSummary(
  bucket: SellBucketStats,
) {
  const winRate =
    bucket.trades > 0
      ? (bucket.wins / bucket.trades) * 100
      : 0;

  const netProfit =
    bucket.grossProfit -
    bucket.grossLoss;

  const profitFactor =
    bucket.grossLoss > 0
      ? bucket.grossProfit /
        bucket.grossLoss
      : bucket.grossProfit > 0
        ? Number.POSITIVE_INFINITY
        : 0;

  return {
    trades: bucket.trades,
    wins: bucket.wins,
    losses: bucket.losses,
    winRate,
    netProfit,
    profitFactor,
  };
}


interface SellIndicatorDiagnostic {
  trades: number;
  ema9Total: number;
  ema21Total: number;
  rsiTotal: number;
  macdTotal: number;
  volumeTotal: number;
}

function createSellIndicatorDiagnostic(): SellIndicatorDiagnostic {
  return {
    trades: 0,
    ema9Total: 0,
    ema21Total: 0,
    rsiTotal: 0,
    macdTotal: 0,
    volumeTotal: 0,
  };
}

function registerSellIndicators(
  bucket: SellIndicatorDiagnostic,
  analysis: ReturnType<typeof buildHistoricalAnalysis>,
): void {
  const strength = (key: string): number =>
    analysis.indicators.find(
      (indicator) => indicator.key === key,
    )?.strength ?? 50;

  bucket.trades += 1;
  bucket.ema9Total += strength('ema9');
  bucket.ema21Total += strength('ema21');
  bucket.rsiTotal += strength('rsi');
  bucket.macdTotal += strength('macd');
  bucket.volumeTotal += strength('volume');
}

function sellIndicatorSummary(
  bucket: SellIndicatorDiagnostic,
) {
  const divisor =
    bucket.trades > 0
      ? bucket.trades
      : 1;

  return {
    trades: bucket.trades,
    avgEma9:
      bucket.ema9Total / divisor,
    avgEma21:
      bucket.ema21Total / divisor,
    avgRsi:
      bucket.rsiTotal / divisor,
    avgMacd:
      bucket.macdTotal / divisor,
    avgVolume:
      bucket.volumeTotal / divisor,
  };
}


interface SellMomentumDiagnostic {
  trades: number;
  return3Total: number;
  return5Total: number;
  return10Total: number;
  return20Total: number;
}

function createSellMomentumDiagnostic(): SellMomentumDiagnostic {
  return {
    trades: 0,
    return3Total: 0,
    return5Total: 0,
    return10Total: 0,
    return20Total: 0,
  };
}

function percentReturn(
  candles: Candle[],
  lookback: number,
): number {
  const last =
    candles[candles.length - 1];

  const previous =
    candles[
      Math.max(
        0,
        candles.length - 1 - lookback,
      )
    ];

  if (
    !last ||
    !previous ||
    previous.close === 0
  ) {
    return 0;
  }

  return (
    (last.close - previous.close) /
    previous.close
  ) * 100;
}

function registerSellMomentum(
  bucket: SellMomentumDiagnostic,
  candles: Candle[],
): void {
  bucket.trades += 1;
  bucket.return3Total +=
    percentReturn(candles, 3);
  bucket.return5Total +=
    percentReturn(candles, 5);
  bucket.return10Total +=
    percentReturn(candles, 10);
  bucket.return20Total +=
    percentReturn(candles, 20);
}

function sellMomentumSummary(
  bucket: SellMomentumDiagnostic,
) {
  const divisor =
    bucket.trades > 0
      ? bucket.trades
      : 1;

  return {
    trades: bucket.trades,
    avgReturn3:
      bucket.return3Total / divisor,
    avgReturn5:
      bucket.return5Total / divisor,
    avgReturn10:
      bucket.return10Total / divisor,
    avgReturn20:
      bucket.return20Total / divisor,
  };
}

function uid(): string {
  return (
    crypto.randomUUID?.() ??
    `${Math.random()
      .toString(36)
      .slice(2)}-${Date.now()}`
  );
}

function moneyPerPoint(
  asset: Asset,
): number {
  const info =
    ASSETS[asset];

  return (
    info.tickValue /
    info.tick
  );
}

function countReason(
  map: Record<string, number>,
  reason: string,
): void {
  map[reason] =
    (map[reason] ?? 0) + 1;
}

function countExitReason(
  diagnostics: BacktestDiagnostics,
  reason: BacktestExitReason,
): void {
  if (reason === 'STOP') {
    diagnostics.exitsByStop += 1;
    return;
  }

  if (reason === 'TARGET') {
    diagnostics.exitsByTarget += 1;
    return;
  }

  diagnostics.exitsByEndOfData += 1;
}

export async function runBacktestV2(
  config: BacktestV2Config,
): Promise<BacktestResult> {
  const strategyMode =
    config.strategyMode ?? 'BOTH';

  const trades:
    BacktestTrade[] = [];

  const diagnostics:
    BacktestDiagnostics = {
      candlesReceived:
        config.candles.length,
      windowsEvaluated: 0,

      finalSignalBuy: 0,
      finalSignalSell: 0,
      finalSignalWait: 0,

      trendAlta: 0,
      trendBaixa: 0,
      trendNeutra: 0,

      scoreAtLeast65: 0,
      confidenceAtLeast65: 0,

      buySignalAndTrend: 0,
      sellSignalAndTrend: 0,

      buyAllCriteria: 0,
      sellAllCriteria: 0,

      decisionBuy: 0,
      decisionSell: 0,
      decisionWait: 0,

      ordersReady: 0,
      ordersBlocked: 0,

      riskApproved: 0,
      riskBlocked: 0,

      tradesExecuted: 0,

      winningTrades: 0,
      losingTrades: 0,
      grossProfit: 0,
      grossLoss: 0,
      bestTrade:
        Number.NEGATIVE_INFINITY,
      worstTrade:
        Number.POSITIVE_INFINITY,
      currentWinStreak: 0,
      currentLossStreak: 0,
      maxWinStreak: 0,
      maxLossStreak: 0,

      buyTrades: 0,
      buyWins: 0,
      buyLosses: 0,
      buyGrossProfit: 0,
      buyGrossLoss: 0,

      sellTrades: 0,
      sellWins: 0,
      sellLosses: 0,
      sellGrossProfit: 0,
      sellGrossLoss: 0,

      exitsByStop: 0,
      exitsByTarget: 0,
      exitsByEndOfData: 0,

      minScore:
        Number.POSITIVE_INFINITY,
      maxScore:
        Number.NEGATIVE_INFINITY,
      scoreTotal: 0,

      minConfidence:
        Number.POSITIVE_INFINITY,
      maxConfidence:
        Number.NEGATIVE_INFINITY,
      confidenceTotal: 0,

      riskBlockReasons: {},
    };

  const sellByScore: Record<string, SellBucketStats> = {
    'score<=31': createSellBucketStats(),
    'score32': createSellBucketStats(),
    'score33': createSellBucketStats(),
    'score34': createSellBucketStats(),
    'score35': createSellBucketStats(),
  };

  const sellByConfidence: Record<string, SellBucketStats> = {
    'conf65-69': createSellBucketStats(),
    'conf70-74': createSellBucketStats(),
    'conf75-79': createSellBucketStats(),
    'conf80+': createSellBucketStats(),
  };

  const sellWinningIndicators =
    createSellIndicatorDiagnostic();

  const sellLosingIndicators =
    createSellIndicatorDiagnostic();

  const sellWinningMomentum =
    createSellMomentumDiagnostic();

  const sellLosingMomentum =
    createSellMomentumDiagnostic();

  const windowSize = 120;

  for (
    let index = windowSize;
    index < config.candles.length;
    index += 1
  ) {
    const nextCandle =
      config.candles[
        index + 1
      ];

    if (!nextCandle) {
      break;
    }

    const historicalCandles =
      config.candles.slice(
        index - windowSize,
        index + 1,
      );

    diagnostics.windowsEvaluated += 1;

    const analysis =
      buildHistoricalAnalysis(
        config.asset,
        config.timeframe,
        historicalCandles,
      );

    const decision =
      evaluateAnalysis(
        analysis,
      );

    diagnostics.minScore =
      Math.min(
        diagnostics.minScore,
        analysis.score,
      );

    diagnostics.maxScore =
      Math.max(
        diagnostics.maxScore,
        analysis.score,
      );

    diagnostics.scoreTotal +=
      analysis.score;

    diagnostics.minConfidence =
      Math.min(
        diagnostics.minConfidence,
        decision.confidence,
      );

    diagnostics.maxConfidence =
      Math.max(
        diagnostics.maxConfidence,
        decision.confidence,
      );

    diagnostics.confidenceTotal +=
      decision.confidence;

    if (
      analysis.finalSignal === 'BUY'
    ) {
      diagnostics.finalSignalBuy += 1;
    } else if (
      analysis.finalSignal === 'SELL'
    ) {
      diagnostics.finalSignalSell += 1;
    } else {
      diagnostics.finalSignalWait += 1;
    }

    if (
      analysis.trend === 'ALTA'
    ) {
      diagnostics.trendAlta += 1;
    } else if (
      analysis.trend === 'BAIXA'
    ) {
      diagnostics.trendBaixa += 1;
    } else {
      diagnostics.trendNeutra += 1;
    }

    if (analysis.score >= 65) {
      diagnostics.scoreAtLeast65 += 1;
    }

    if (
      decision.confidence >= 65
    ) {
      diagnostics.confidenceAtLeast65 += 1;
    }

    if (
      analysis.finalSignal === 'BUY' &&
      analysis.trend === 'ALTA'
    ) {
      diagnostics.buySignalAndTrend += 1;
    }

    if (
      analysis.finalSignal === 'SELL' &&
      analysis.trend === 'BAIXA'
    ) {
      diagnostics.sellSignalAndTrend += 1;
    }

    if (
      analysis.finalSignal === 'BUY' &&
      analysis.trend === 'ALTA' &&
      analysis.score >= 65 &&
      decision.confidence >= 65
    ) {
      diagnostics.buyAllCriteria += 1;
    }

    if (
      analysis.finalSignal === 'SELL' &&
      analysis.trend === 'BAIXA' &&
      analysis.score <= 35 &&
      decision.confidence >= 65
    ) {
      diagnostics.sellAllCriteria += 1;
    }

    if (
      decision.action === 'BUY'
    ) {
      diagnostics.decisionBuy += 1;
    } else if (
      decision.action === 'SELL'
    ) {
      diagnostics.decisionSell += 1;
    } else {
      diagnostics.decisionWait += 1;
    }

    const preparedOrder =
      prepareOrder(
        analysis,
        decision,
      );

    if (
      preparedOrder.status === 'READY' &&
      preparedOrder.side
    ) {
      diagnostics.ordersReady += 1;
    } else {
      diagnostics.ordersBlocked += 1;
      continue;
    }

    /*
     * Experimento controlado:
     * em BUY_ONLY, sinais/decisões continuam sendo calculados
     * normalmente, mas ordens SELL não entram na lista de trades.
     */
    if (
      strategyMode === 'BUY_ONLY' &&
      preparedOrder.side === 'SELL'
    ) {
      continue;
    }

    const risk =
      evaluateOrderRisk(
        preparedOrder,
        DEFAULT_RISK_RULES,
        {
          dailyPnl: 0,
          openPositions: 0,
        },
      );

    if (
      risk.decision !== 'APPROVED' ||
      risk.quantity < 1
    ) {
      diagnostics.riskBlocked += 1;

      countReason(
        diagnostics.riskBlockReasons,
        risk.reason,
      );

      continue;
    }

    diagnostics.riskApproved += 1;

    const exitResult =
      simulateBacktestExit({
        side:
          preparedOrder.side,
        stop:
          preparedOrder.stop,
        target:
          preparedOrder.target,
        candles:
          config.candles,
        startIndex:
          index + 1,
      });

    if (!exitResult) {
      break;
    }

    const entry =
      preparedOrder.entry;

    const exit =
      exitResult.exitPrice;

    const points =
      preparedOrder.side === 'BUY'
        ? exit - entry
        : entry - exit;

    const pnl =
      points *
      moneyPerPoint(
        config.asset,
      ) *
      risk.quantity;

    trades.push({
      id: uid(),
      side:
        preparedOrder.side,
      entry,
      exit,
      pnl,
      openedAt:
        config.candles[index].time,
      closedAt:
        exitResult.closedAt,
    });

    diagnostics.tradesExecuted += 1;

    diagnostics.bestTrade =
      Math.max(
        diagnostics.bestTrade,
        pnl,
      );

    diagnostics.worstTrade =
      Math.min(
        diagnostics.worstTrade,
        pnl,
      );

    if (pnl > 0) {
      diagnostics.winningTrades += 1;
      diagnostics.grossProfit += pnl;

      diagnostics.currentWinStreak += 1;
      diagnostics.currentLossStreak = 0;

      diagnostics.maxWinStreak =
        Math.max(
          diagnostics.maxWinStreak,
          diagnostics.currentWinStreak,
        );
    } else if (pnl < 0) {
      diagnostics.losingTrades += 1;
      diagnostics.grossLoss +=
        Math.abs(pnl);

      diagnostics.currentLossStreak += 1;
      diagnostics.currentWinStreak = 0;

      diagnostics.maxLossStreak =
        Math.max(
          diagnostics.maxLossStreak,
          diagnostics.currentLossStreak,
        );
    } else {
      diagnostics.currentWinStreak = 0;
      diagnostics.currentLossStreak = 0;
    }

    if (preparedOrder.side === 'BUY') {
      diagnostics.buyTrades += 1;

      if (pnl > 0) {
        diagnostics.buyWins += 1;
        diagnostics.buyGrossProfit += pnl;
      } else if (pnl < 0) {
        diagnostics.buyLosses += 1;
        diagnostics.buyGrossLoss +=
          Math.abs(pnl);
      }
    } else {
      diagnostics.sellTrades += 1;

      if (pnl > 0) {
        diagnostics.sellWins += 1;
        diagnostics.sellGrossProfit += pnl;
      } else if (pnl < 0) {
        diagnostics.sellLosses += 1;
        diagnostics.sellGrossLoss +=
          Math.abs(pnl);
      }

      const scoreBucket =
        analysis.score <= 31
          ? 'score<=31'
          : analysis.score === 32
            ? 'score32'
            : analysis.score === 33
              ? 'score33'
              : analysis.score === 34
                ? 'score34'
                : 'score35';

      registerSellBucketTrade(
        sellByScore[scoreBucket],
        pnl,
      );

      const confidenceBucket =
        decision.confidence < 70
          ? 'conf65-69'
          : decision.confidence < 75
            ? 'conf70-74'
            : decision.confidence < 80
              ? 'conf75-79'
              : 'conf80+';

      registerSellBucketTrade(
        sellByConfidence[confidenceBucket],
        pnl,
      );

      if (pnl > 0) {
        registerSellIndicators(
          sellWinningIndicators,
          analysis,
        );

        registerSellMomentum(
          sellWinningMomentum,
          historicalCandles,
        );
      } else if (pnl < 0) {
        registerSellIndicators(
          sellLosingIndicators,
          analysis,
        );

        registerSellMomentum(
          sellLosingMomentum,
          historicalCandles,
        );
      }
    }

    countExitReason(
      diagnostics,
      exitResult.reason,
    );

    if (
      exitResult.exitIndex > index
    ) {
      index =
        exitResult.exitIndex;
    }
  }

  const divisor =
    diagnostics.windowsEvaluated > 0
      ? diagnostics.windowsEvaluated
      : 1;

  const averageWin =
    diagnostics.winningTrades > 0
      ? diagnostics.grossProfit /
        diagnostics.winningTrades
      : 0;

  const averageLoss =
    diagnostics.losingTrades > 0
      ? diagnostics.grossLoss /
        diagnostics.losingTrades
      : 0;

  const payoffRatio =
    averageLoss > 0
      ? averageWin / averageLoss
      : 0;

  const buyNetProfit =
    diagnostics.buyGrossProfit -
    diagnostics.buyGrossLoss;

  const sellNetProfit =
    diagnostics.sellGrossProfit -
    diagnostics.sellGrossLoss;

  const buyWinRate =
    diagnostics.buyTrades > 0
      ? (
          diagnostics.buyWins /
          diagnostics.buyTrades
        ) * 100
      : 0;

  const sellWinRate =
    diagnostics.sellTrades > 0
      ? (
          diagnostics.sellWins /
          diagnostics.sellTrades
        ) * 100
      : 0;

  const buyProfitFactor =
    diagnostics.buyGrossLoss > 0
      ? diagnostics.buyGrossProfit /
        diagnostics.buyGrossLoss
      : diagnostics.buyGrossProfit > 0
        ? Number.POSITIVE_INFINITY
        : 0;

  const sellProfitFactor =
    diagnostics.sellGrossLoss > 0
      ? diagnostics.sellGrossProfit /
        diagnostics.sellGrossLoss
      : diagnostics.sellGrossProfit > 0
        ? Number.POSITIVE_INFINITY
        : 0;

  console.group(
    `[TradeVision] Backtesting V2 Stop/Target Diagnostics — ${strategyMode}`,
  );

  console.table({
    candlesReceived:
      diagnostics.candlesReceived,
    windowsEvaluated:
      diagnostics.windowsEvaluated,

    finalSignalBuy:
      diagnostics.finalSignalBuy,
    finalSignalSell:
      diagnostics.finalSignalSell,
    finalSignalWait:
      diagnostics.finalSignalWait,

    trendAlta:
      diagnostics.trendAlta,
    trendBaixa:
      diagnostics.trendBaixa,
    trendNeutra:
      diagnostics.trendNeutra,

    scoreAtLeast65:
      diagnostics.scoreAtLeast65,
    confidenceAtLeast65:
      diagnostics.confidenceAtLeast65,

    buySignalAndTrend:
      diagnostics.buySignalAndTrend,
    sellSignalAndTrend:
      diagnostics.sellSignalAndTrend,

    buyAllCriteria:
      diagnostics.buyAllCriteria,
    sellAllCriteria:
      diagnostics.sellAllCriteria,

    decisionBuy:
      diagnostics.decisionBuy,
    decisionSell:
      diagnostics.decisionSell,
    decisionWait:
      diagnostics.decisionWait,

    ordersReady:
      diagnostics.ordersReady,
    ordersBlocked:
      diagnostics.ordersBlocked,

    riskApproved:
      diagnostics.riskApproved,
    riskBlocked:
      diagnostics.riskBlocked,

    tradesExecuted:
      diagnostics.tradesExecuted,

    winningTrades:
      diagnostics.winningTrades,
    losingTrades:
      diagnostics.losingTrades,

    averageWin,
    averageLoss,
    payoffRatio,

    bestTrade:
      Number.isFinite(
        diagnostics.bestTrade,
      )
        ? diagnostics.bestTrade
        : 0,

    worstTrade:
      Number.isFinite(
        diagnostics.worstTrade,
      )
        ? diagnostics.worstTrade
        : 0,

    maxWinStreak:
      diagnostics.maxWinStreak,
    maxLossStreak:
      diagnostics.maxLossStreak,

    buyTrades:
      diagnostics.buyTrades,
    buyWins:
      diagnostics.buyWins,
    buyLosses:
      diagnostics.buyLosses,
    buyWinRate,
    buyNetProfit,
    buyProfitFactor,

    sellTrades:
      diagnostics.sellTrades,
    sellWins:
      diagnostics.sellWins,
    sellLosses:
      diagnostics.sellLosses,
    sellWinRate,
    sellNetProfit,
    sellProfitFactor,

    exitsByStop:
      diagnostics.exitsByStop,
    exitsByTarget:
      diagnostics.exitsByTarget,
    exitsByEndOfData:
      diagnostics.exitsByEndOfData,

    minScore:
      Number.isFinite(
        diagnostics.minScore,
      )
        ? diagnostics.minScore
        : 0,

    avgScore:
      diagnostics.scoreTotal /
      divisor,

    maxScore:
      Number.isFinite(
        diagnostics.maxScore,
      )
        ? diagnostics.maxScore
        : 0,

    minConfidence:
      Number.isFinite(
        diagnostics.minConfidence,
      )
        ? diagnostics.minConfidence
        : 0,

    avgConfidence:
      diagnostics.confidenceTotal /
      divisor,

    maxConfidence:
      Number.isFinite(
        diagnostics.maxConfidence,
      )
        ? diagnostics.maxConfidence
        : 0,
  });

  console.log(
    '[TradeVision] SELL por Score',
  );

  console.table({
    'score<=31':
      sellBucketSummary(
        sellByScore['score<=31'],
      ),
    score32:
      sellBucketSummary(
        sellByScore.score32,
      ),
    score33:
      sellBucketSummary(
        sellByScore.score33,
      ),
    score34:
      sellBucketSummary(
        sellByScore.score34,
      ),
    score35:
      sellBucketSummary(
        sellByScore.score35,
      ),
  });

  console.log(
    '[TradeVision] SELL por Confidence',
  );

  console.table({
    'conf65-69':
      sellBucketSummary(
        sellByConfidence['conf65-69'],
      ),
    'conf70-74':
      sellBucketSummary(
        sellByConfidence['conf70-74'],
      ),
    'conf75-79':
      sellBucketSummary(
        sellByConfidence['conf75-79'],
      ),
    'conf80+':
      sellBucketSummary(
        sellByConfidence['conf80+'],
      ),
  });

  console.log(
    '[TradeVision] SELL Winners vs Losers - Indicadores',
  );

  console.table({
    winners:
      sellIndicatorSummary(
        sellWinningIndicators,
      ),
    losers:
      sellIndicatorSummary(
        sellLosingIndicators,
      ),
  });

  console.log(
    '[TradeVision] SELL Winners vs Losers - Momentum',
  );

  console.table({
    winners:
      sellMomentumSummary(
        sellWinningMomentum,
      ),
    losers:
      sellMomentumSummary(
        sellLosingMomentum,
      ),
  });

  if (
    Object.keys(
      diagnostics.riskBlockReasons,
    ).length > 0
  ) {
    console.log(
      'Motivos de bloqueio do Risk Manager:',
      diagnostics.riskBlockReasons,
    );
  }

  console.groupEnd();

  return runBacktest(
    {
      asset: config.asset,
      timeframe:
        config.timeframe,
      initialCapital:
        config.initialCapital,
      quantity: 1,
    },
    trades,
  );
}