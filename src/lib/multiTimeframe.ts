import type {
  Asset,
  Timeframe,
  AnalysisResult,
  Signal,
} from '@/types';

import { getMarketDataProvider } from '@/services/types';

export interface TimeframeAnalysis {
  timeframe: Timeframe;
  signal: Signal;
  score: number;
  confidence: number;
  trend: AnalysisResult['trend'];
}

export interface MultiTimeframeAnalysis {
  asset: Asset;
  analyses: TimeframeAnalysis[];
  alignment: number;
  finalSignal: Signal;
  finalLabel:
    | 'COMPRA FORTE'
    | 'COMPRA'
    | 'VENDA FORTE'
    | 'VENDA'
    | 'NEUTRO';
  averageScore: number;
  averageConfidence: number;
}

const MULTI_TIMEFRAMES: Timeframe[] = [
  '1m',
  '5m',
  '15m',
  '60m',
];

function signalValue(signal: Signal): number {
  if (signal === 'BUY') return 1;
  if (signal === 'SELL') return -1;
  return 0;
}

function calculateAlignment(
  analyses: TimeframeAnalysis[],
): number {
  if (analyses.length === 0) {
    return 0;
  }

  const buyCount = analyses.filter(
    (item) => item.signal === 'BUY',
  ).length;

  const sellCount = analyses.filter(
    (item) => item.signal === 'SELL',
  ).length;

  const waitCount = analyses.filter(
    (item) => item.signal === 'WAIT',
  ).length;

  const dominantCount = Math.max(
    buyCount,
    sellCount,
    waitCount,
  );

  return Math.round(
    (dominantCount / analyses.length) * 100,
  );
}

function calculateFinalSignal(
  analyses: TimeframeAnalysis[],
): Signal {
  if (analyses.length === 0) {
    return 'WAIT';
  }

  const weightedVote = analyses.reduce(
    (total, item) => {
      const weight =
        item.confidence / 100;

      return (
        total +
        signalValue(item.signal) * weight
      );
    },
    0,
  );

  if (weightedVote >= 1.5) {
    return 'BUY';
  }

  if (weightedVote <= -1.5) {
    return 'SELL';
  }

  return 'WAIT';
}

function calculateFinalLabel(
  signal: Signal,
  alignment: number,
): MultiTimeframeAnalysis['finalLabel'] {
  if (signal === 'BUY') {
    return alignment >= 75
      ? 'COMPRA FORTE'
      : 'COMPRA';
  }

  if (signal === 'SELL') {
    return alignment >= 75
      ? 'VENDA FORTE'
      : 'VENDA';
  }

  return 'NEUTRO';
}

export async function analyzeMultipleTimeframes(
  asset: Asset,
): Promise<MultiTimeframeAnalysis> {
  const provider = getMarketDataProvider();

  const results = await Promise.all(
    MULTI_TIMEFRAMES.map(
      async (timeframe) => {
        const result =
          await provider.analyze(
            asset,
            timeframe,
          );

        return {
          timeframe,
          signal: result.finalSignal,
          score: result.score,
          confidence: result.confidence,
          trend: result.trend,
        };
      },
    ),
  );

  const alignment =
    calculateAlignment(results);

  const finalSignal =
    calculateFinalSignal(results);

  const averageScore = Math.round(
    results.reduce(
      (total, item) =>
        total + item.score,
      0,
    ) / results.length,
  );

  const averageConfidence = Math.round(
    results.reduce(
      (total, item) =>
        total + item.confidence,
      0,
    ) / results.length,
  );

  return {
    asset,
    analyses: results,
    alignment,
    finalSignal,
    finalLabel:
      calculateFinalLabel(
        finalSignal,
        alignment,
      ),
    averageScore,
    averageConfidence,
  };
}