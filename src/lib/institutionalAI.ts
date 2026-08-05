import type {
  AnalysisResult,
  Candle,
  Signal,
} from '@/types';

import type {
  MultiTimeframeAnalysis,
} from '@/lib/multiTimeframe';

import {
  analyzeMarketStructure,
} from '@/lib/marketStructure';

import {
  analyzeOrderBlocks,
} from '@/lib/orderBlocks';

import {
  analyzeFairValueGaps,
} from '@/lib/fairValueGaps';

import {
  analyzeLiquiditySweeps,
} from '@/lib/liquiditySweeps';

import {
  analyzeFibonacci,
} from '@/lib/fibonacci';

export type InstitutionalRisk =
  | 'LOW'
  | 'MEDIUM'
  | 'HIGH';

export type InstitutionalDecision =
  | 'STRONG_BUY'
  | 'BUY'
  | 'WAIT'
  | 'SELL'
  | 'STRONG_SELL';

export interface InstitutionalFactor {
  key: string;
  label: string;
  direction: Signal;
  weight: number;
  contribution: number;
  explanation: string;
}

export interface InstitutionalAnalysis {
  score: number;
  confidence: number;
  confluence: number;
  risk: InstitutionalRisk;
  decision: InstitutionalDecision;
  signal: Signal;
  factors: InstitutionalFactor[];
  positiveFactors: number;
  negativeFactors: number;
  neutralFactors: number;
  summary: string;
}

interface InstitutionalAIInput {
  result: AnalysisResult;
  candles: Candle[];
  multiTimeframe:
    MultiTimeframeAnalysis | null;
}

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

function signalValue(
  signal: Signal,
): number {
  if (signal === 'BUY') return 1;
  if (signal === 'SELL') return -1;

  return 0;
}

function directionFromNumber(
  value: number,
  threshold = 0.15,
): Signal {
  if (value >= threshold) {
    return 'BUY';
  }

  if (value <= -threshold) {
    return 'SELL';
  }

  return 'WAIT';
}

function indicatorFactor(
  result: AnalysisResult,
  key: string,
  label: string,
  weight: number,
): InstitutionalFactor | null {
  const indicator =
    result.indicators.find(
      (item) => item.key === key,
    );

  if (!indicator) {
    return null;
  }

  const normalized =
    (indicator.strength - 50) / 50;

  return {
    key,
    label,
    direction: indicator.signal,
    weight,
    contribution:
      normalized * weight,
    explanation: indicator.detail,
  };
}

function buildTechnicalFactors(
  result: AnalysisResult,
): InstitutionalFactor[] {
  const factors = [
    indicatorFactor(
      result,
      'ema9',
      'EMA 9',
      9,
    ),
    indicatorFactor(
      result,
      'ema21',
      'EMA 21',
      9,
    ),
    indicatorFactor(
      result,
      'rsi',
      'RSI',
      8,
    ),
    indicatorFactor(
      result,
      'macd',
      'MACD',
      10,
    ),
    indicatorFactor(
      result,
      'volume',
      'Volume',
      7,
    ),
    indicatorFactor(
      result,
      'atr',
      'ATR',
      4,
    ),
  ];

  return factors.filter(
    (
      factor,
    ): factor is InstitutionalFactor =>
      factor !== null,
  );
}

function buildMarketStructureFactor(
  candles: Candle[],
): InstitutionalFactor {
  const analysis =
    analyzeMarketStructure(candles);

  const direction: Signal =
    analysis.trend === 'BULLISH'
      ? 'BUY'
      : analysis.trend === 'BEARISH'
        ? 'SELL'
        : 'WAIT';

  const recentEvents =
    analysis.events.slice(-3);

  const bullishEvents =
    recentEvents.filter(
      (event) =>
        event.type === 'BOS_BULL' ||
        event.type === 'CHOCH_BULL',
    ).length;

  const bearishEvents =
    recentEvents.filter(
      (event) =>
        event.type === 'BOS_BEAR' ||
        event.type === 'CHOCH_BEAR',
    ).length;

  const normalized =
    (bullishEvents - bearishEvents) /
    Math.max(
      1,
      recentEvents.length,
    );

  return {
    key: 'marketStructure',
    label: 'Estrutura SMC',
    direction,
    weight: 12,
    contribution: normalized * 12,
    explanation:
      direction === 'BUY'
        ? 'Estrutura recente favorece movimentos de alta.'
        : direction === 'SELL'
          ? 'Estrutura recente favorece movimentos de baixa.'
          : 'Estrutura sem direção dominante.',
  };
}

