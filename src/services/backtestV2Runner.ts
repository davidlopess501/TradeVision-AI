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
  ASSETS,
} from '@/lib/assets';

export interface BacktestV2Config {
  asset: Asset;
  timeframe: Timeframe;
  initialCapital: number;
  candles: Candle[];
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

  minScore: number;
  maxScore: number;
  scoreTotal: number;

  minConfidence: number;
  maxConfidence: number;
  confidenceTotal: number;

  riskBlockReasons: Record<string, number>;
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

export async function runBacktestV2(
  config: BacktestV2Config,
): Promise<BacktestResult> {
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
      analysis.score >= 65 &&
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

    const entry =
      preparedOrder.entry;

    const exit =
      nextCandle.close;

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
        nextCandle.time,
    });

    diagnostics.tradesExecuted += 1;
  }

  const divisor =
    diagnostics.windowsEvaluated > 0
      ? diagnostics.windowsEvaluated
      : 1;

  console.group(
    '[TradeVision] Backtesting V2 Criteria Diagnostics',
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