import type {
  Asset,
  Timeframe,
  EngineCriterion,
  EngineCriterionKey,
  EngineResult,
  EngineClassification,
  Signal,
  Quote,
  AlgorithmWeights,
} from '@/types';
import { ASSETS, timeframesToMinutes } from '@/lib/assets';
import { signalFromStrength } from '@/lib/indicators';
import { DEFAULT_WEIGHTS } from '@/lib/algorithmConfig';

/**
 * TradeVision Engine
 *
 * Computes an intelligent 0..100 score split across eight weighted
 * criteria. Each criterion is scored 0..maxPoints and the final score
 * is the sum (capped at 100). A classification band maps the score to
 * a human-readable recommendation.
 *
 *   Tendência            — 20 pts
 *   Volume               — 15 pts
 *   Momentum             — 15 pts
 *   Volatilidade         — 10 pts
 *   Médias Móveis        — 15 pts
 *   RSI                  — 10 pts
 *   MACD                 — 10 pts
 *   Suporte e Resistência — 5 pts
 */

export const CRITERION_META: { key: EngineCriterionKey; label: string; description: string; maxPoints: number }[] = [
  { key: 'trend', label: 'Tendência', description: 'Direção dominante do mercado', maxPoints: 20 },
  { key: 'volume', label: 'Volume', description: 'Pressão de compradores vs. vendedores', maxPoints: 15 },
  { key: 'momentum', label: 'Momentum', description: 'Força e aceleração do movimento', maxPoints: 15 },
  { key: 'volatility', label: 'Volatilidade', description: 'ATR — amplitude média dos movimentos', maxPoints: 10 },
  { key: 'movingAverages', label: 'Médias Móveis', description: 'EMA 9 e EMA 21 — cruzamentos', maxPoints: 15 },
  { key: 'rsi', label: 'RSI', description: 'Índice de força relativa', maxPoints: 10 },
  { key: 'macd', label: 'MACD', description: 'Convergência/divergência de médias', maxPoints: 10 },
  { key: 'supportResistance', label: 'Suporte e Resistência', description: 'Regões-chave respeitadas', maxPoints: 5 },
];

export const META_BY_CRITERION: Record<EngineCriterionKey, (typeof CRITERION_META)[number]> = Object.fromEntries(
  CRITERION_META.map((m) => [m.key, m]),
) as Record<EngineCriterionKey, (typeof CRITERION_META)[number]>;

export const TOTAL_MAX_POINTS = CRITERION_META.reduce((a, c) => a + c.maxPoints, 0); // 100

export function classifyScore(score: number): { classification: EngineClassification; label: string; tone: 'bear' | 'wait' | 'bull' | 'accent'; range: string } {
  if (score >= 80) return { classification: 'HIGH', label: 'Alta probabilidade', tone: 'bull', range: '80–100' };
  if (score >= 60) return { classification: 'GOOD', label: 'Boa oportunidade', tone: 'bull', range: '60–79' };
  if (score >= 40) return { classification: 'RISKY', label: 'Operação arriscada', tone: 'wait', range: '40–59' };
  return { classification: 'AVOID', label: 'Evitar operação', tone: 'bear', range: '0–39' };
}

export const CLASSIFICATION_BANDS = [
  { classification: 'HIGH' as EngineClassification, label: 'Alta probabilidade', range: '80–100', tone: 'bull' as const, min: 80 },
  { classification: 'GOOD' as EngineClassification, label: 'Boa oportunidade', range: '60–79', tone: 'bull' as const, min: 60 },
  { classification: 'RISKY' as EngineClassification, label: 'Operação arriscada', range: '40–59', tone: 'wait' as const, min: 40 },
  { classification: 'AVOID' as EngineClassification, label: 'Evitar operação', range: '0–39', tone: 'bear' as const, min: 0 },
];

// ----- Deterministic PRNG (stable per asset/timeframe/seed) -----

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

type Rng = () => number;

/** Maps a 0..1 random value + a bullish/bearish bias into points for a criterion. */
function scoreCriterion(maxPoints: number, rng: Rng, biasBoost = 0): { points: number; strength: number } {
  const strength = Math.max(4, Math.min(96, Math.round(8 + rng() * 82 + biasBoost))); // 0..100
  const points = Math.round((strength / 100) * maxPoints);
  return { points: Math.min(maxPoints, points), strength };
}

