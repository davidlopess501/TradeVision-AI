import type { Candle } from '@/types';

export type FibonacciDirection =
  | 'BULLISH'
  | 'BEARISH';

export interface FibonacciLevel {
  ratio: number;
  label: string;
  price: number;
  type: 'RETRACEMENT' | 'EXTENSION';
}

export interface FibonacciAnalysis {
  direction: FibonacciDirection;
  startIndex: number;
  endIndex: number;
  startTime: number;
  endTime: number;
  low: number;
  high: number;
  range: number;
  levels: FibonacciLevel[];
  nearestLevel: FibonacciLevel | null;
  currentPrice: number;
}

interface FibonacciOptions {
  lookback?: number;
  minimumMovementPercent?: number;
}

const DEFAULT_OPTIONS: Required<FibonacciOptions> = {
  lookback: 120,
  minimumMovementPercent: 0.08,
};

const RETRACEMENTS = [
  { ratio: 0, label: '0%' },
  { ratio: 0.236, label: '23,6%' },
  { ratio: 0.382, label: '38,2%' },
  { ratio: 0.5, label: '50%' },
  { ratio: 0.618, label: '61,8%' },
  { ratio: 0.786, label: '78,6%' },
  { ratio: 1, label: '100%' },
];

const EXTENSIONS = [
  { ratio: 1.272, label: '127,2%' },
  { ratio: 1.618, label: '161,8%' },
];

function findLowestCandle(
  candles: Candle[],
): { index: number; candle: Candle } {
  let lowestIndex = 0;

  for (
    let index = 1;
    index < candles.length;
    index += 1
  ) {
    if (
      candles[index].low <
      candles[lowestIndex].low
    ) {
      lowestIndex = index;
    }
  }

  return {
    index: lowestIndex,
    candle: candles[lowestIndex],
  };
}

function findHighestCandle(
  candles: Candle[],
): { index: number; candle: Candle } {
  let highestIndex = 0;

  for (
    let index = 1;
    index < candles.length;
    index += 1
  ) {
    if (
      candles[index].high >
      candles[highestIndex].high
    ) {
      highestIndex = index;
    }
  }

  return {
    index: highestIndex,
    candle: candles[highestIndex],
  };
}

function calculateLevelPrice(
  direction: FibonacciDirection,
  low: number,
  high: number,
  ratio: number,
): number {
  const range = high - low;

  if (direction === 'BULLISH') {
    return high - range * ratio;
  }

  return low + range * ratio;
}

function calculateExtensionPrice(
  direction: FibonacciDirection,
  low: number,
  high: number,
  ratio: number,
): number {
  const range = high - low;

  if (direction === 'BULLISH') {
    return low + range * ratio;
  }

  return high - range * ratio;
}

function findNearestLevel(
  levels: FibonacciLevel[],
  currentPrice: number,
): FibonacciLevel | null {
  if (levels.length === 0) {
    return null;
  }

  return [...levels].sort(
    (first, second) =>
      Math.abs(
        first.price - currentPrice,
      ) -
      Math.abs(
        second.price - currentPrice,
      ),
  )[0];
}

export function analyzeFibonacci(
  candles: Candle[],
  customOptions: FibonacciOptions = {},
): FibonacciAnalysis | null {
  const options = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  if (candles.length < 10) {
    return null;
  }

  const selectedCandles = candles.slice(
    -options.lookback,
  );

  const offset =
    candles.length -
    selectedCandles.length;

  const lowest =
    findLowestCandle(selectedCandles);

  const highest =
    findHighestCandle(selectedCandles);

  const low = lowest.candle.low;
  const high = highest.candle.high;
  const range = high - low;

  if (range <= 0) {
    return null;
  }

  const referencePrice =
    Math.max(
      selectedCandles[
        selectedCandles.length - 1
      ].close,
      Number.EPSILON,
    );

  const movementPercent =
    (range / referencePrice) * 100;

  if (
    movementPercent <
    options.minimumMovementPercent
  ) {
    return null;
  }

  const direction: FibonacciDirection =
    lowest.index < highest.index
      ? 'BULLISH'
      : 'BEARISH';

  const retracementLevels =
    RETRACEMENTS.map((item) => ({
      ratio: item.ratio,
      label: item.label,
      price: calculateLevelPrice(
        direction,
        low,
        high,
        item.ratio,
      ),
      type:
        'RETRACEMENT' as const,
    }));

  const extensionLevels =
    EXTENSIONS.map((item) => ({
      ratio: item.ratio,
      label: item.label,
      price: calculateExtensionPrice(
        direction,
        low,
        high,
        item.ratio,
      ),
      type:
        'EXTENSION' as const,
    }));

  const levels = [
    ...retracementLevels,
    ...extensionLevels,
  ];

  const currentPrice =
    candles[candles.length - 1].close;

  return {
    direction,
    startIndex:
      offset +
      (direction === 'BULLISH'
        ? lowest.index
        : highest.index),
    endIndex:
      offset +
      (direction === 'BULLISH'
        ? highest.index
        : lowest.index),
    startTime:
      direction === 'BULLISH'
        ? lowest.candle.time
        : highest.candle.time,
    endTime:
      direction === 'BULLISH'
        ? highest.candle.time
        : lowest.candle.time,
    low,
    high,
    range,
    levels,
    nearestLevel:
      findNearestLevel(
        levels,
        currentPrice,
      ),
    currentPrice,
  };
}