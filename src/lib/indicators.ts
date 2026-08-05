import type {
  Asset,
  Timeframe,
  AnalysisResult,
  IndicatorResult,
  Signal,
  IndicatorKey,
  Quote,
  Candle,
} from '@/types';

import {
  ASSETS,
  TIMEFRAMES,
  timeframesToMinutes,
} from '@/lib/assets';

import {
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateATR,
  calculateAverage,
} from '@/lib/technicalIndicators';

interface IndicatorMeta {
  key: IndicatorKey;
  label: string;
  abbr: string;
  description: string;
}

export const INDICATOR_META: IndicatorMeta[] = [
  {
    key: 'ema9',
    label: 'EMA 9',
    abbr: 'EMA9',
    description: 'Média exponencial curta — direção de curto prazo',
  },
  {
    key: 'ema21',
    label: 'EMA 21',
    abbr: 'EMA21',
    description: 'Média exponencial média — tendência intermediária',
  },
  {
    key: 'rsi',
    label: 'RSI',
    abbr: 'RSI',
    description: 'Índice de força relativa — sobrecompra / sobrevenda',
  },
  {
    key: 'macd',
    label: 'MACD',
    abbr: 'MACD',
    description: 'Convergência/divergência — momentum',
  },
  {
    key: 'volume',
    label: 'Volume',
    abbr: 'VOL',
    description: 'Volume atual comparado à média recente',
  },
  {
    key: 'atr',
    label: 'ATR',
    abbr: 'ATR',
    description: 'Amplitude verdadeira média — volatilidade',
  },
];

export const META_BY_KEY: Record<IndicatorKey, IndicatorMeta> =
  Object.fromEntries(
    INDICATOR_META.map((meta) => [meta.key, meta]),
  ) as Record<IndicatorKey, IndicatorMeta>;

export const INDICATOR_LABELS: Record<IndicatorKey, string> =
  Object.fromEntries(
    INDICATOR_META.map((meta) => [meta.key, meta.label]),
  ) as Record<IndicatorKey, string>;

const STRENGTH_BUY = 62;
const STRENGTH_SELL = 38;

const DIRECTIONAL_WEIGHTS: Record<IndicatorKey, number> = {
  ema9: 1.2,
  ema21: 1.1,
  rsi: 1,
  macd: 1.3,
  volume: 0.9,
  atr: 0,
};

const TOTAL_DIRECTIONAL_WEIGHT = Object.values(
  DIRECTIONAL_WEIGHTS,
).reduce((total, weight) => total + weight, 0);

type Rng = () => number;

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(minimum, Math.min(maximum, value));
}

export function signalFromStrength(strength: number): Signal {
  if (strength >= STRENGTH_BUY) return 'BUY';
  if (strength <= STRENGTH_SELL) return 'SELL';

  return 'WAIT';
}

export function signalLabel(signal: Signal): string {
  if (signal === 'BUY') return 'Compra';
  if (signal === 'SELL') return 'Venda';

  return 'Neutro';
}

export function signalShort(signal: Signal): string {
  if (signal === 'BUY') return 'COMPRA';
  if (signal === 'SELL') return 'VENDA';

  return 'AGUARDAR';
}

function strengthFromDifference(
  differencePercent: number,
  sensitivity = 0.15,
): number {
  const normalized = differencePercent / sensitivity;

  return clamp(
    Math.round(50 + normalized * 25),
    5,
    95,
  );
}

export function buildRealEmaIndicators(
  candles: Candle[],
  decimals: number,
): IndicatorResult[] {
  if (candles.length < 21) {
    throw new Error(
      'São necessários pelo menos 21 candles para calcular as EMAs.',
    );
  }

  const closes = candles.map((candle) => candle.close);
  const lastClose = closes[closes.length - 1];

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);

  const priceVsEma9 =
    ((lastClose - ema9) / ema9) * 100;

  const ema9VsEma21 =
    ((ema9 - ema21) / ema21) * 100;

  const ema9Strength = strengthFromDifference(
    priceVsEma9,
  );

  const ema21Strength = strengthFromDifference(
    ema9VsEma21,
  );

  const formatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  return [
    {
      key: 'ema9',
      signal: signalFromStrength(ema9Strength),
      value: formatter.format(ema9),
      strength: ema9Strength,
      detail:
        lastClose > ema9
          ? 'Preço acima da EMA 9'
          : lastClose < ema9
            ? 'Preço abaixo da EMA 9'
            : 'Preço junto da EMA 9',
    },
    {
      key: 'ema21',
      signal: signalFromStrength(ema21Strength),
      value: formatter.format(ema21),
      strength: ema21Strength,
      detail:
        ema9 > ema21
          ? 'EMA 9 acima da EMA 21 — estrutura altista'
          : ema9 < ema21
            ? 'EMA 9 abaixo da EMA 21 — estrutura baixista'
            : 'EMAs praticamente alinhadas',
    },
  ];
}

