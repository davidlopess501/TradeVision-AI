import type { Candle } from '@/types';

export type SwingType = 'HIGH' | 'LOW';

export interface SwingPoint {
  type: SwingType;
  index: number;
  time: number;
  price: number;
}

export type StructureEventType =
  | 'BOS_BULL'
  | 'BOS_BEAR'
  | 'CHOCH_BULL'
  | 'CHOCH_BEAR';

export interface StructureEvent {
  type: StructureEventType;
  index: number;
  time: number;
  price: number;
  brokenLevel: number;
  label: string;
}

export interface SupportResistanceLevel {
  type: 'SUPPORT' | 'RESISTANCE';
  price: number;
  time: number;
  touches: number;
}

export interface MarketStructureResult {
  swings: SwingPoint[];
  events: StructureEvent[];
  supports: SupportResistanceLevel[];
  resistances: SupportResistanceLevel[];
  trend: 'BULLISH' | 'BEARISH' | 'RANGE';
}

function isSwingHigh(
  candles: Candle[],
  index: number,
  strength: number,
): boolean {
  const current = candles[index];

  for (
    let offset = 1;
    offset <= strength;
    offset += 1
  ) {
    const previous = candles[index - offset];
    const next = candles[index + offset];

    if (
      !previous ||
      !next ||
      current.high <= previous.high ||
      current.high <= next.high
    ) {
      return false;
    }
  }

  return true;
}

function isSwingLow(
  candles: Candle[],
  index: number,
  strength: number,
): boolean {
  const current = candles[index];

  for (
    let offset = 1;
    offset <= strength;
    offset += 1
  ) {
    const previous = candles[index - offset];
    const next = candles[index + offset];

    if (
      !previous ||
      !next ||
      current.low >= previous.low ||
      current.low >= next.low
    ) {
      return false;
    }
  }

  return true;
}

export function detectSwingPoints(
  candles: Candle[],
  strength = 3,
): SwingPoint[] {
  if (candles.length < strength * 2 + 1) {
    return [];
  }

  const swings: SwingPoint[] = [];

  for (
    let index = strength;
    index < candles.length - strength;
    index += 1
  ) {
    if (isSwingHigh(candles, index, strength)) {
      swings.push({
        type: 'HIGH',
        index,
        time: candles[index].time,
        price: candles[index].high,
      });
    }

    if (isSwingLow(candles, index, strength)) {
      swings.push({
        type: 'LOW',
        index,
        time: candles[index].time,
        price: candles[index].low,
      });
    }
  }

  return swings.sort(
    (first, second) => first.index - second.index,
  );
}

export function detectStructureEvents(
  candles: Candle[],
  swings: SwingPoint[],
): StructureEvent[] {
  const events: StructureEvent[] = [];

  let lastSwingHigh: SwingPoint | null = null;
  let lastSwingLow: SwingPoint | null = null;

  let currentTrend: 'BULLISH' | 'BEARISH' | 'RANGE' =
    'RANGE';

  const swingsByIndex = new Map<number, SwingPoint[]>();

  for (const swing of swings) {
    const existing =
      swingsByIndex.get(swing.index) ?? [];

    existing.push(swing);
    swingsByIndex.set(swing.index, existing);
  }

  for (
    let index = 0;
    index < candles.length;
    index += 1
  ) {
    const candle = candles[index];

    const currentSwings =
      swingsByIndex.get(index) ?? [];

    for (const swing of currentSwings) {
      if (swing.type === 'HIGH') {
        lastSwingHigh = swing;
      } else {
        lastSwingLow = swing;
      }
    }

    if (
      lastSwingHigh &&
      index > lastSwingHigh.index &&
      candle.close > lastSwingHigh.price
    ) {
      const eventType: StructureEventType =
        currentTrend === 'BEARISH'
          ? 'CHOCH_BULL'
          : 'BOS_BULL';

      events.push({
        type: eventType,
        index,
        time: candle.time,
        price: candle.close,
        brokenLevel: lastSwingHigh.price,
        label:
          eventType === 'CHOCH_BULL'
            ? 'CHOCH ↑'
            : 'BOS ↑',
      });

      currentTrend = 'BULLISH';
      lastSwingHigh = null;
    }

    if (
      lastSwingLow &&
      index > lastSwingLow.index &&
      candle.close < lastSwingLow.price
    ) {
      const eventType: StructureEventType =
        currentTrend === 'BULLISH'
          ? 'CHOCH_BEAR'
          : 'BOS_BEAR';

      events.push({
        type: eventType,
        index,
        time: candle.time,
        price: candle.close,
        brokenLevel: lastSwingLow.price,
        label:
          eventType === 'CHOCH_BEAR'
            ? 'CHOCH ↓'
            : 'BOS ↓',
      });

      currentTrend = 'BEARISH';
      lastSwingLow = null;
    }
  }

  return events;
}

function groupLevels(
  swings: SwingPoint[],
  type: SwingType,
  tolerancePercent = 0.08,
): SupportResistanceLevel[] {
  const selected = swings.filter(
    (swing) => swing.type === type,
  );

  const groups: SupportResistanceLevel[] = [];

  for (const swing of selected) {
    const tolerance =
      swing.price * (tolerancePercent / 100);

    const existing = groups.find(
      (level) =>
        Math.abs(level.price - swing.price) <=
        tolerance,
    );

    if (existing) {
      existing.price =
        (existing.price * existing.touches +
          swing.price) /
        (existing.touches + 1);

      existing.touches += 1;
      existing.time = swing.time;
    } else {
      groups.push({
        type:
          type === 'LOW'
            ? 'SUPPORT'
            : 'RESISTANCE',
        price: swing.price,
        time: swing.time,
        touches: 1,
      });
    }
  }

  return groups
    .sort(
      (first, second) =>
        second.touches - first.touches,
    )
    .slice(0, 4);
}

function inferTrend(
  events: StructureEvent[],
): MarketStructureResult['trend'] {
  const latestEvents = events.slice(-3);

  const bullish = latestEvents.filter(
    (event) =>
      event.type === 'BOS_BULL' ||
      event.type === 'CHOCH_BULL',
  ).length;

  const bearish = latestEvents.filter(
    (event) =>
      event.type === 'BOS_BEAR' ||
      event.type === 'CHOCH_BEAR',
  ).length;

  if (bullish > bearish) {
    return 'BULLISH';
  }

  if (bearish > bullish) {
    return 'BEARISH';
  }

  return 'RANGE';
}

export function analyzeMarketStructure(
  candles: Candle[],
  swingStrength = 3,
): MarketStructureResult {
  const swings = detectSwingPoints(
    candles,
    swingStrength,
  );

  const events = detectStructureEvents(
    candles,
    swings,
  );

  const supports = groupLevels(
    swings,
    'LOW',
  );

  const resistances = groupLevels(
    swings,
    'HIGH',
  );

  return {
    swings,
    events,
    supports,
    resistances,
    trend: inferTrend(events),
  };
}