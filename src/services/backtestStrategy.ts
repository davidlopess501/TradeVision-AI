import type {
  Candle,
} from '@/types';

export type BacktestSignal =
  | 'BUY'
  | 'SELL'
  | 'WAIT';

export interface BacktestStrategySignal {
  signal: BacktestSignal;
  index: number;
  price: number;
}

function average(
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce(
      (total, value) =>
        total + value,
      0,
    ) / values.length
  );
}

export function generateBacktestSignals(
  candles: Candle[],
): BacktestStrategySignal[] {
  const signals:
    BacktestStrategySignal[] = [];

  if (candles.length < 21) {
    return signals;
  }

  for (
    let index = 20;
    index < candles.length;
    index += 1
  ) {
    const shortWindow =
      candles
        .slice(
          index - 8,
          index + 1,
        )
        .map(
          (candle) =>
            candle.close,
        );

    const longWindow =
      candles
        .slice(
          index - 20,
          index + 1,
        )
        .map(
          (candle) =>
            candle.close,
        );

    const shortAverage =
      average(shortWindow);

    const longAverage =
      average(longWindow);

    const previousShortAverage =
      average(
        candles
          .slice(
            index - 9,
            index,
          )
          .map(
            (candle) =>
              candle.close,
          ),
      );

    const previousLongAverage =
      average(
        candles
          .slice(
            index - 21,
            index,
          )
          .map(
            (candle) =>
              candle.close,
          ),
      );

    const crossedUp =
      previousShortAverage <=
        previousLongAverage &&
      shortAverage >
        longAverage;

    const crossedDown =
      previousShortAverage >=
        previousLongAverage &&
      shortAverage <
        longAverage;

    if (crossedUp) {
      signals.push({
        signal: 'BUY',
        index,
        price:
          candles[index].close,
      });

      continue;
    }

    if (crossedDown) {
      signals.push({
        signal: 'SELL',
        index,
        price:
          candles[index].close,
      });

      continue;
    }

    signals.push({
      signal: 'WAIT',
      index,
      price:
        candles[index].close,
    });
  }

  return signals;
}