import type {
  Asset,
  Candle,
  Timeframe,
} from '@/types';

import {
  runBacktest,
  type BacktestResult,
  type BacktestTrade,
} from './backtestEngine';

import {
  generateBacktestSignals,
} from './backtestStrategy';

import {
  ASSETS,
} from '@/lib/assets';

export interface BacktestRunnerConfig {
  asset: Asset;
  timeframe: Timeframe;
  initialCapital: number;
  quantity: number;
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

export async function runStrategyBacktest(
  config: BacktestRunnerConfig,
): Promise<BacktestResult> {
  const signals =
    generateBacktestSignals(
      config.candles,
    );

  const trades:
    BacktestTrade[] = [];

  let openTrade:
    | {
        side: 'BUY' | 'SELL';
        entry: number;
        openedAt: number;
      }
    | null = null;

  for (const signal of signals) {
    if (
      signal.signal === 'WAIT'
    ) {
      continue;
    }

    const candle =
      config.candles[
        signal.index
      ];

    if (!openTrade) {
      openTrade = {
        side: signal.signal,
        entry: signal.price,
        openedAt: candle.time,
      };

      continue;
    }

    if (
      openTrade.side ===
      signal.signal
    ) {
      continue;
    }

    const exit =
      signal.price;

    const points =
      openTrade.side === 'BUY'
        ? exit - openTrade.entry
        : openTrade.entry - exit;

    const pnl =
      points *
      moneyPerPoint(
        config.asset,
      ) *
      config.quantity;

    trades.push({
      id: uid(),
      side: openTrade.side,
      entry:
        openTrade.entry,
      exit,
      pnl,
      openedAt:
        openTrade.openedAt,
      closedAt:
        candle.time,
    });

    openTrade = {
      side: signal.signal,
      entry: signal.price,
      openedAt: candle.time,
    };
  }

  return runBacktest(
    {
      asset: config.asset,
      timeframe:
        config.timeframe,
      initialCapital:
        config.initialCapital,
      quantity:
        config.quantity,
    },
    trades,
  );
}