export function buildRealRsiIndicator(
  candles: Candle[],
): IndicatorResult {
  const closes = candles.map((candle) => candle.close);
  const rsi = calculateRSI(closes, 14);

  let strength = 50;
  let detail = 'RSI em zona neutra';

  if (rsi >= 70) {
    strength = clamp(Math.round(100 - rsi), 5, 38);
    detail = 'RSI em sobrecompra — possível correção';
  } else if (rsi <= 30) {
    strength = clamp(Math.round(100 - rsi), 62, 95);
    detail = 'RSI em sobrevenda — possível recuperação';
  } else if (rsi >= 55) {
    strength = clamp(Math.round(rsi), 62, 85);
    detail = 'RSI confirma momentum comprador';
  } else if (rsi <= 45) {
    strength = clamp(Math.round(rsi), 15, 38);
    detail = 'RSI confirma momentum vendedor';
  }

  return {
    key: 'rsi',
    signal: signalFromStrength(strength),
    value: rsi.toFixed(1),
    strength,
    detail,
  };
}

export function buildRealMacdIndicator(
  candles: Candle[],
  decimals: number,
): IndicatorResult {
  const closes = candles.map((candle) => candle.close);

  const {
    macd,
    signal: signalLine,
    histogram,
  } = calculateMACD(closes);

  const lastPrice = Math.abs(closes[closes.length - 1]) || 1;

  const histogramPercent =
    (histogram / lastPrice) * 100;

  const strength = strengthFromDifference(
    histogramPercent,
    0.02,
  );

  const formatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals + 1,
    maximumFractionDigits: decimals + 1,
  });

  return {
    key: 'macd',
    signal: signalFromStrength(strength),
    value: formatter.format(macd),
    strength,
    detail:
      histogram > 0
        ? `Momentum altista · Histograma ${formatter.format(histogram)}`
        : histogram < 0
          ? `Momentum baixista · Histograma ${formatter.format(histogram)}`
          : `MACD neutro · Sinal ${formatter.format(signalLine)}`,
  };
}

export function buildRealVolumeIndicator(
  candles: Candle[],
): IndicatorResult {
  if (candles.length < 21) {
    throw new Error(
      'São necessários pelo menos 21 candles para calcular o volume.',
    );
  }

  const lastCandle = candles[candles.length - 1];
  const recentCandles = candles.slice(-21, -1);

  const averageVolume = calculateAverage(
    recentCandles.map((candle) => candle.volume),
  );

  const ratio =
    averageVolume > 0
      ? lastCandle.volume / averageVolume
      : 1;

  const priceChange =
    lastCandle.close - lastCandle.open;

  const direction =
    priceChange > 0
      ? 1
      : priceChange < 0
        ? -1
        : 0;

  const excessVolume = Math.max(0, ratio - 1);

  const strength = clamp(
    Math.round(50 + direction * excessVolume * 30),
    5,
    95,
  );

  let detail = 'Volume próximo da média recente';

  if (ratio >= 1.2 && direction > 0) {
    detail = 'Volume comprador acima da média';
  } else if (ratio >= 1.2 && direction < 0) {
    detail = 'Volume vendedor acima da média';
  } else if (ratio < 0.8) {
    detail = 'Volume abaixo da média — movimento com pouca confirmação';
  }

  return {
    key: 'volume',
    signal: signalFromStrength(strength),
    value: `${ratio.toFixed(2)}x`,
    strength,
    detail,
  };
}

export function buildRealAtrIndicator(
  candles: Candle[],
  decimals: number,
): IndicatorResult {
  const atr = calculateATR(candles, 14);
  const lastPrice = candles[candles.length - 1].close;
  const atrPercent = (atr / lastPrice) * 100;

  const formatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });

  let detail = 'Volatilidade moderada';

  if (atrPercent >= 0.2) {
    detail = 'Volatilidade elevada — atenção ao tamanho do stop';
  } else if (atrPercent <= 0.08) {
    detail = 'Volatilidade baixa — mercado mais comprimido';
  }

  return {
    key: 'atr',
    signal: 'WAIT',
    value: formatter.format(atr),
    strength: 50,
    detail,
  };
}

