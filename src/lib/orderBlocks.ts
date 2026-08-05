import type { Candle } from '@/types';

export type OrderBlockDirection =
  | 'BULLISH'
  | 'BEARISH';

export type OrderBlockStatus =
  | 'ACTIVE'
  | 'MITIGATED'
  | 'INVALIDATED';

export interface OrderBlock {
  id: string;
  direction: OrderBlockDirection;
  status: OrderBlockStatus;

  startIndex: number;
  confirmationIndex: number;

  startTime: number;
  confirmationTime: number;

  high: number;
  low: number;
  midpoint: number;

  impulseSize: number;
  impulsePercent: number;

  volume: number;
  strength: number;
}

export interface OrderBlockAnalysis {
  bullish: OrderBlock[];
  bearish: OrderBlock[];
  active: OrderBlock[];
  nearestBullish: OrderBlock | null;
  nearestBearish: OrderBlock | null;
}

interface DetectionOptions {
  lookback?: number;
  impulseCandles?: number;
  minimumImpulseAtr?: number;
  minimumBodyRatio?: number;
  maximumBlocks?: number;
}

const DEFAULT_OPTIONS: Required<DetectionOptions> = {
  lookback: 120,
  impulseCandles: 3,
  minimumImpulseAtr: 1.2,
  minimumBodyRatio: 0.35,
  maximumBlocks: 8,
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(
    minimum,
    Math.min(maximum, value),
  );
}

function candleBody(candle: Candle): number {
  return Math.abs(
    candle.close - candle.open,
  );
}

function candleRange(candle: Candle): number {
  return Math.max(
    candle.high - candle.low,
    Number.EPSILON,
  );
}

function bodyRatio(candle: Candle): number {
  return (
    candleBody(candle) /
    candleRange(candle)
  );
}

function isBullishCandle(
  candle: Candle,
): boolean {
  return candle.close > candle.open;
}

function isBearishCandle(
  candle: Candle,
): boolean {
  return candle.close < candle.open;
}

function calculateTrueRange(
  current: Candle,
  previous: Candle,
): number {
  return Math.max(
    current.high - current.low,
    Math.abs(
      current.high - previous.close,
    ),
    Math.abs(
      current.low - previous.close,
    ),
  );
}

function calculateAtrSeries(
  candles: Candle[],
  period = 14,
): number[] {
  if (candles.length === 0) {
    return [];
  }

  const trueRanges: number[] = [0];

  for (
    let index = 1;
    index < candles.length;
    index += 1
  ) {
    trueRanges.push(
      calculateTrueRange(
        candles[index],
        candles[index - 1],
      ),
    );
  }

  const atrSeries = new Array<number>(
    candles.length,
  ).fill(0);

  for (
    let index = 1;
    index < candles.length;
    index += 1
  ) {
    const start = Math.max(
      1,
      index - period + 1,
    );

    const selected =
      trueRanges.slice(
        start,
        index + 1,
      );

    atrSeries[index] =
      selected.reduce(
        (total, value) =>
          total + value,
        0,
      ) / selected.length;
  }

  return atrSeries;
}

function calculateAverageVolume(
  candles: Candle[],
  endIndex: number,
  period = 20,
): number {
  const startIndex = Math.max(
    0,
    endIndex - period + 1,
  );

  const selected = candles.slice(
    startIndex,
    endIndex + 1,
  );

  if (selected.length === 0) {
    return 0;
  }

  return (
    selected.reduce(
      (total, candle) =>
        total + candle.volume,
      0,
    ) / selected.length
  );
}

function calculateImpulse(
  candles: Candle[],
  startIndex: number,
  count: number,
): {
  high: number;
  low: number;
  close: number;
  size: number;
} | null {
  const endIndex =
    startIndex + count - 1;

  if (
    startIndex < 0 ||
    endIndex >= candles.length
  ) {
    return null;
  }

  const selected = candles.slice(
    startIndex,
    endIndex + 1,
  );

  const high = Math.max(
    ...selected.map(
      (candle) => candle.high,
    ),
  );

  const low = Math.min(
    ...selected.map(
      (candle) => candle.low,
    ),
  );

  const close =
    selected[selected.length - 1].close;

  return {
    high,
    low,
    close,
    size: high - low,
  };
}

function createId(
  direction: OrderBlockDirection,
  time: number,
  index: number,
): string {
  return `${direction}-${time}-${index}`;
}

