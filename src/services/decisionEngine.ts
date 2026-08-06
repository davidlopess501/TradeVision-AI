import type {
  AnalysisResult,
} from '@/types';

export type DecisionAction =
  | 'BUY'
  | 'SELL'
  | 'WAIT';

export interface DecisionResult {
  action: DecisionAction;
  confidence: number;
  reason: string;
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

export function evaluateAnalysis(
  analysis: AnalysisResult,
): DecisionResult {
  const confidence = clamp(
    Math.round(
      analysis.confidence * 0.5 +
        analysis.probability * 0.3 +
        analysis.aiScore * 0.2,
    ),
    0,
    100,
  );

  if (
    analysis.finalSignal === 'BUY' &&
    analysis.trend === 'ALTA' &&
    analysis.score >= 65 &&
    confidence >= 65
  ) {
    return {
      action: 'BUY',
      confidence,
      reason:
        'Compra validada por tendência de alta, score técnico e confiança suficientes.',
    };
  }

  if (
    analysis.finalSignal === 'SELL' &&
    analysis.trend === 'BAIXA' &&
    analysis.score >= 65 &&
    confidence >= 65
  ) {
    return {
      action: 'SELL',
      confidence,
      reason:
        'Venda validada por tendência de baixa, score técnico e confiança suficientes.',
    };
  }

  return {
    action: 'WAIT',
    confidence,
    reason:
      'Os critérios mínimos de tendência, score e confiança ainda não foram atingidos.',
  };
}