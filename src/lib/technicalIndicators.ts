import type { Candle } from '@/types';

function validatePeriod(period: number, indicator: string): void {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error(
      `O período do ${indicator} deve ser um número inteiro positivo.`,
    );
  }
}

export function calculateEMA(
  values: number[],
  period: number,
): number {
  validatePeriod(period, 'EMA');

  if (values.length < period) {
    throw new Error(
      `São necessários pelo menos ${period} valores para calcular a EMA.`,
    );
  }

  let ema =
    values
      .slice(0, period)
      .reduce((total, value) => total + value, 0) / period;

  const multiplier = 2 / (period + 1);

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
  }

  return ema;
}

export function calculateEMASeries(
  values: number[],
  period: number,
): number[] {
  validatePeriod(period, 'EMA');

  if (values.length < period) {
    throw new Error(
      `São necessários pelo menos ${period} valores para calcular a série EMA.`,
    );
  }

  let ema =
    values
      .slice(0, period)
      .reduce((total, value) => total + value, 0) / period;

  const result = [ema];
  const multiplier = 2 / (period + 1);

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
    result.push(ema);
  }

  return result;
}

export function calculateRSI(
  values: number[],
  period = 14,
): number {
  validatePeriod(period, 'RSI');

  if (values.length <= period) {
    throw new Error(
      `São necessários pelo menos ${period + 1} valores para calcular o RSI.`,
    );
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  if (averageGain === 0) {
    return 0;
  }

  const relativeStrength = averageGain / averageLoss;

  return 100 - 100 / (1 + relativeStrength);
}

export interface MacdResult {
  macd: number;
  signal: number;
  histogram: number;
}

export function calculateMACD(
  values: number[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9,
): MacdResult {
  if (values.length < slowPeriod + signalPeriod) {
    throw new Error(
      `São necessários pelo menos ${
        slowPeriod + signalPeriod
      } valores para calcular o MACD.`,
    );
  }

  const fastSeries = calculateEMASeries(values, fastPeriod);
  const slowSeries = calculateEMASeries(values, slowPeriod);
  const offset = slowPeriod - fastPeriod;

  const macdSeries = slowSeries.map(
    (slowValue, index) =>
      fastSeries[index + offset] - slowValue,
  );

  const signalSeries = calculateEMASeries(
    macdSeries,
    signalPeriod,
  );

  const macd = macdSeries[macdSeries.length - 1];
  const signal = signalSeries[signalSeries.length - 1];

  return {
    macd,
    signal,
    histogram: macd - signal,
  };
}

export function calculateATR(
  candles: Candle[],
  period = 14,
): number {
  validatePeriod(period, 'ATR');

  if (candles.length <= period) {
    throw new Error(
      `São necessários pelo menos ${period + 1} candles para calcular o ATR.`,
    );
  }

  const trueRanges: number[] = [];

  for (let index = 1; index < candles.length; index += 1) {
    const current = candles[index];
    const previousClose = candles[index - 1].close;

    const highLow = current.high - current.low;
    const highPrevious = Math.abs(current.high - previousClose);
    const lowPrevious = Math.abs(current.low - previousClose);

    trueRanges.push(
      Math.max(highLow, highPrevious, lowPrevious),
    );
  }

  let atr =
    trueRanges
      .slice(0, period)
      .reduce((total, value) => total + value, 0) / period;

  for (
    let index = period;
    index < trueRanges.length;
    index += 1
  ) {
    atr =
      (atr * (period - 1) + trueRanges[index]) / period;
  }

  return atr;
}

export function calculateAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce((total, value) => total + value, 0) /
    values.length
  );
}