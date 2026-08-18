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
  applyBacktestExecutionCosts,
  type BacktestExecutionCostConfig,
} from './backtestExecutionCosts';

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

  /**
   * Custos opcionais de execução.
   * Sem configuração, o comportamento antigo é preservado (custo zero).
   */
  executionCosts?: Partial<BacktestExecutionCostConfig>;
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


interface RobustnessTradeSample {
  pnl: number;
  rsi: number;
  ema9: number;
  ema21: number;
  macd: number;
  momentum3: number;
  momentum5: number;
  momentum10: number;
  momentum20: number;
}

interface RobustnessFilter {
  name: string;
  test: (sample: RobustnessTradeSample) => boolean;
}

function diagnosticStrength(
  analysis: ReturnType<typeof buildHistoricalAnalysis>,
  key: string,
): number {
  return (
    analysis.indicators.find(
      (indicator) => indicator.key === key,
    )?.strength ?? 50
  );
}

function robustnessStats(
  samples: RobustnessTradeSample[],
) {
  const trades = samples.length;
  const wins = samples.filter(
    (sample) => sample.pnl > 0,
  ).length;
  const losses = samples.filter(
    (sample) => sample.pnl < 0,
  ).length;

  const grossProfit = samples.reduce(
    (total, sample) =>
      total + Math.max(0, sample.pnl),
    0,
  );

  const grossLoss = samples.reduce(
    (total, sample) =>
      total + Math.max(0, -sample.pnl),
    0,
  );

  const netProfit = grossProfit - grossLoss;

  const profitFactor =
    grossLoss > 0
      ? grossProfit / grossLoss
      : grossProfit > 0
        ? Number.POSITIVE_INFINITY
        : 0;

  let equity = 0;
  let peak = 0;
  let maxDrawdownMoney = 0;

  for (const sample of samples) {
    equity += sample.pnl;
    peak = Math.max(peak, equity);
    maxDrawdownMoney = Math.max(
      maxDrawdownMoney,
      peak - equity,
    );
  }

  return {
    trades,
    wins,
    losses,
    winRate:
      trades > 0
        ? (wins / trades) * 100
        : 0,
    netProfit,
    profitFactor,
    maxDrawdownMoney,
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

function rebaseOrderToNextOpen(
  side: 'BUY' | 'SELL',
  originalEntry: number,
  originalStop: number,
  originalTarget: number,
  nextOpen: number,
): {
  entry: number;
  stop: number;
  target: number;
} {
  const stopDistance =
    Math.abs(originalEntry - originalStop);

  const targetDistance =
    Math.abs(originalTarget - originalEntry);

  if (side === 'BUY') {
    return {
      entry: nextOpen,
      stop: nextOpen - stopDistance,
      target: nextOpen + targetDistance,
    };
  }

  return {
    entry: nextOpen,
    stop: nextOpen + stopDistance,
    target: nextOpen - targetDistance,
  };
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

  const executionCosts: BacktestExecutionCostConfig = {
    slippageTicksPerSide:
      config.executionCosts?.slippageTicksPerSide ?? 0,
    fixedCostPerContractRoundTrip:
      config.executionCosts?.fixedCostPerContractRoundTrip ?? 0,
  };

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

  const buyByScore: Record<string, SellBucketStats> = {
    'score65-66': createSellBucketStats(),
    'score67-68': createSellBucketStats(),
    'score69-70': createSellBucketStats(),
    'score71+': createSellBucketStats(),
  };

  const buyByConfidence: Record<string, SellBucketStats> = {
    'conf65-69': createSellBucketStats(),
    'conf70-74': createSellBucketStats(),
    'conf75-79': createSellBucketStats(),
    'conf80+': createSellBucketStats(),
  };

  const buyWinningIndicators =
    createSellIndicatorDiagnostic();

  const buyLosingIndicators =
    createSellIndicatorDiagnostic();

  const buyWinningMomentum =
    createSellMomentumDiagnostic();

  const buyLosingMomentum =
    createSellMomentumDiagnostic();

  const buyWinningScoreConfidence = {
    trades: 0,
    scoreTotal: 0,
    confidenceTotal: 0,
  };

  const buyLosingScoreConfidence = {
    trades: 0,
    scoreTotal: 0,
    confidenceTotal: 0,
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

  /*
   * LAB ROBUSTEZ V1:
   * coleta somente os trades BUY que a estratégia original já executaria.
   * Não altera entrada, stop, target, risco ou custos.
   */
  const robustnessBuySamples:
    RobustnessTradeSample[] = [];

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

    /*
     * Execução realista:
     * o sinal é confirmado no fechamento do candle atual,
     * mas a entrada só acontece no OPEN do candle seguinte.
     *
     * As distâncias originais de stop e target são preservadas
     * e reposicionadas a partir do preço real de entrada.
     */
    const executionLevels =
      rebaseOrderToNextOpen(
        preparedOrder.side,
        preparedOrder.entry,
        preparedOrder.stop,
        preparedOrder.target,
        nextCandle.open,
      );

    console.log(
      '[TradeVision] EXECUTION GAP CHECK',
      {
        asset: config.asset,
        timeframe: config.timeframe,
        side: preparedOrder.side,

        signalIndex: index,
        executionIndex: index + 1,

        signalClose:
          config.candles[index].close,

        nextOpen:
          nextCandle.open,

        gap:
          nextCandle.open -
          config.candles[index].close,

        entryUsed:
          executionLevels.entry,

        stopUsed:
          executionLevels.stop,

        targetUsed:
          executionLevels.target,
      },
    );

    const exitResult =
      simulateBacktestExit({
        side:
          preparedOrder.side,
        stop:
          executionLevels.stop,
        target:
          executionLevels.target,
        candles:
          config.candles,
        startIndex:
          index + 1,
      });

    if (!exitResult) {
      break;
    }

    const entry =
      executionLevels.entry;

    const exit =
      exitResult.exitPrice;

    const points =
      preparedOrder.side === 'BUY'
        ? exit - entry
        : entry - exit;

    const assetMoneyPerPoint =
      moneyPerPoint(
        config.asset,
      );

    const grossPnl =
      points *
      assetMoneyPerPoint *
      risk.quantity;

    const executionCostResult =
      applyBacktestExecutionCosts({
        grossPnl,
        quantity:
          risk.quantity,
        moneyPerPoint:
          assetMoneyPerPoint,
        tickSize:
          ASSETS[config.asset].tick,
        config:
          executionCosts,
      });

    const pnl =
      executionCostResult.netPnl;

    trades.push({
      id: uid(),
      side:
        preparedOrder.side,
      entry,
      exit,
      pnl,
      openedAt:
        nextCandle.time,
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

      robustnessBuySamples.push({
        pnl,
        rsi:
          diagnosticStrength(
            analysis,
            'rsi',
          ),
        ema9:
          diagnosticStrength(
            analysis,
            'ema9',
          ),
        ema21:
          diagnosticStrength(
            analysis,
            'ema21',
          ),
        macd:
          diagnosticStrength(
            analysis,
            'macd',
          ),
        momentum3:
          percentReturn(
            historicalCandles,
            3,
          ),
        momentum5:
          percentReturn(
            historicalCandles,
            5,
          ),
        momentum10:
          percentReturn(
            historicalCandles,
            10,
          ),
        momentum20:
          percentReturn(
            historicalCandles,
            20,
          ),
      });

      const buyScoreBucket =
        analysis.score <= 66
          ? 'score65-66'
          : analysis.score <= 68
            ? 'score67-68'
            : analysis.score <= 70
              ? 'score69-70'
              : 'score71+';

      registerSellBucketTrade(
        buyByScore[buyScoreBucket],
        pnl,
      );

      const buyConfidenceBucket =
        decision.confidence < 70
          ? 'conf65-69'
          : decision.confidence < 75
            ? 'conf70-74'
            : decision.confidence < 80
              ? 'conf75-79'
              : 'conf80+';

      registerSellBucketTrade(
        buyByConfidence[
          buyConfidenceBucket
        ],
        pnl,
      );

      if (pnl > 0) {
        diagnostics.buyWins += 1;
        diagnostics.buyGrossProfit += pnl;

        buyWinningScoreConfidence.trades += 1;
        buyWinningScoreConfidence.scoreTotal +=
          analysis.score;
        buyWinningScoreConfidence.confidenceTotal +=
          decision.confidence;

        registerSellIndicators(
          buyWinningIndicators,
          analysis,
        );

        registerSellMomentum(
          buyWinningMomentum,
          historicalCandles,
        );
      } else if (pnl < 0) {
        diagnostics.buyLosses += 1;
        diagnostics.buyGrossLoss +=
          Math.abs(pnl);

        buyLosingScoreConfidence.trades += 1;
        buyLosingScoreConfidence.scoreTotal +=
          analysis.score;
        buyLosingScoreConfidence.confidenceTotal +=
          decision.confidence;

        registerSellIndicators(
          buyLosingIndicators,
          analysis,
        );

        registerSellMomentum(
          buyLosingMomentum,
          historicalCandles,
        );
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

  console.log(
    '[TradeVision] Execution Costs',
    executionCosts,
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
    '[TradeVision] BUY por Score',
  );

  console.table({
    'score65-66':
      sellBucketSummary(
        buyByScore['score65-66'],
      ),
    'score67-68':
      sellBucketSummary(
        buyByScore['score67-68'],
      ),
    'score69-70':
      sellBucketSummary(
        buyByScore['score69-70'],
      ),
    'score71+':
      sellBucketSummary(
        buyByScore['score71+'],
      ),
  });

  console.log(
    '[TradeVision] BUY por Confidence',
  );

  console.table({
    'conf65-69':
      sellBucketSummary(
        buyByConfidence['conf65-69'],
      ),
    'conf70-74':
      sellBucketSummary(
        buyByConfidence['conf70-74'],
      ),
    'conf75-79':
      sellBucketSummary(
        buyByConfidence['conf75-79'],
      ),
    'conf80+':
      sellBucketSummary(
        buyByConfidence['conf80+'],
      ),
  });

  const buyScoreConfidenceSummary = (
    bucket: {
      trades: number;
      scoreTotal: number;
      confidenceTotal: number;
    },
  ) => {
    const divisor =
      bucket.trades > 0
        ? bucket.trades
        : 1;

    return {
      trades: bucket.trades,
      avgScore:
        bucket.scoreTotal / divisor,
      avgConfidence:
        bucket.confidenceTotal / divisor,
    };
  };

  console.log(
    '[TradeVision] BUY Winners vs Losers - Score/Confidence',
  );

  console.table({
    winners:
      buyScoreConfidenceSummary(
        buyWinningScoreConfidence,
      ),
    losers:
      buyScoreConfidenceSummary(
        buyLosingScoreConfidence,
      ),
  });

  console.log(
    '[TradeVision] BUY Winners vs Losers - Indicadores',
  );

  console.table({
    winners:
      sellIndicatorSummary(
        buyWinningIndicators,
      ),
    losers:
      sellIndicatorSummary(
        buyLosingIndicators,
      ),
  });

  console.log(
    '[TradeVision] BUY Winners vs Losers - Momentum',
  );

  console.table({
    winners:
      sellMomentumSummary(
        buyWinningMomentum,
      ),
    losers:
      sellMomentumSummary(
        buyLosingMomentum,
      ),
  });

  console.log(
    '[TradeVision] WIN15 BUY — VENCEDORES VS PERDEDORES',
  );

  const buyWinnerScoreConfidence =
    buyScoreConfidenceSummary(
      buyWinningScoreConfidence,
    );

  const buyLoserScoreConfidence =
    buyScoreConfidenceSummary(
      buyLosingScoreConfidence,
    );

  const buyWinnerIndicators =
    sellIndicatorSummary(
      buyWinningIndicators,
    );

  const buyLoserIndicators =
    sellIndicatorSummary(
      buyLosingIndicators,
    );

  const buyWinnerMomentum =
    sellMomentumSummary(
      buyWinningMomentum,
    );

  const buyLoserMomentum =
    sellMomentumSummary(
      buyLosingMomentum,
    );

  console.table({
    Trades: {
      WINNERS:
        buyWinnerScoreConfidence.trades,
      LOSERS:
        buyLoserScoreConfidence.trades,
    },

    'Score médio': {
      WINNERS:
        buyWinnerScoreConfidence.avgScore,
      LOSERS:
        buyLoserScoreConfidence.avgScore,
    },

    'Confidence média': {
      WINNERS:
        buyWinnerScoreConfidence.avgConfidence,
      LOSERS:
        buyLoserScoreConfidence.avgConfidence,
    },

    'EMA9 média': {
      WINNERS:
        buyWinnerIndicators.avgEma9,
      LOSERS:
        buyLoserIndicators.avgEma9,
    },

    'EMA21 média': {
      WINNERS:
        buyWinnerIndicators.avgEma21,
      LOSERS:
        buyLoserIndicators.avgEma21,
    },

    'RSI médio': {
      WINNERS:
        buyWinnerIndicators.avgRsi,
      LOSERS:
        buyLoserIndicators.avgRsi,
    },

    'MACD médio': {
      WINNERS:
        buyWinnerIndicators.avgMacd,
      LOSERS:
        buyLoserIndicators.avgMacd,
    },

    'Volume médio': {
      WINNERS:
        buyWinnerIndicators.avgVolume,
      LOSERS:
        buyLoserIndicators.avgVolume,
    },

    'Momentum 3': {
      WINNERS:
        buyWinnerMomentum.avgReturn3,
      LOSERS:
        buyLoserMomentum.avgReturn3,
    },

    'Momentum 5': {
      WINNERS:
        buyWinnerMomentum.avgReturn5,
      LOSERS:
        buyLoserMomentum.avgReturn5,
    },

    'Momentum 10': {
      WINNERS:
        buyWinnerMomentum.avgReturn10,
      LOSERS:
        buyLoserMomentum.avgReturn10,
    },

    'Momentum 20': {
      WINNERS:
        buyWinnerMomentum.avgReturn20,
      LOSERS:
        buyLoserMomentum.avgReturn20,
    },
  });


  if (
    strategyMode === 'BUY_ONLY' &&
    robustnessBuySamples.length > 0
  ) {
    const baseline =
      robustnessStats(
        robustnessBuySamples,
      );

    const filters: RobustnessFilter[] = [
      {
        name: 'BASELINE — TODOS',
        test: () => true,
      },
      {
        name: 'RSI < 50',
        test: (s) => s.rsi < 50,
      },
      {
        name: 'RSI 50-52',
        test: (s) =>
          s.rsi >= 50 && s.rsi < 52,
      },
      {
        name: 'RSI 52-54',
        test: (s) =>
          s.rsi >= 52 && s.rsi < 54,
      },
      {
        name: 'RSI 54-56',
        test: (s) =>
          s.rsi >= 54 && s.rsi < 56,
      },
      {
        name: 'RSI 56-58',
        test: (s) =>
          s.rsi >= 56 && s.rsi < 58,
      },
      {
        name: 'RSI 58-60',
        test: (s) =>
          s.rsi >= 58 && s.rsi < 60,
      },
      {
        name: 'RSI >= 60',
        test: (s) => s.rsi >= 60,
      },
      {
        name: 'RSI >= 52',
        test: (s) => s.rsi >= 52,
      },
      {
        name: 'RSI >= 54',
        test: (s) => s.rsi >= 54,
      },
      {
        name: 'RSI >= 56',
        test: (s) => s.rsi >= 56,
      },
      {
        name: 'M10 > 0',
        test: (s) =>
          s.momentum10 > 0,
      },
      {
        name: 'M10 >= 0.5%',
        test: (s) =>
          s.momentum10 >= 0.5,
      },
      {
        name: 'M10 >= 0.8%',
        test: (s) =>
          s.momentum10 >= 0.8,
      },
      {
        name: 'RSI>=54 + M10>0',
        test: (s) =>
          s.rsi >= 54 &&
          s.momentum10 > 0,
      },
      {
        name: 'RSI>=54 + M10>=0.5%',
        test: (s) =>
          s.rsi >= 54 &&
          s.momentum10 >= 0.5,
      },
      {
        name: 'RSI>=56 + M10>0',
        test: (s) =>
          s.rsi >= 56 &&
          s.momentum10 > 0,
      },
      {
        name: 'EMA9 >= EMA21',
        test: (s) =>
          s.ema9 >= s.ema21,
      },
      {
        name: 'RSI>=54 + EMA9>=EMA21',
        test: (s) =>
          s.rsi >= 54 &&
          s.ema9 >= s.ema21,
      },
    ];

    const minimumTrades =
      Math.max(
        20,
        Math.ceil(
          baseline.trades * 0.25,
        ),
      );

    const ranking = filters.map(
      (filter) => {
        const selected =
          robustnessBuySamples.filter(
            filter.test,
          );

        const stats =
          robustnessStats(selected);

        const retentionPct =
          baseline.trades > 0
            ? (stats.trades /
                baseline.trades) *
              100
            : 0;

        const pfVsBaseline =
          Number.isFinite(
            stats.profitFactor,
          ) &&
          Number.isFinite(
            baseline.profitFactor,
          )
            ? stats.profitFactor -
              baseline.profitFactor
            : 0;

        const netVsBaseline =
          stats.netProfit -
          baseline.netProfit;

        const validSample =
          stats.trades >= minimumTrades;

        const robustnessScore =
          validSample
            ? (
                stats.profitFactor * 40 +
                stats.winRate * 0.4 +
                retentionPct * 0.15 +
                Math.max(
                  -20,
                  Math.min(
                    20,
                    netVsBaseline / 50,
                  ),
                )
              )
            : -999;

        return {
          filtro: filter.name,
          trades: stats.trades,
          retencaoPct: retentionPct,
          winRate: stats.winRate,
          netProfit: stats.netProfit,
          profitFactor: stats.profitFactor,
          maxDrawdownMoney:
            stats.maxDrawdownMoney,
          pfVsBaseline,
          netVsBaseline,
          amostraValida: validSample,
          robustnessScore,
        };
      },
    );

    ranking.sort(
      (a, b) =>
        b.robustnessScore -
        a.robustnessScore,
    );

    console.log(
      '[TradeVision] LAB ROBUSTEZ V1 — BASELINE',
      {
        ...baseline,
        minimumTrades,
      },
    );

    console.log(
      '[TradeVision] LAB ROBUSTEZ V1 — RANKING DE FILTROS',
    );
    console.table(ranking);

    console.log(
      '[TradeVision] LAB ROBUSTEZ V1 — TOP 5',
    );
    console.table(
      ranking
        .filter(
          (row) => row.amostraValida,
        )
        .slice(0, 5),
    );

    console.log(
      '[TradeVision] LAB ROBUSTEZ V1 — nenhum filtro foi aplicado à estratégia; resultado apenas exploratório.',
    );
  }

  if (strategyMode !== 'BUY_ONLY') {
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

  }

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