function scoreOrderBlock(
  impulseAtrRatio: number,
  bodyStrength: number,
  volumeRatio: number,
): number {
  const impulseScore = clamp(
    impulseAtrRatio * 22,
    0,
    45,
  );

  const bodyScore = clamp(
    bodyStrength * 30,
    0,
    30,
  );

  const volumeScore = clamp(
    volumeRatio * 12,
    0,
    25,
  );

  return Math.round(
    clamp(
      impulseScore +
        bodyScore +
        volumeScore,
      0,
      100,
    ),
  );
}

function detectBullishOrderBlock(
  candles: Candle[],
  atrSeries: number[],
  index: number,
  options: Required<DetectionOptions>,
): OrderBlock | null {
  const origin = candles[index];

  if (
    !isBearishCandle(origin) ||
    bodyRatio(origin) <
      options.minimumBodyRatio
  ) {
    return null;
  }

  const impulse = calculateImpulse(
    candles,
    index + 1,
    options.impulseCandles,
  );

  if (!impulse) {
    return null;
  }

  const atr =
    atrSeries[index] ||
    candleRange(origin);

  const impulseSize =
    impulse.high - origin.low;

  const impulseAtrRatio =
    impulseSize / Math.max(
      atr,
      Number.EPSILON,
    );

  const brokeOriginHigh =
    impulse.close > origin.high;

  if (
    !brokeOriginHigh ||
    impulseAtrRatio <
      options.minimumImpulseAtr
  ) {
    return null;
  }

  const averageVolume =
    calculateAverageVolume(
      candles,
      index,
    );

  const volumeRatio =
    averageVolume > 0
      ? origin.volume /
        averageVolume
      : 1;

  const midpoint =
    (origin.high + origin.low) / 2;

  return {
    id: createId(
      'BULLISH',
      origin.time,
      index,
    ),
    direction: 'BULLISH',
    status: 'ACTIVE',

    startIndex: index,
    confirmationIndex:
      index +
      options.impulseCandles,

    startTime: origin.time,
    confirmationTime:
      candles[
        index +
          options.impulseCandles
      ].time,

    high: origin.high,
    low: origin.low,
    midpoint,

    impulseSize,
    impulsePercent:
      (impulseSize /
        Math.max(
          origin.close,
          Number.EPSILON,
        )) *
      100,

    volume: origin.volume,

    strength: scoreOrderBlock(
      impulseAtrRatio,
      bodyRatio(origin),
      volumeRatio,
    ),
  };
}

function detectBearishOrderBlock(
  candles: Candle[],
  atrSeries: number[],
  index: number,
  options: Required<DetectionOptions>,
): OrderBlock | null {
  const origin = candles[index];

  if (
    !isBullishCandle(origin) ||
    bodyRatio(origin) <
      options.minimumBodyRatio
  ) {
    return null;
  }

  const impulse = calculateImpulse(
    candles,
    index + 1,
    options.impulseCandles,
  );

  if (!impulse) {
    return null;
  }

  const atr =
    atrSeries[index] ||
    candleRange(origin);

  const impulseSize =
    origin.high - impulse.low;

  const impulseAtrRatio =
    impulseSize / Math.max(
      atr,
      Number.EPSILON,
    );

  const brokeOriginLow =
    impulse.close < origin.low;

  if (
    !brokeOriginLow ||
    impulseAtrRatio <
      options.minimumImpulseAtr
  ) {
    return null;
  }

  const averageVolume =
    calculateAverageVolume(
      candles,
      index,
    );

  const volumeRatio =
    averageVolume > 0
      ? origin.volume /
        averageVolume
      : 1;

  const midpoint =
    (origin.high + origin.low) / 2;

  return {
    id: createId(
      'BEARISH',
      origin.time,
      index,
    ),
    direction: 'BEARISH',
    status: 'ACTIVE',

    startIndex: index,
    confirmationIndex:
      index +
      options.impulseCandles,

    startTime: origin.time,
    confirmationTime:
      candles[
        index +
          options.impulseCandles
      ].time,

    high: origin.high,
    low: origin.low,
    midpoint,

    impulseSize,
    impulsePercent:
      (impulseSize /
        Math.max(
          origin.close,
          Number.EPSILON,
        )) *
      100,

    volume: origin.volume,

    strength: scoreOrderBlock(
      impulseAtrRatio,
      bodyRatio(origin),
      volumeRatio,
    ),
  };
}

