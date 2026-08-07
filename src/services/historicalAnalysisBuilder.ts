import type {
  AnalysisResult,
  Asset,
  Candle,
  IndicatorResult,
  Quote,
  Timeframe,
} from '@/types';

import {
  ASSETS,
  formatPrice,
} from '@/lib/assets';

import {
  buildRealAtrIndicator,
  buildRealEmaIndicators,
  buildRealMacdIndicator,
  buildRealRsiIndicator,
  buildRealVolumeIndicator,
  finalizeAnalysis,
} from '@/lib/indicators';

function uid(): string {
  return (
    crypto.randomUUID?.() ??
    `${Math.random()
      .toString(36)
      .slice(2)}-${Date.now()}`
  );
}

function buildHistoricalQuote(
  asset: Asset,
  candles: Candle[],
): Quote {
  const current =
    candles[candles.length - 1];

  const previous =
    candles.length > 1
      ? candles[candles.length - 2]
      : current;

  const previousClose =
    previous.close || current.close;

  const changePct =
    previousClose !== 0
      ? (
          (current.close -
            previousClose) /
          previousClose
        ) * 100
      : 0;

  return {
    asset,
    price: current.close,
    changePct,
    high: current.high,
    low: current.low,
    open: current.open,
    spread: ASSETS[asset].tick,
    updatedAt: current.time,
  };
}

function buildHistoricalIndicators(
  asset: Asset,
  candles: Candle[],
): IndicatorResult[] {
  const decimals =
    ASSETS[asset].decimals;

  return [
    ...buildRealEmaIndicators(
      candles,
      decimals,
    ),
    buildRealRsiIndicator(
      candles,
    ),
    buildRealMacdIndicator(
      candles,
      decimals,
    ),
    buildRealVolumeIndicator(
      candles,
    ),
    buildRealAtrIndicator(
      candles,
      decimals,
    ),
  ];
}

export function buildHistoricalAnalysis(
  asset: Asset,
  timeframe: Timeframe,
  candles: Candle[],
): AnalysisResult {
  if (candles.length < 21) {
    throw new Error(
      'São necessários pelo menos 21 candles para gerar uma análise histórica.',
    );
  }

  const quote =
    buildHistoricalQuote(
      asset,
      candles,
    );

  const indicators =
    buildHistoricalIndicators(
      asset,
      candles,
    );

  const analysis =
    finalizeAnalysis(
      asset,
      timeframe,
      indicators,
      quote,
      formatPrice,
    );

  return {
    ...analysis,
    id: uid(),
    createdAt: quote.updatedAt,
  };
}