function buildOrderBlockFactor(
  result: AnalysisResult,
  candles: Candle[],
): InstitutionalFactor {
  const analysis =
    analyzeOrderBlocks(candles);

  const price = result.price;

  const bullishDistance =
    analysis.nearestBullish
      ? Math.abs(
          analysis.nearestBullish.midpoint -
            price,
        )
      : Number.POSITIVE_INFINITY;

  const bearishDistance =
    analysis.nearestBearish
      ? Math.abs(
          analysis.nearestBearish.midpoint -
            price,
        )
      : Number.POSITIVE_INFINITY;

  let value = 0;
  let explanation =
    'Nenhum Order Block relevante próximo ao preço.';

  if (
    bullishDistance <
    bearishDistance
  ) {
    const strength =
      analysis.nearestBullish?.strength ??
      0;

    value = strength / 100;

    explanation =
      'Preço mais próximo de um Order Block comprador.';
  } else if (
    bearishDistance <
    bullishDistance
  ) {
    const strength =
      analysis.nearestBearish?.strength ??
      0;

    value = -(strength / 100);

    explanation =
      'Preço mais próximo de um Order Block vendedor.';
  }

  return {
    key: 'orderBlock',
    label: 'Order Block',
    direction:
      directionFromNumber(value),
    weight: 9,
    contribution: value * 9,
    explanation,
  };
}

function buildFvgFactor(
  result: AnalysisResult,
  candles: Candle[],
): InstitutionalFactor {
  const analysis =
    analyzeFairValueGaps(candles);

  const price = result.price;

  const bullishDistance =
    analysis.nearestBullish
      ? Math.abs(
          analysis.nearestBullish.midpoint -
            price,
        )
      : Number.POSITIVE_INFINITY;

  const bearishDistance =
    analysis.nearestBearish
      ? Math.abs(
          analysis.nearestBearish.midpoint -
            price,
        )
      : Number.POSITIVE_INFINITY;

  let value = 0;
  let explanation =
    'Nenhum FVG relevante próximo ao preço.';

  if (
    bullishDistance <
    bearishDistance
  ) {
    const strength =
      analysis.nearestBullish?.strength ??
      0;

    value = strength / 100;

    explanation =
      'Preço mais próximo de um FVG comprador.';
  } else if (
    bearishDistance <
    bullishDistance
  ) {
    const strength =
      analysis.nearestBearish?.strength ??
      0;

    value = -(strength / 100);

    explanation =
      'Preço mais próximo de um FVG vendedor.';
  }

  return {
    key: 'fairValueGap',
    label: 'Fair Value Gap',
    direction:
      directionFromNumber(value),
    weight: 8,
    contribution: value * 8,
    explanation,
  };
}

function buildLiquidityFactor(
  candles: Candle[],
): InstitutionalFactor {
  const analysis =
    analyzeLiquiditySweeps(candles);

  const latest =
    analysis.sweeps[
      analysis.sweeps.length - 1
    ];

  if (!latest) {
    return {
      key: 'liquiditySweep',
      label: 'Liquidity Sweep',
      direction: 'WAIT',
      weight: 8,
      contribution: 0,
      explanation:
        'Nenhuma varredura de liquidez recente.',
    };
  }

  const base =
    latest.strength / 100;

  const value =
    latest.direction === 'BULLISH'
      ? base
      : -base;

  return {
    key: 'liquiditySweep',
    label: 'Liquidity Sweep',
    direction:
      directionFromNumber(value),
    weight: 8,
    contribution: value * 8,
    explanation:
      latest.direction === 'BULLISH'
        ? 'Varredura de liquidez compradora detectada.'
        : 'Varredura de liquidez vendedora detectada.',
  };
}

function buildFibonacciFactor(
  result: AnalysisResult,
  candles: Candle[],
): InstitutionalFactor {
  const analysis =
    analyzeFibonacci(candles);

  if (
    !analysis ||
    !analysis.nearestLevel
  ) {
    return {
      key: 'fibonacci',
      label: 'Fibonacci',
      direction: 'WAIT',
      weight: 7,
      contribution: 0,
      explanation:
        'Nenhum nível de Fibonacci relevante.',
    };
  }

  const importantRatios = [
    0.382,
    0.5,
    0.618,
    0.786,
  ];

  const isImportant =
    importantRatios.includes(
      analysis.nearestLevel.ratio,
    );

  const distancePercent =
    Math.abs(
      result.price -
        analysis.nearestLevel.price,
    ) /
    Math.max(
      result.price,
      Number.EPSILON,
    );

  const proximity =
    clamp(
      1 - distancePercent * 150,
      0,
      1,
    );

  const base =
    isImportant
      ? proximity
      : proximity * 0.5;

  const value =
    analysis.direction === 'BULLISH'
      ? base
      : -base;

  return {
    key: 'fibonacci',
    label: 'Fibonacci',
    direction:
      directionFromNumber(value),
    weight: 7,
    contribution: value * 7,
    explanation:
      `Preço próximo do nível ${analysis.nearestLevel.label}.`,
  };
}

