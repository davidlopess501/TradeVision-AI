import type { AlgorithmWeights, WeightKey, AlgorithmProfile, WeightMeta } from '@/types';

/**
 * Configuração do Algoritmo
 *
 * Defines the weight configuration for the scoring engine. Each weight
 * controls how much a criterion contributes to the final Score. The
 * engine is prepared to use these weights during signal generation —
 * today they influence the score simulation; when real signals are
 * generated, the same weights will be applied.
 */

export const WEIGHT_META: WeightMeta[] = [
  { key: 'trend', label: 'Tendência', description: 'Direção dominante do mercado', defaultWeight: 20 },
  { key: 'volume', label: 'Volume', description: 'Pressão de compradores vs. vendedores', defaultWeight: 15 },
  { key: 'rsi', label: 'RSI', description: 'Índice de força relativa', defaultWeight: 10 },
  { key: 'macd', label: 'MACD', description: 'Convergência/divergência de médias', defaultWeight: 10 },
  { key: 'movingAverages', label: 'Médias Móveis', description: 'EMA 9 e EMA 21 — cruzamentos', defaultWeight: 15 },
  { key: 'volatility', label: 'Volatilidade', description: 'ATR — amplitude dos movimentos', defaultWeight: 10 },
  { key: 'momentum', label: 'Momentum', description: 'Força e aceleração do movimento', defaultWeight: 15 },
];

export const META_BY_WEIGHT: Record<WeightKey, WeightMeta> = Object.fromEntries(
  WEIGHT_META.map((w) => [w.key, w]),
) as Record<WeightKey, WeightMeta>;

export const DEFAULT_WEIGHTS: AlgorithmWeights = {
  trend: 20,
  volume: 15,
  rsi: 10,
  macd: 10,
  movingAverages: 15,
  volatility: 10,
  momentum: 15,
};

export const PROFILES: Record<Exclude<AlgorithmProfile, 'CUSTOM'>, AlgorithmWeights> = {
  CONSERVATIVE: {
    trend: 25,
    volume: 18,
    rsi: 12,
    macd: 8,
    movingAverages: 20,
    volatility: 15,
    momentum: 10,
  },
  MODERATE: {
    trend: 20,
    volume: 15,
    rsi: 10,
    macd: 10,
    movingAverages: 15,
    volatility: 10,
    momentum: 15,
  },
  AGGRESSIVE: {
    trend: 15,
    volume: 10,
    rsi: 8,
    macd: 15,
    movingAverages: 12,
    volatility: 8,
    momentum: 25,
  },
};

export const PROFILE_LABELS: Record<AlgorithmProfile, string> = {
  CONSERVATIVE: 'Conservador',
  MODERATE: 'Moderado',
  AGGRESSIVE: 'Agressivo',
  CUSTOM: 'Personalizado',
};

export const PROFILE_DESC: Record<AlgorithmProfile, string> = {
  CONSERVATIVE: 'Prioriza tendência e médias móveis, reduzindo peso do momentum',
  MODERATE: 'Equilíbrio entre todos os critérios — configuração padrão',
  AGGRESSIVE: 'Dá peso máximo ao momentum e MACD para capturar movimentos rápidos',
  CUSTOM: 'Configuração personalizada definida manualmente',
};

/** Returns the profile that matches the given weights, or CUSTOM. */
export function detectProfile(w: AlgorithmWeights): AlgorithmProfile {
  for (const [key, val] of Object.entries(PROFILES)) {
    const k = key as Exclude<AlgorithmProfile, 'CUSTOM'>;
    if (JSON.stringify(PROFILES[k]) === JSON.stringify(w)) return k;
  }
  return 'CUSTOM';
}

/**
 * Simulates how the given weights alter the final Score. Each weight is
 * converted to a share of the total, and a fixed set of criterion
 * strengths is scaled by that share. The returned points show the
 * contribution of each criterion and the total score.
 */
export function simulateScore(weights: AlgorithmWeights): {
  contributions: { key: WeightKey; label: string; points: number; share: number }[];
  totalScore: number;
} {
  // Fixed reference strengths (simulated criterion readings)
  const strengths: Record<WeightKey, number> = {
    trend: 72,
    volume: 58,
    rsi: 65,
    macd: 70,
    movingAverages: 68,
    volatility: 45,
    momentum: 75,
  };

  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;

  const contributions = WEIGHT_META.map((meta) => {
    const weight = weights[meta.key];
    const share = weight / totalWeight; // 0..1
    const points = Math.round(strengths[meta.key] * share); // weighted contribution
    return { key: meta.key, label: meta.label, points, share: Math.round(share * 100) };
  });

  const totalScore = Math.max(0, Math.min(100, contributions.reduce((a, c) => a + c.points, 0)));

  return { contributions, totalScore };
}

/**
 * Generates a score curve across a range of configurations — from the
 * given weights through progressive changes — to visualize how weight
 * adjustments affect the final score. Used by the impact chart.
 */
export function scoreImpactCurve(weights: AlgorithmWeights): { x: number; y: number; label: string }[] {
  const base = simulateScore(weights).totalScore;
  const points = WEIGHT_META.map((meta, i) => {
    // For each weight, show the score when that weight is doubled
    const modified: AlgorithmWeights = { ...weights };
    modified[meta.key] = weights[meta.key] * 2;
    const score = simulateScore(modified).totalScore;
    return { x: i, y: score, label: meta.label };
  });
  return [{ x: -1, y: base, label: 'Atual' }, ...points];
}