export function buildIndicator(
  key: IndicatorKey,
  rng: Rng,
  asset: Asset,
  price: number,
  decimals: number,
): IndicatorResult {
  const strength = Math.round(8 + rng() * 86);

  void asset;

  return {
    key,
    signal: signalFromStrength(strength),
    value: price.toLocaleString('pt-BR', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }),
    detail: 'Indicador temporariamente simulado',
    strength,
  };
}

export function finalizeAnalysis(
  asset: Asset,
  timeframe: Timeframe,
  indicators: IndicatorResult[],
  quote: Quote,
  priceFmt: (asset: Asset, value: number) => string,
): Omit<AnalysisResult, 'id' | 'createdAt'> {
  const info = ASSETS[asset];

  let weightedBias = 0;

  for (const indicator of indicators) {
    weightedBias +=
      (indicator.strength - 50) *
      DIRECTIONAL_WEIGHTS[indicator.key];
  }

  const bias =
    weightedBias / TOTAL_DIRECTIONAL_WEIGHT;

  const score = clamp(
    Math.round(50 + bias),
    0,
    100,
  );

  let finalSignal: Signal = 'WAIT';

  if (score >= 62) {
    finalSignal = 'BUY';
  } else if (score <= 38) {
    finalSignal = 'SELL';
  }

  const directionalIndicators = indicators.filter(
    (indicator) => indicator.key !== 'atr',
  );

  const agreeingIndicators =
    finalSignal === 'WAIT'
      ? directionalIndicators.filter(
          (indicator) => indicator.signal === 'WAIT',
        ).length
      : directionalIndicators.filter(
          (indicator) => indicator.signal === finalSignal,
        ).length;

  const agreement =
    directionalIndicators.length > 0
      ? agreeingIndicators / directionalIndicators.length
      : 0;

  const atrIndicator = indicators.find(
    (indicator) => indicator.key === 'atr',
  );

  const volatilityBonus = atrIndicator ? 5 : 0;

  const confidence = clamp(
    Math.round(
      45 +
        Math.abs(score - 50) * 0.8 +
        agreement * 25 +
        volatilityBonus,
    ),
    0,
    100,
  );

  const ema9 = indicators.find(
    (indicator) => indicator.key === 'ema9',
  );

  const ema21 = indicators.find(
    (indicator) => indicator.key === 'ema21',
  );

  const trend: AnalysisResult['trend'] =
    ema9?.signal === 'BUY' &&
    ema21?.signal === 'BUY'
      ? 'ALTA'
      : ema9?.signal === 'SELL' &&
          ema21?.signal === 'SELL'
        ? 'BAIXA'
        : 'LATERAL';

  const timeframeMinutes =
    timeframesToMinutes(timeframe);

  const stopDistance =
    info.basePrice *
    0.0009 *
    (timeframeMinutes / 5 + 0.6);

  const roundedStopDistance = Math.max(
    info.tick,
    Math.round(stopDistance / info.tick) * info.tick,
  );

  const stop =
    finalSignal === 'BUY'
      ? quote.price - roundedStopDistance
      : quote.price + roundedStopDistance;

  const target =
    finalSignal === 'BUY'
      ? quote.price + roundedStopDistance * 2
      : quote.price - roundedStopDistance * 2;

  const probability =
    finalSignal === 'WAIT'
      ? 50
      : clamp(
          Math.round(
            50 +
              Math.abs(score - 50) * 0.8 +
              agreement * 15,
          ),
          50,
          95,
        );

  const aiScore = Math.round(
    score * 0.6 + confidence * 0.4,
  );

  void priceFmt;

  return {
    asset,
    timeframe,
    indicators,
    score,
    confidence,
    finalSignal,
    price: quote.price,
    changePct: quote.changePct,
    spread: quote.spread,
    high: quote.high,
    low: quote.low,
    open: quote.open,
    entry: quote.price,
    stop,
    target,
    trend,
    probability,
    aiScore,
  };
}

export function scoreGrade(
  score: number,
): {
  label: string;
  tone: string;
} {
  if (score >= 75) {
    return { label: 'Forte Compra', tone: 'bull' };
  }

  if (score >= 62) {
    return { label: 'Compra', tone: 'bull' };
  }

  if (score >= 42) {
    return { label: 'Neutro', tone: 'wait' };
  }

  if (score >= 25) {
    return { label: 'Venda', tone: 'bear' };
  }

  return { label: 'Forte Venda', tone: 'bear' };
}

export const TIMEFRAME_OPTIONS = TIMEFRAMES;