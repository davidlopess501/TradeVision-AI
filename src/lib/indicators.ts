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
    description: 'Pressão de compradores vs. vendedores',
  },
  {
    key: 'atr',
    label: 'ATR',
    abbr: 'ATR',
    description: 'Volatilidade média — tamanho do movimento',
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

const WEIGHTS: Record<IndicatorKey, number> = {
  ema9: 1.2,
  ema21: 1,
  rsi: 1,
  macd: 1.3,
  volume: 0.9,
  atr: 0.6,
};

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce(
  (total, weight) => total + weight,
  0,
);

type Rng = () => number;

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
  const strength = 50 + normalized * 25;

  return Math.max(5, Math.min(95, Math.round(strength)));
}

export function buildRealEmaIndicators(
  candles: Candle[],
  decimals: number,
): IndicatorResult[] {
  if (candles.length < 21) {
    throw new Error(
      'São necessários pelo menos 21 candles para calcular EMA 9 e EMA 21.',
    );
  }

  const closes = candles.map((candle) => candle.close);
  const lastClose = closes[closes.length - 1];

  const ema9 = calculateEMA(closes, 9);
  const ema21 = calculateEMA(closes, 21);

  const priceVsEma9Percent =
    ((lastClose - ema9) / ema9) * 100;

  const ema9VsEma21Percent =
    ((ema9 - ema21) / ema21) * 100;

  const ema9Strength = strengthFromDifference(
    priceVsEma9Percent,
  );

  const ema21Strength = strengthFromDifference(
    ema9VsEma21Percent,
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
            : 'EMA 9 e EMA 21 praticamente alinhadas',
    },
  ];
}

export function buildRealRsiIndicator(
  candles: Candle[],
): IndicatorResult {
  if (candles.length < 15) {
    throw new Error(
      'São necessários pelo menos 15 candles para calcular o RSI.',
    );
  }

  const closes = candles.map((candle) => candle.close);
  const rsi = calculateRSI(closes, 14);

  let signal: Signal = 'WAIT';
  let strength = 50;
  let detail = 'RSI em zona neutra';

  if (rsi >= 70) {
    signal = 'SELL';
    strength = Math.max(5, Math.round(100 - rsi));
    detail =
      'RSI em sobrecompra — atenção para possível correção';
  } else if (rsi <= 30) {
    signal = 'BUY';
    strength = Math.min(95, Math.round(100 - rsi));
    detail =
      'RSI em sobrevenda — atenção para possível recuperação';
  } else if (rsi >= 55) {
    signal = 'BUY';
    strength = Math.min(95, Math.round(rsi));
    detail = 'RSI acima de 55 — momentum comprador';
  } else if (rsi <= 45) {
    signal = 'SELL';
    strength = Math.max(5, Math.round(rsi));
    detail = 'RSI abaixo de 45 — momentum vendedor';
  }

  return {
    key: 'rsi',
    signal,
    value: rsi.toFixed(1),
    strength,
    detail,
  };
}

