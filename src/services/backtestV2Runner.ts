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

export async function runBacktestV2(
  config: BacktestV2Config,
): Promise<BacktestResult> {
  const trades:
    BacktestTrade[] = [];

  const windowSize = 120;

  for (
    let index = windowSize;
    index < config.candles.length;
    index += 1
  ) {
    const historicalCandles =
      config.candles.slice(
        index - windowSize,
        index + 1,
      );

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

    const preparedOrder =
      prepareOrder(
        analysis,
        decision,
      );

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
      preparedOrder.status !== 'READY' ||
      !preparedOrder.side ||
      risk.decision !== 'APPROVED' ||
      risk.quantity < 1
    ) {
      continue;
    }

    const nextCandle =
      config.candles[
        index + 1
      ];

    if (!nextCandle) {
      break;
    }

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
  }

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