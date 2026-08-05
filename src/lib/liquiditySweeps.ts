import type { Candle } from '@/types';

export type LiquiditySweepDirection =
  | 'BULLISH'
  | 'BEARISH';

export type LiquiditySweepStatus =
  | 'CONFIRMED'
  | 'WEAK'
  | 'INVALIDATED';

export interface LiquiditySweep {
  id: string;
  direction: LiquiditySweepDirection;
  status: LiquiditySweepStatus;

  index: number;
  time: number;

  sweptLevel: number;
  rejectionPrice: number;

  wickSize: number;
  bodySize: number;
  wickBodyRatio: number;

  volume: number;
  volumeRatio: number;

  strength: number;
}

export interface LiquiditySweepAnalysis {
  sweeps: LiquiditySweep[];
  bullish: LiquiditySweep[];
  bearish: LiquiditySweep[];
  confirmed: LiquiditySweep[];

  nearestBullish: LiquiditySweep | null;
  nearestBearish: LiquiditySweep | null;
}

interface DetectionOptions {
  lookback?: number;
  swingWindow?: number;
  minimumWickBodyRatio?: number;
  minimumVolumeRatio?: number;
  maximumSweeps?: number;
}

const DEFAULT_OPTIONS: Required<DetectionOptions> = {
  lookback: 120,
  swingWindow: 5,
  minimumWickBodyRatio: 1.4,
  minimumVolumeRatio: 0.8,
  maximumSweeps: 10,
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

function candleBody(
  candle: Candle,
): number {
  return Math.max(
    Math.abs(
      candle.close - candle.open,
    ),
    Number.EPSILON,
  );
}

function upperWick(
  candle: Candle,
): number {
  return Math.max(
    0,
    candle.high -
      Math.max(
        candle.open,
        candle.close,
      ),
  );
}

function lowerWick(
  candle: Candle,
): number {
  return Math.max(
    0,
    Math.min(
      candle.open,
      candle.close,
    ) - candle.low,
  );
}

function averageVolume(
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

function previousHighestHigh(
  candles: Candle[],
  index: number,
  window: number,
): number | null {
  const startIndex = Math.max(
    0,
    index - window,
  );

  const selected = candles.slice(
    startIndex,
    index,
  );

  if (selected.length === 0) {
    return null;
  }

  return Math.max(
    ...selected.map(
      (candle) => candle.high,
    ),
  );
}

function previousLowestLow(
  candles: Candle[],
  index: number,
  window: number,
): number | null {
  const startIndex = Math.max(
    0,
    index - window,
  );

  const selected = candles.slice(
    startIndex,
    index,
  );

  if (selected.length === 0) {
    return null;
  }

  return Math.min(
    ...selected.map(
      (candle) => candle.low,
    ),
  );
}

function calculateStrength(
  wickBodyRatio: number,
  volumeRatio: number,
  rejectionPercent: number,
): number {
  const wickScore = clamp(
    wickBodyRatio * 20,
    0,
    45,
  );

  const volumeScore = clamp(
    volumeRatio * 18,
    0,
    30,
  );

  const rejectionScore = clamp(
    rejectionPercent * 600,
    0,
    25,
  );

  return Math.round(
    clamp(
      wickScore +
        volumeScore +
        rejectionScore,
      0,
      100,
    ),
  );
}

function detectBearishSweep(
  candles: Candle[],
  index: number,
  options: Required<DetectionOptions>,
): LiquiditySweep | null {
  const candle = candles[index];

  const previousHigh =
    previousHighestHigh(
      candles,
      index,
      options.swingWindow,
    );

  if (previousHigh === null) {
    return null;
  }

  const swept =
    candle.high > previousHigh;

  const closedBelowLevel =
    candle.close < previousHigh;

  if (
    !swept ||
    !closedBelowLevel
  ) {
    return null;
  }

  const body = candleBody(candle);
  const wick = upperWick(candle);

  const wickBodyRatio =
    wick / body;

  if (
    wickBodyRatio <
    options.minimumWickBodyRatio
  ) {
    return null;
  }

  const average =
    averageVolume(
      candles,
      index - 1,
    );

  const volumeRatio =
    average > 0
      ? candle.volume / average
      : 1;

  const rejectionPercent =
    (candle.high -
      candle.close) /
    Math.max(
      candle.close,
      Number.EPSILON,
    ) *
    100;

  const strength =
    calculateStrength(
      wickBodyRatio,
      volumeRatio,
      rejectionPercent,
    );

  const status:
    LiquiditySweepStatus =
      volumeRatio >=
        options.minimumVolumeRatio &&
      strength >= 60
        ? 'CONFIRMED'
        : 'WEAK';

  return {
    id: `BEARISH-${candle.time}-${index}`,
    direction: 'BEARISH',
    status,

    index,
    time: candle.time,

    sweptLevel: previousHigh,
    rejectionPrice: candle.close,

    wickSize: wick,
    bodySize: body,
    wickBodyRatio,

    volume: candle.volume,
    volumeRatio,

    strength,
  };
}

function detectBullishSweep(
  candles: Candle[],
  index: number,
  options: Required<DetectionOptions>,
): LiquiditySweep | null {
  const candle = candles[index];

  const previousLow =
    previousLowestLow(
      candles,
      index,
      options.swingWindow,
    );

  if (previousLow === null) {
    return null;
  }

  const swept =
    candle.low < previousLow;

  const closedAboveLevel =
    candle.close > previousLow;

  if (
    !swept ||
    !closedAboveLevel
  ) {
    return null;
  }

  const body = candleBody(candle);
  const wick = lowerWick(candle);

  const wickBodyRatio =
    wick / body;

  if (
    wickBodyRatio <
    options.minimumWickBodyRatio
  ) {
    return null;
  }

  const average =
    averageVolume(
      candles,
      index - 1,
    );

  const volumeRatio =
    average > 0
      ? candle.volume / average
      : 1;

  const rejectionPercent =
    (candle.close -
      candle.low) /
    Math.max(
      candle.close,
      Number.EPSILON,
    ) *
    100;

  const strength =
    calculateStrength(
      wickBodyRatio,
      volumeRatio,
      rejectionPercent,
    );

  const status:
    LiquiditySweepStatus =
      volumeRatio >=
        options.minimumVolumeRatio &&
      strength >= 60
        ? 'CONFIRMED'
        : 'WEAK';

  return {
    id: `BULLISH-${candle.time}-${index}`,
    direction: 'BULLISH',
    status,

    index,
    time: candle.time,

    sweptLevel: previousLow,
    rejectionPrice: candle.close,

    wickSize: wick,
    bodySize: body,
    wickBodyRatio,

    volume: candle.volume,
    volumeRatio,

    strength,
  };
}

function removeNearbyDuplicates(
  sweeps: LiquiditySweep[],
): LiquiditySweep[] {
  const sorted = [...sweeps].sort(
    (first, second) =>
      second.strength -
      first.strength,
  );

  const result:
    LiquiditySweep[] = [];

  for (const sweep of sorted) {
    const duplicated =
      result.some(
        (existing) =>
          existing.direction ===
            sweep.direction &&
          Math.abs(
            existing.index -
              sweep.index,
          ) <= 2 &&
          Math.abs(
            existing.sweptLevel -
              sweep.sweptLevel,
          ) /
            Math.max(
              sweep.sweptLevel,
              Number.EPSILON,
            ) <
            0.0008,
      );

    if (!duplicated) {
      result.push(sweep);
    }
  }

  return result.sort(
    (first, second) =>
      first.index - second.index,
  );
}

function findNearestSweep(
  sweeps: LiquiditySweep[],
  price: number,
  direction:
    LiquiditySweepDirection,
): LiquiditySweep | null {
  const valid = sweeps.filter(
    (sweep) =>
      sweep.direction === direction &&
      sweep.status !==
        'INVALIDATED',
  );

  if (valid.length === 0) {
    return null;
  }

  return [...valid].sort(
    (first, second) =>
      Math.abs(
        first.sweptLevel - price,
      ) -
      Math.abs(
        second.sweptLevel - price,
      ),
  )[0];
}

export function detectLiquiditySweeps(
  candles: Candle[],
  customOptions: DetectionOptions = {},
): LiquiditySweep[] {
  const options = {
    ...DEFAULT_OPTIONS,
    ...customOptions,
  };

  if (
    candles.length <
    options.swingWindow + 2
  ) {
    return [];
  }

  const startIndex = Math.max(
    options.swingWindow,
    candles.length -
      options.lookback,
  );

  const sweeps:
    LiquiditySweep[] = [];

  for (
    let index = startIndex;
    index < candles.length;
    index += 1
  ) {
    const bullish =
      detectBullishSweep(
        candles,
        index,
        options,
      );

    if (bullish) {
      sweeps.push(bullish);
    }

    const bearish =
      detectBearishSweep(
        candles,
        index,
        options,
      );

    if (bearish) {
      sweeps.push(bearish);
    }
  }

  return removeNearbyDuplicates(
    sweeps,
  )
    .sort(
      (first, second) =>
        second.index -
        first.index,
    )
    .slice(
      0,
      options.maximumSweeps,
    )
    .sort(
      (first, second) =>
        first.index -
        second.index,
    );
}

export function analyzeLiquiditySweeps(
  candles: Candle[],
  options: DetectionOptions = {},
): LiquiditySweepAnalysis {
  const sweeps =
    detectLiquiditySweeps(
      candles,
      options,
    );

  const bullish = sweeps.filter(
    (sweep) =>
      sweep.direction ===
      'BULLISH',
  );

  const bearish = sweeps.filter(
    (sweep) =>
      sweep.direction ===
      'BEARISH',
  );

  const confirmed = sweeps.filter(
    (sweep) =>
      sweep.status ===
      'CONFIRMED',
  );

  const currentPrice =
    candles.length > 0
      ? candles[
          candles.length - 1
        ].close
      : 0;

  return {
    sweeps,
    bullish,
    bearish,
    confirmed,

    nearestBullish:
      findNearestSweep(
        sweeps,
        currentPrice,
        'BULLISH',
      ),

    nearestBearish:
      findNearestSweep(
        sweeps,
        currentPrice,
        'BEARISH',
      ),
  };
}