function evaluateOrderBlockStatus(
  block: OrderBlock,
  candles: Candle[],
): OrderBlockStatus {
  let touched = false;

  for (
    let index =
      block.confirmationIndex + 1;
    index < candles.length;
    index += 1
  ) {
    const candle = candles[index];

    const enteredZone =
      candle.low <= block.high &&
      candle.high >= block.low;

    if (enteredZone) {
      touched = true;
    }

    if (
      block.direction ===
        'BULLISH' &&
      candle.close < block.low
    ) {
      return 'INVALIDATED';
    }

    if (
      block.direction ===
        'BEARISH' &&
      candle.close > block.high
    ) {
      return 'INVALIDATED';
    }
  }

  return touched
    ? 'MITIGATED'
    : 'ACTIVE';
}

function removeOverlappingBlocks(
  blocks: OrderBlock[],
): OrderBlock[] {
  const sorted = [...blocks].sort(
    (first, second) =>
      second.strength -
      first.strength,
  );

  const result: OrderBlock[] = [];

  for (const block of sorted) {
    const overlaps =
      result.some((existing) => {
        if (
          existing.direction !==
          block.direction
        ) {
          return false;
        }

        const intersection =
          Math.min(
            existing.high,
            block.high,
          ) -
          Math.max(
            existing.low,
            block.low,
          );

        if (intersection <= 0) {
          return false;
        }

        const smallerRange =
          Math.min(
            existing.high -
              existing.low,
            block.high - block.low,
          );

        return (
          intersection /
            Math.max(
              smallerRange,
              Number.EPSILON,
            ) >
          0.65
        );
      });

    if (!overlaps) {
      result.push(block);
    }
  }

  return result.sort(
    (first, second) =>
      first.startIndex -
      second.startIndex,
  );
}

function findNearestBlock(
  blocks: OrderBlock[],
  price: number,
  direction: OrderBlockDirection,
): OrderBlock | null {
  const valid = blocks.filter(
    (block) =>
      block.direction === direction &&
      block.status !== 'INVALIDATED',
  );

  if (valid.length === 0) {
    return null;
  }

  return [...valid].sort(
    (first, second) => {
      const firstDistance =
        Math.abs(
          first.midpoint - price,
        );

      const secondDistance =
        Math.abs(
          second.midpoint - price,
        );

      return (
        firstDistance -
        secondDistance
      );
    },
  )[0];
}

export function detectOrderBlocks(
  candles: Candle[],
  customOptions: DetectionOptions = {},
): OrderBlock[] {
  const options = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  if (
    candles.length <
    options.impulseCandles + 2
  ) {
    return [];
  }

  const startIndex = Math.max(
    0,
    candles.length -
      options.lookback,
  );

  const atrSeries =
    calculateAtrSeries(candles);

  const blocks: OrderBlock[] = [];

  const lastCandidateIndex =
    candles.length -
    options.impulseCandles -
    1;

  for (
    let index = startIndex;
    index <= lastCandidateIndex;
    index += 1
  ) {
    const bullish =
      detectBullishOrderBlock(
        candles,
        atrSeries,
        index,
        options,
      );

    if (bullish) {
      blocks.push(bullish);
    }

    const bearish =
      detectBearishOrderBlock(
        candles,
        atrSeries,
        index,
        options,
      );

    if (bearish) {
      blocks.push(bearish);
    }
  }

  const evaluated = blocks.map(
    (block) => ({
      ...block,
      status:
        evaluateOrderBlockStatus(
          block,
          candles,
        ),
    }),
  );

  return removeOverlappingBlocks(
    evaluated,
  )
    .sort(
      (first, second) =>
        second.startIndex -
        first.startIndex,
    )
    .slice(
      0,
      options.maximumBlocks,
    )
    .sort(
      (first, second) =>
        first.startIndex -
        second.startIndex,
    );
}

export function analyzeOrderBlocks(
  candles: Candle[],
  options: DetectionOptions = {},
): OrderBlockAnalysis {
  const blocks = detectOrderBlocks(
    candles,
    options,
  );

  const bullish = blocks.filter(
    (block) =>
      block.direction === 'BULLISH',
  );

  const bearish = blocks.filter(
    (block) =>
      block.direction === 'BEARISH',
  );

  const active = blocks.filter(
    (block) =>
      block.status === 'ACTIVE',
  );

  const currentPrice =
    candles.length > 0
      ? candles[candles.length - 1]
          .close
      : 0;

  return {
    bullish,
    bearish,
    active,

    nearestBullish:
      findNearestBlock(
        blocks,
        currentPrice,
        'BULLISH',
      ),

    nearestBearish:
      findNearestBlock(
        blocks,
        currentPrice,
        'BEARISH',
      ),
  };
}