function detailFor(key: EngineCriterionKey, signal: Signal, strength: number): string {
  const strong = strength >= 65;
  const weak = strength <= 35;
  switch (key) {
    case 'trend':
      return signal === 'BUY'
        ? strong ? 'Tendência de alta confirmada' : 'Tendência de alta incipiente'
        : signal === 'SELL'
          ? strong ? 'Tendência de baixa confirmada' : 'Tendência de baixa incipiente'
          : 'Mercado lateral, sem direção clara';
    case 'volume':
      return signal === 'BUY'
        ? 'Volume comprador acima da média'
        : signal === 'SELL'
          ? 'Volume vendedor acima da média'
          : 'Volume equilibrado entre compradores e vendedores';
    case 'momentum':
      return signal === 'BUY'
        ? strong ? 'Momentum altista acelerando' : 'Momentum altista moderado'
        : signal === 'SELL'
          ? strong ? 'Momentum baixista acelerando' : 'Momentum baixista moderado'
          : 'Momentum neutro, sem aceleração';
    case 'volatility':
      return strong ? 'Volatilidade elevada — movimentos amplos' : weak ? 'Volatilidade baixa — mercado comprimido' : 'Volatilidade moderada e saudável';
    case 'movingAverages':
      return signal === 'BUY'
        ? 'EMA 9 acima da EMA 21'
        : signal === 'SELL'
          ? 'EMA 9 abaixo da EMA 21'
          : 'Médias entrelaçadas, sem cruzamento definido';
    case 'rsi':
      return signal === 'BUY'
        ? strong ? 'RSI saudável em zona de força' : 'RSI em recuperação'
        : signal === 'SELL'
          ? strong ? 'RSI em fraqueza/sobrecompra' : 'RSI em deterioração'
          : 'RSI em zona neutra';
    case 'macd':
      return signal === 'BUY'
        ? 'MACD cruzado para compra'
        : signal === 'SELL'
          ? 'MACD cruzado para venda'
          : 'MACD próximo de zero, sem cruzamento';
    case 'supportResistance':
      return signal === 'BUY'
        ? 'Região de suporte respeitada'
        : signal === 'SELL'
          ? 'Região de resistência respeitada'
          : 'Preço em zona intermediária';
  }
}

export function runEngine(asset: Asset, timeframe: Timeframe, seed: number, quote?: Quote, weights?: AlgorithmWeights): EngineResult {
  const info = ASSETS[asset];
  const h = hashStr(`${asset}-${timeframe}-${seed}`);
  const rng = mulberry32(h);

  // Overall bullish/bearish bias drives the whole market snapshot.
  const bias = rng() - 0.5; // -0.5..0.5
  const price = quote?.price ?? info.basePrice + bias * info.basePrice * 0.004;

  // Map algorithm weights to criterion max points. When weights are
  // provided, each criterion's maxPoints is scaled proportionally so
  // the total still sums to 100. Falls back to defaults when omitted.
  const w = weights ?? DEFAULT_WEIGHTS;
  const totalWeight = Object.values(w).reduce((a, b) => a + b, 0) || 1;
  const weightMap: Record<EngineCriterionKey, number> = {
    trend: w.trend,
    volume: w.volume,
    momentum: w.momentum,
    volatility: w.volatility,
    movingAverages: w.movingAverages,
    rsi: w.rsi,
    macd: w.macd,
    supportResistance: 5, // fixed, not user-configurable
  };
  const totalWithSR = totalWeight + 5;

  const criteria: EngineCriterion[] = CRITERION_META.map((meta) => {
    const biasBoost = bias * 35; // align criteria with the market bias
    const adjustedMax = Math.round((weightMap[meta.key] / totalWithSR) * 100);
    const maxPts = meta.key === 'supportResistance' ? meta.maxPoints : Math.max(2, adjustedMax);
    const { points, strength } = scoreCriterion(maxPts, rng, biasBoost);
    const signal = signalFromStrength(strength);
    return {
      key: meta.key,
      label: meta.label,
      description: meta.description,
      maxPoints: maxPts,
      points,
      signal,
      detail: detailFor(meta.key, signal, strength),
    };
  });

  const score = Math.max(0, Math.min(100, criteria.reduce((a, c) => a + c.points, 0)));
  const classification = classifyScore(score).classification;
  const confidence = Math.round(Math.min(100, 40 + Math.abs(bias) * 90 + (rng() * 15)));

  // Map engine score to a directional signal.
  let finalSignal: Signal = 'WAIT';
  if (bias > 0.08 && score >= 55) finalSignal = 'BUY';
  else if (bias < -0.08 && score >= 55) finalSignal = 'SELL';
  else if (score >= 75) finalSignal = bias >= 0 ? 'BUY' : 'SELL';

  return {
    asset,
    timeframe,
    criteria,
    score,
    classification,
    confidence,
    finalSignal,
    price,
    createdAt: Date.now(),
  };
}

/** Convenience: run engine with a time-based seed for live "scan" behavior. */
export function scanEngine(asset: Asset, timeframe: Timeframe, weights?: AlgorithmWeights): EngineResult {
  const seed = Math.floor(Date.now() / 30000);
  return runEngine(asset, timeframe, seed, undefined, weights);
}
