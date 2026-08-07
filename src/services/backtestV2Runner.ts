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
  decisionBuy: number;
  decisionSell: number;
  decisionWait: number;
  ordersReady: number;
  ordersBlocked: number;
  riskApproved: number;
  riskBlocked: number;
  tradesExecuted: number;
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
      decisionBuy: 0,
      decisionSell: 0,
      decisionWait: 0,
      ordersReady: 0,
      ordersBlocked: 0,
      riskApproved: 0,
      riskBlocked: 0,
      tradesExecuted: 0,
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

    if (decision.action === 'BUY') {
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

  console.group(
    '[TradeVision] Backtesting V2 Diagnostics',
  );

  console.table({
    candlesReceived:
      diagnostics.candlesReceived,
    windowsEvaluated:
      diagnostics.windowsEvaluated,
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