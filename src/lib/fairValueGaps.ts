import type { Candle } from '@/types';

export type FairValueGapDirection =
  | 'BULLISH'
  | 'BEARISH';

export type FairValueGapStatus =
  | 'OPEN'
  | 'PARTIAL'
  | 'FILLED'
  | 'INVALIDATED';

export interface FairValueGap {
  id: string;
  direction: FairValueGapDirection;
  status: FairValueGapStatus;

  startIndex: number;
  confirmationIndex: number;

  startTime: number;
  confirmationTime: number;

  high: number;
  low: number;
  midpoint: number;

  size: number;
  sizePercent: number;
  fillPercent: number;

  strength: number;
}

export interface FairValueGapAnalysis {
  gaps: FairValueGap[];
  bullish: FairValueGap[];
  bearish: FairValueGap[];
  open: FairValueGap[];
  nearestBullish: FairValueGap | null;
  nearestBearish: FairValueGap | null;
}

interface DetectionOptions {
  lookback?: number;
  minimumGapPercent?: number;
  maximumGaps?: number;
  useWicks?: boolean;
}

const DEFAULT_OPTIONS: Required<DetectionOptions> = {
  lookback: 120,
  minimumGapPercent: 0.015,
  maximumGaps: 10,
  useWicks: true,
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

function createId(
  direction: FairValueGapDirection,
  time: number,
  index: number,
): string {
  return `${direction}-${time}-${index}`;
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

function calculateBodyRatio(
  candle: Candle,
): number {
  return (
    candleBody(candle) /
    candleRange(candle)
  );
}

function calculateGapStrength(
  gapPercent: number,
  impulseBodyRatio: number,
): number {
  const gapScore = clamp(
    gapPercent * 1200,
    0,
    65,
  );

  const impulseScore = clamp(
    impulseBodyRatio * 35,
    0,
    35,
  );

  return Math.round(
    clamp(
      gapScore + impulseScore,
      0,
      100,
    ),
  );
}

function detectBullishGap(
  candles: Candle[],
  index: number,
  options: Required<DetectionOptions>,
): FairValueGap | null {
  const first = candles[index];
  const middle = candles[index + 1];
  const third = candles[index + 2];

  if (!first || !middle || !third) {
    return null;
  }

  const firstHigh = options.useWicks
    ? first.high
    : Math.max(first.open, first.close);

  const thirdLow = options.useWicks
    ? third.low
    : Math.min(third.open, third.close);

  if (thirdLow <= firstHigh) {
    return null;
  }

  const gapLow = firstHigh;
  const gapHigh = thirdLow;
  const size = gapHigh - gapLow;

  const referencePrice = Math.max(
    middle.close,
    Number.EPSILON,
  );

  const sizePercent =
    (size / referencePrice) * 100;

  if (
    sizePercent <
    options.minimumGapPercent
  ) {
    return null;
  }

  const middleBullish =
    middle.close > middle.open;

  if (!middleBullish) {
    return null;
  }

  return {
    id: createId(
      'BULLISH',
      first.time,
      index,
    ),

    direction: 'BULLISH',
    status: 'OPEN',

    startIndex: index,
    confirmationIndex: index + 2,

    startTime: first.time,
    confirmationTime: third.time,

    high: gapHigh,
    low: gapLow,
    midpoint:
      (gapHigh + gapLow) / 2,

    size,
    sizePercent,
    fillPercent: 0,

    strength: calculateGapStrength(
      sizePercent,
      calculateBodyRatio(middle),
    ),
  };
}

function detectBearishGap(
  candles: Candle[],
  index: number,
  options: Required<DetectionOptions>,
): FairValueGap | null {
  const first = candles[index];
  const middle = candles[index + 1];
  const third = candles[index + 2];

  if (!first || !middle || !third) {
    return null;
  }

  const firstLow = options.useWicks
    ? first.low
    : Math.min(first.open, first.close);

  const thirdHigh = options.useWicks
    ? third.high
    : Math.max(third.open, third.close);

  if (thirdHigh >= firstLow) {
    return null;
  }

  const gapLow = thirdHigh;
  const gapHigh = firstLow;
  const size = gapHigh - gapLow;

  const referencePrice = Math.max(
    middle.close,
    Number.EPSILON,
  );

  const sizePercent =
    (size / referencePrice) * 100;

  if (
    sizePercent <
    options.minimumGapPercent
  ) {
    return null;
  }

  const middleBearish =
    middle.close < middle.open;

  if (!middleBearish) {
    return null;
  }

  return {
    id: createId(
      'BEARISH',
      first.time,
      index,
    ),

    direction: 'BEARISH',
    status: 'OPEN',

    startIndex: index,
    confirmationIndex: index + 2,

    startTime: first.time,
    confirmationTime: third.time,

    high: gapHigh,
    low: gapLow,
    midpoint:
      (gapHigh + gapLow) / 2,

    size,
    sizePercent,
    fillPercent: 0,

    strength: calculateGapStrength(
      sizePercent,
      calculateBodyRatio(middle),
    ),
  };
}

function evaluateGapStatus(
  gap: FairValueGap,
  candles: Candle[],
): Pick<
  FairValueGap,
  'status' | 'fillPercent'
> {
  let deepestFill = 0;

  for (
    let index =
      gap.confirmationIndex + 1;
    index < candles.length;
    index += 1
  ) {
    const candle = candles[index];

    if (
      gap.direction === 'BULLISH'
    ) {
      if (candle.close < gap.low) {
        return {
          status: 'INVALIDATED',
          fillPercent: 100,
        };
      }

      if (candle.low <= gap.high) {
        const penetration =
          gap.high - candle.low;

        const fillPercent = clamp(
          (penetration /
            Math.max(
              gap.size,
              Number.EPSILON,
            )) *
            100,
          0,
          100,
        );

        deepestFill = Math.max(
          deepestFill,
          fillPercent,
        );
      }
    } else {
      if (candle.close > gap.high) {
        return {
          status: 'INVALIDATED',
          fillPercent: 100,
        };
      }

      if (candle.high >= gap.low) {
        const penetration =
          candle.high - gap.low;

        const fillPercent = clamp(
          (penetration /
            Math.max(
              gap.size,
              Number.EPSILON,
            )) *
            100,
          0,
          100,
        );

        deepestFill = Math.max(
          deepestFill,
          fillPercent,
        );
      }
    }
  }

  if (deepestFill >= 99) {
    return {
      status: 'FILLED',
      fillPercent: 100,
    };
  }

  if (deepestFill > 0) {
    return {
      status: 'PARTIAL',
      fillPercent:
        Math.round(deepestFill),
    };
  }

  return {
    status: 'OPEN',
    fillPercent: 0,
  };
}

function removeOverlappingGaps(
  gaps: FairValueGap[],
): FairValueGap[] {
  const sorted = [...gaps].sort(
    (first, second) =>
      second.strength -
      first.strength,
  );

  const result: FairValueGap[] = [];

  for (const gap of sorted) {
    const overlaps =
      result.some((existing) => {
        if (
          existing.direction !==
          gap.direction
        ) {
          return false;
        }

        const intersection =
          Math.min(
            existing.high,
            gap.high,
          ) -
          Math.max(
            existing.low,
            gap.low,
          );

        if (intersection <= 0) {
          return false;
        }

        const smallerRange =
          Math.min(
            existing.size,
            gap.size,
          );

        return (
          intersection /
            Math.max(
              smallerRange,
              Number.EPSILON,
            ) >
          0.7
        );
      });

    if (!overlaps) {
      result.push(gap);
    }
  }

  return result.sort(
    (first, second) =>
      first.startIndex -
      second.startIndex,
  );
}

function findNearestGap(
  gaps: FairValueGap[],
  price: number,
  direction: FairValueGapDirection,
): FairValueGap | null {
  const valid = gaps.filter(
    (gap) =>
      gap.direction === direction &&
      gap.status !== 'FILLED' &&
      gap.status !== 'INVALIDATED',
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

export function detectFairValueGaps(
  candles: Candle[],
  customOptions: DetectionOptions = {},
): FairValueGap[] {
  const options = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  if (candles.length < 3) {
    return [];
  }

  const startIndex = Math.max(
    0,
    candles.length -
      options.lookback,
  );

  const gaps: FairValueGap[] = [];

  for (
    let index = startIndex;
    index < candles.length - 2;
    index += 1
  ) {
    const bullish = detectBullishGap(
      candles,
      index,
      options,
    );

    if (bullish) {
      gaps.push(bullish);
    }

    const bearish = detectBearishGap(
      candles,
      index,
      options,
    );

    if (bearish) {
      gaps.push(bearish);
    }
  }

  const evaluated = gaps.map(
    (gap) => {
      const evaluation =
        evaluateGapStatus(
          gap,
          candles,
        );

      return {
        ...gap,
        ...evaluation,
      };
    },
  );

  return removeOverlappingGaps(
    evaluated,
  )
    .sort(
      (first, second) =>
        second.startIndex -
        first.startIndex,
    )
    .slice(
      0,
      options.maximumGaps,
    )
    .sort(
      (first, second) =>
        first.startIndex -
        second.startIndex,
    );
}

export function analyzeFairValueGaps(
  candles: Candle[],
  options: DetectionOptions = {},
): FairValueGapAnalysis {
  const gaps = detectFairValueGaps(
    candles,
    options,
  );

  const bullish = gaps.filter(
    (gap) =>
      gap.direction === 'BULLISH',
  );

  const bearish = gaps.filter(
    (gap) =>
      gap.direction === 'BEARISH',
  );

  const open = gaps.filter(
    (gap) =>
      gap.status === 'OPEN' ||
      gap.status === 'PARTIAL',
  );

  const currentPrice =
    candles.length > 0
      ? candles[candles.length - 1]
          .close
      : 0;

  return {
    gaps,
    bullish,
    bearish,
    open,

    nearestBullish:
      findNearestGap(
        gaps,
        currentPrice,
        'BULLISH',
      ),

    nearestBearish:
      findNearestGap(
        gaps,
        currentPrice,
        'BEARISH',
      ),
  };
}