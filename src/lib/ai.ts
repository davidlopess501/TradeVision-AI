import type { AnalysisResult, AIExplanation, IndicatorKey } from '@/types';
import { META_BY_KEY, signalLabel } from '@/lib/indicators';

/**
 * Builds a simulated AI explanation from an analysis result. When a real
 * model is wired in, replace this with a call to the model — the return
 * shape (AIExplanation) is what the IA screen renders.
 */
export function buildAIExplanation(result: AnalysisResult): AIExplanation {
  const sorted = [...result.indicators].sort((a, b) => Math.abs(b.strength - 50) - Math.abs(a.strength - 50));
  const top = sorted.slice(0, 3);

  const contributing = top.map((ind) => {
    const meta = META_BY_KEY[ind.key];
    const weight = Math.round(((ind.strength - 50) / 50) * 100);
    return {
      key: ind.key as IndicatorKey,
      weight: Math.abs(weight),
      note: `${meta.label} sugere ${signalLabel(ind.signal).toLowerCase()} (${ind.value}).`,
    };
  });

  const dir = result.finalSignal === 'BUY' ? 'compradora' : result.finalSignal === 'SELL' ? 'vendedora' : 'lateral';
  const reasoning =
    result.finalSignal === 'WAIT'
      ? `Os indicadores estão divergentes e o mercado não apresenta viés claro. A leitura da IA é de consolidação — recomenda-se aguardar confirmação antes de operar. Score ${result.aiScore}/100 com ${result.confidence}% de confiança.`
      : `A IA detectou uma tendência ${dir} no momento. ${top
          .map((i) => `${META_BY_KEY[i.key].label} (${signalLabel(i.signal)})`)
          .join(', ')} são os principais contribuintes para o sinal de ${signalLabel(
          result.finalSignal,
        ).toUpperCase()}. Score ${result.aiScore}/100, confiança ${result.confidence}%.`;

  return {
    score: result.aiScore,
    reasoning,
    contributingIndicators: contributing,
    confidence: result.confidence,
  };
}
