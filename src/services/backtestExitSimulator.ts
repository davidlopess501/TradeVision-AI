import type {
  Candle,
} from '@/types';

export type BacktestExitReason =
  | 'STOP'
  | 'TARGET'
  | 'END_OF_DATA';

export interface BacktestExitResult {
  exitPrice: number;
  closedAt: number;
  reason: BacktestExitReason;
  exitIndex: number;
}

interface SimulateExitParams {
  side: 'BUY' | 'SELL';
  stop: number;
  target: number;
  candles: Candle[];
  startIndex: number;
}

export function simulateBacktestExit({
  side,
  stop,
  target,
  candles,
  startIndex,
}: SimulateExitParams): BacktestExitResult | null {
  for (
    let index = startIndex;
    index < candles.length;
    index += 1
  ) {
    const candle =
      candles[index];

    if (side === 'BUY') {
      const hitStop =
        candle.low <= stop;

      const hitTarget =
        candle.high >= target;

      if (
        hitStop &&
        hitTarget
      ) {
        return {
          exitPrice: stop,
          closedAt: candle.time,
          reason: 'STOP',
          exitIndex: index,
        };
      }

      if (hitStop) {
        return {
          exitPrice: stop,
          closedAt: candle.time,
          reason: 'STOP',
          exitIndex: index,
        };
      }

      if (hitTarget) {
        return {
          exitPrice: target,
          closedAt: candle.time,
          reason: 'TARGET',
          exitIndex: index,
        };
      }
    }

    if (side === 'SELL') {
      const hitStop =
        candle.high >= stop;

      const hitTarget =
        candle.low <= target;

      if (
        hitStop &&
        hitTarget
      ) {
        return {
          exitPrice: stop,
          closedAt: candle.time,
          reason: 'STOP',
          exitIndex: index,
        };
      }

      if (hitStop) {
        return {
          exitPrice: stop,
          closedAt: candle.time,
          reason: 'STOP',
          exitIndex: index,
        };
      }

      if (hitTarget) {
        return {
          exitPrice: target,
          closedAt: candle.time,
          reason: 'TARGET',
          exitIndex: index,
        };
      }
    }
  }

  const lastIndex =
    candles.length - 1;

  if (
    lastIndex <
    startIndex
  ) {
    return null;
  }

  const lastCandle =
    candles[lastIndex];

  return {
    exitPrice:
      lastCandle.close,
    closedAt:
      lastCandle.time,
    reason:
      'END_OF_DATA',
    exitIndex:
      lastIndex,
  };
}