function buildMultiTimeframeFactor(
  multiTimeframe:
    MultiTimeframeAnalysis | null,
): InstitutionalFactor {
  if (!multiTimeframe) {
    return {
      key: 'multiTimeframe',
      label: 'Multi TimeFrame',
      direction: 'WAIT',
      weight: 9,
      contribution: 0,
      explanation:
        'Análise multi timeframe indisponível.',
    };
  }

  const signal =
    multiTimeframe.finalSignal;

  const value =
    signalValue(signal) *
    (multiTimeframe.alignment / 100);

  return {
    key: 'multiTimeframe',
    label: 'Multi TimeFrame',
    direction: signal,
    weight: 9,
    contribution: value * 9,
    explanation:
      `${multiTimeframe.alignment}% de alinhamento entre os timeframes.`,
  };
}

function calculateRisk(
  confidence: number,
  confluence: number,
  factors: InstitutionalFactor[],
): InstitutionalRisk {
  const conflicts =
    factors.filter(
      (factor) =>
        factor.direction !== 'WAIT',
    );

  const buyCount =
    conflicts.filter(
      (factor) =>
        factor.direction === 'BUY',
    ).length;

  const sellCount =
    conflicts.filter(
      (factor) =>
        factor.direction === 'SELL',
    ).length;

  const disagreement =
    Math.min(
      buyCount,
      sellCount,
    );

  if (
    confidence >= 75 &&
    confluence >= 75 &&
    disagreement <= 2
  ) {
    return 'LOW';
  }

  if (
    confidence >= 55 &&
    confluence >= 55
  ) {
    return 'MEDIUM';
  }

  return 'HIGH';
}

function decisionFromScore(
  score: number,
): {
  decision: InstitutionalDecision;
  signal: Signal;
} {
  if (score >= 75) {
    return {
      decision: 'STRONG_BUY',
      signal: 'BUY',
    };
  }

  if (score >= 60) {
    return {
      decision: 'BUY',
      signal: 'BUY',
    };
  }

  if (score <= 25) {
    return {
      decision: 'STRONG_SELL',
      signal: 'SELL',
    };
  }

  if (score <= 40) {
    return {
      decision: 'SELL',
      signal: 'SELL',
    };
  }

  return {
    decision: 'WAIT',
    signal: 'WAIT',
  };
}

function buildSummary(
  decision: InstitutionalDecision,
  confluence: number,
  risk: InstitutionalRisk,
): string {
  const decisionLabel =
    decision === 'STRONG_BUY'
      ? 'Compra forte'
      : decision === 'BUY'
        ? 'Compra'
        : decision === 'STRONG_SELL'
          ? 'Venda forte'
          : decision === 'SELL'
            ? 'Venda'
            : 'Aguardar';

  const riskLabel =
    risk === 'LOW'
      ? 'baixo'
      : risk === 'MEDIUM'
        ? 'moderado'
        : 'alto';

  return `${decisionLabel} com ${confluence}% de confluência e risco ${riskLabel}.`;
}

export function analyzeInstitutionalAI({
  result,
  candles,
  multiTimeframe,
}: InstitutionalAIInput): InstitutionalAnalysis {
  const factors: InstitutionalFactor[] = [
    ...buildTechnicalFactors(result),
    buildMarketStructureFactor(candles),
    buildOrderBlockFactor(
      result,
      candles,
    ),
    buildFvgFactor(
      result,
      candles,
    ),
    buildLiquidityFactor(candles),
    buildFibonacciFactor(
      result,
      candles,
    ),
    buildMultiTimeframeFactor(
      multiTimeframe,
    ),
  ];

  const totalWeight =
    factors.reduce(
      (total, factor) =>
        total + factor.weight,
      0,
    );

  const totalContribution =
    factors.reduce(
      (total, factor) =>
        total +
        factor.contribution,
      0,
    );

  const normalizedBias =
    totalContribution /
    Math.max(
      totalWeight,
      Number.EPSILON,
    );

  const score = Math.round(
    clamp(
      50 + normalizedBias * 50,
      0,
      100,
    ),
  );

  const positiveFactors =
    factors.filter(
      (factor) =>
        factor.direction === 'BUY',
    ).length;

  const negativeFactors =
    factors.filter(
      (factor) =>
        factor.direction === 'SELL',
    ).length;

  const neutralFactors =
    factors.filter(
      (factor) =>
        factor.direction === 'WAIT',
    ).length;

  const dominant =
    Math.max(
      positiveFactors,
      negativeFactors,
      neutralFactors,
    );

  const confluence = Math.round(
    (dominant / factors.length) * 100,
  );

  const confidence = Math.round(
    clamp(
      40 +
        Math.abs(
          score - 50,
        ) *
          0.9 +
        confluence * 0.25,
      0,
      100,
    ),
  );

  const {
    decision,
    signal,
  } = decisionFromScore(score);

  const risk = calculateRisk(
    confidence,
    confluence,
    factors,
  );

  return {
    score,
    confidence,
    confluence,
    risk,
    decision,
    signal,
    factors,
    positiveFactors,
    negativeFactors,
    neutralFactors,
    summary: buildSummary(
      decision,
      confluence,
      risk,
    ),
  };
}