export function buildRealMacdIndicator(
  candles: Candle[],
  decimals: number,
): IndicatorResult {
  if (candles.length < 35) {
    throw new Error(
      'São necessários pelo menos 35 candles para calcular o MACD.',
    );
  }

  const closes = candles.map((candle) => candle.close);

  const {
    macd,
    signal: signalLine,
    histogram,
  } = calculateMACD(closes, 12, 26, 9);

  const reference =
    Math.abs(closes[closes.length - 1]) || 1;

  const histogramPercent =
    (histogram / reference) * 100;

  const strength = strengthFromDifference(
    histogramPercent,
    0.01,
  );

  const indicatorSignal = signalFromStrength(strength);

  const formatter = new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: decimals + 1,
    maximumFractionDigits: decimals + 1,
  });

  let detail = 'MACD próximo da linha de sinal';

  if (histogram > 0) {
    detail =
      'MACD acima da linha de sinal — momentum altista';
  } else if (histogram < 0) {
    detail =
      'MACD abaixo da linha de sinal — momentum baixista';
  }

  return {
    key: 'macd',
    signal: indicatorSignal,
    value: formatter.format(macd),
    strength,
    detail:
      `${detail}. Sinal: ${formatter.format(signalLine)} · ` +
      `Histograma: ${formatter.format(histogram)}`,
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
  const signal = signalFromStrength(strength);
  const bias = strength - 50;

  let value = '';
  let detail = '';

  switch (key) {
    case 'ema9': {
      const difference =
        (rng() - 0.5) * price * 0.0012;

      const ema = price - difference;

      value = ema.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      detail =
        bias > 4
          ? 'Preço acima da EMA 9'
          : bias < -4
            ? 'Preço abaixo da EMA 9'
            : 'Preço próximo da EMA 9';

      break;
    }

    case 'ema21': {
      const difference =
        (rng() - 0.5) * price * 0.0022;

      const ema = price - difference;

      value = ema.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      detail =
        bias > 4
          ? 'EMA 9 acima da EMA 21 — cruzamento altista'
          : bias < -4
            ? 'EMA 9 abaixo da EMA 21 — cruzamento baixista'
            : 'Médias entrelaçadas';

      break;
    }

    case 'rsi': {
      const rsi = Math.round(18 + rng() * 66);

      value = `${rsi}`;

      detail =
        rsi >= 70
          ? 'Sobrecompra — possível reversão'
          : rsi <= 30
            ? 'Sobrevenda — possível reversão'
            : 'Zona neutra';

      break;
    }

    case 'macd': {
      const macd =
        (rng() - 0.45) * price * 0.0009;

      value = macd.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals + 1,
        maximumFractionDigits: decimals + 1,
      });

      detail =
        bias > 4
          ? 'Histograma positivo — momentum altista'
          : bias < -4
            ? 'Histograma negativo — momentum baixista'
            : 'Histograma próximo de zero';

      break;
    }

    case 'volume': {
      const ratio = (0.6 + rng() * 1.5).toFixed(2);

      value = `${ratio}x`;

      detail =
        bias > 4
          ? 'Volume comprador dominante'
          : bias < -4
            ? 'Volume vendedor dominante'
            : 'Volume equilibrado';

      break;
    }

    case 'atr': {
      const atr =
        price * (0.0008 + rng() * 0.0022);

      value = atr.toLocaleString('pt-BR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      });

      const volatilityPercent = atr / price;

      detail =
        volatilityPercent > 0.002
          ? 'Volatilidade elevada'
          : volatilityPercent > 0.0011
            ? 'Volatilidade moderada'
            : 'Volatilidade baixa';

      break;
    }
  }

  void asset;

  return {
    key,
    signal,
    value,
    detail,
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

  let weighted = 0;

  for (const indicator of indicators) {
    weighted +=
      (indicator.strength - 50) *
      WEIGHTS[indicator.key];
  }

  const bias = weighted / TOTAL_WEIGHT;

  const score = Math.max(
    0,
    Math.min(100, Math.round(50 + bias)),
  );

  const confidence = Math.round(
    Math.min(
      100,
      45 +
        Math.abs(bias) * 1.1 +
        (mulberryHash(score) % 12),
    ),
  );

  let finalSignal: Signal = 'WAIT';

  if (score >= 62) {
    finalSignal = 'BUY';
  } else if (score <= 38) {
    finalSignal = 'SELL';
  }

  const trend: AnalysisResult['trend'] =
    score >= 58
      ? 'ALTA'
      : score <= 42
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
    Math.round(stopDistance / info.tick) *
      info.tick,
  );

  const stop =
    finalSignal === 'BUY'
      ? quote.price - roundedStopDistance
      : quote.price + roundedStopDistance;

  const target =
    finalSignal === 'BUY'
      ? quote.price + roundedStopDistance * 2
      : quote.price - roundedStopDistance * 2;

  const probability = Math.round(
    50 + bias * 0.6,
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

function mulberryHash(value: number): number {
  let result = Math.imul(
    value ^ (value >>> 15),
    1 | value,
  );

  result =
    (
      result +
      Math.imul(
        result ^ (result >>> 7),
        61 | result,
      )
    ) ^ result;

  return (
    ((result ^ (result >>> 14)) >>> 0) %
    100
  );
}

export function scoreGrade(
  score: number,
): {
  label: string;
  tone: string;
} {
  if (score >= 75) {
    return {
      label: 'Forte Compra',
      tone: 'bull',
    };
  }

  if (score >= 62) {
    return {
      label: 'Compra',
      tone: 'bull',
    };
  }

  if (score >= 42) {
    return {
      label: 'Neutro',
      tone: 'wait',
    };
  }

  if (score >= 25) {
    return {
      label: 'Venda',
      tone: 'bear',
    };
  }

  return {
    label: 'Forte Venda',
    tone: 'bear',
  };
}

export const TIMEFRAME_OPTIONS = TIMEFRAMES;