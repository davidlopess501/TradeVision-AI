import type {
  AnalysisResult,
  AdaptiveEvaluation,
  SignalQuality,
  IAdaptiveAI,
  Signal,
  Trade,
} from '@/types';
import { META_BY_KEY } from '@/lib/indicators';

export function classifyQuality(score: number): { quality: SignalQuality; label: string; tone: 'bull' | 'accent' | 'wait' | 'gold' | 'bear' } {
  if (score >= 80) return { quality: 'EXCELLENT', label: 'Excelente', tone: 'bull' };
  if (score >= 65) return { quality: 'GOOD', label: 'Boa', tone: 'accent' };
  if (score >= 45) return { quality: 'AVERAGE', label: 'Média', tone: 'wait' };
  if (score >= 25) return { quality: 'WEAK', label: 'Fraca', tone: 'gold' };
  return { quality: 'POOR', label: 'Ruim', tone: 'bear' };
}

export const QUALITY_BANDS = [
  { quality: 'EXCELLENT' as SignalQuality, label: 'Excelente', range: '80–100', tone: 'bull' as const, min: 80 },
  { quality: 'GOOD' as SignalQuality, label: 'Boa', range: '65–79', tone: 'accent' as const, min: 65 },
  { quality: 'AVERAGE' as SignalQuality, label: 'Média', range: '45–64', tone: 'wait' as const, min: 45 },
  { quality: 'WEAK' as SignalQuality, label: 'Fraca', range: '25–44', tone: 'gold' as const, min: 25 },
  { quality: 'POOR' as SignalQuality, label: 'Ruim', range: '0–24', tone: 'bear' as const, min: 0 },
];

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

const POSITIVE_BUY = [
  'Tendência de alta confirmada pela estrutura de topos e fundos',
  'EMA 9 cruzou acima da EMA 21 — momentum altista',
  'Volume comprador acima da média sustentando o movimento',
  'RSI em zona saudável, sem sobrecompra',
  'MACD com histograma positivo e acelerando',
  'Preço respeitou região de suporte',
  'Alinhamento de múltiplos indicadores na direção de compra',
];

const POSITIVE_SELL = [
  'Tendência de baixa confirmada pela estrutura de topos e fundos',
  'EMA 9 cruzou abaixo da EMA 21 — momentum baixista',
  'Volume vendedor acima da média pressionando o preço',
  'RSI em deterioração, sinal de fraqueza',
  'MACD com histograma negativo',
  'Preço respeitou região de resistência',
  'Alinhamento de múltiplos indicadores na direção de venda',
];

const NEGATIVE_TPL = [
  'Volatilidade elevada pode gerar falsos movimentos',
  'Spread ampliado aumenta o custo de entrada',
  'Indicadores de momentum divergem da tendência',
  'Volume abaixo da média reduz a confiabilidade',
  'Proximidade de suporte/resistência pode limitar o movimento',
  'RSI próximo de zona de reversão',
  'Convergência de médias ainda não confirmada',
];

const NEUTRAL_POS = [
  'Mercado sem direção clara — risco de falso movimento reduzido ao aguardar',
  'Indicadores equilibrados, sem viés dominante',
];

const NEUTRAL_NEG = [
  'Falta de tendência impossibilita entrada direcional',
  'Médias entrelaçadas geram sinais conflitantes',
  'Volume baixo reduz a confiabilidade de qualquer movimento',
];

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  return [...arr].sort(() => rng() - 0.5).slice(0, n);
}

function buildExplanation(result: AnalysisResult, qScore: number): string {
  const q = classifyQuality(qScore);
  const dir = result.finalSignal === 'BUY' ? 'compra' : result.finalSignal === 'SELL' ? 'venda' : 'aguardar';
  if (result.finalSignal === 'WAIT') {
    return `A IA avaliou este sinal como de qualidade ${q.label.toLowerCase()} (${qScore}/100). Os indicadores não convergem em uma direção clara — não há viés dominante. A recomendação é aguardar uma definição de mercado antes de assumir qualquer posição direcional.`;
  }
  return `A IA avaliou este sinal de ${dir.toUpperCase()} como de qualidade ${q.label.toLowerCase()} (${qScore}/100). A análise combinou ${result.indicators.length} indicadores técnicos, com confiança de ${result.confidence}%. ${q.quality === 'EXCELLENT' || q.quality === 'GOOD' ? 'O alinhamento entre os indicadores reforça a robustez do sinal.' : q.quality === 'AVERAGE' ? 'Há alinhamento parcial — vale aguardar confirmação adicional.' : 'Os indicadores apresentam divergências que reduzem a confiabilidade do sinal.'}`;
}

export class SimulatedAdaptiveAI implements IAdaptiveAI {
  readonly name = 'IA Adaptativa (Simulada)';
  private winBias = 0;

  learnFromHistory(trades: Trade[]): void {
    if (trades.length === 0) return;
    const winRate = trades.filter((t) => t.result === 'WIN').length / trades.length;
    this.winBias = (winRate - 0.5) * 10;
  }

  evaluate(result: AnalysisResult): AdaptiveEvaluation {
    const rng = mulberry32(hashStr(`adapt-${result.id}-${result.score}`));
    const qScore = Math.max(0, Math.min(100, Math.round(result.score * 0.7 + result.confidence * 0.3 + this.winBias)));
    const q = classifyQuality(qScore);

    const indicatorsUsed = result.indicators
      .slice()
      .sort((a, b) => Math.abs(b.strength - 50) - Math.abs(a.strength - 50))
      .slice(0, 5)
      .map((ind) => ({
        name: META_BY_KEY[ind.key].label,
        contribution: Math.round(Math.abs(ind.strength - 50) * 2),
        direction: ind.signal,
      }));

    const positivePool = result.finalSignal === 'BUY' ? POSITIVE_BUY : result.finalSignal === 'SELL' ? POSITIVE_SELL : NEUTRAL_POS;
    const negativePool = result.finalSignal === 'WAIT' ? NEUTRAL_NEG : NEGATIVE_TPL;
    const posCount = q.quality === 'EXCELLENT' || q.quality === 'GOOD' ? 4 : q.quality === 'AVERAGE' ? 3 : 2;
    const negCount = q.quality === 'POOR' || q.quality === 'WEAK' ? 4 : q.quality === 'AVERAGE' ? 3 : 2;

    return {
      id: `adapt-${result.id}`,
      asset: result.asset,
      signal: result.finalSignal,
      quality: q.quality,
      qualityScore: qScore,
      confidence: result.confidence,
      detailedExplanation: buildExplanation(result, qScore),
      indicatorsUsed,
      positivePoints: pickN(positivePool, posCount, rng),
      negativePoints: pickN(negativePool, negCount, rng),
      createdAt: result.createdAt,
    };
  }
}

let _ai: IAdaptiveAI = new SimulatedAdaptiveAI();

export function getAdaptiveAI(): IAdaptiveAI {
  return _ai;
}

export function setAdaptiveAI(ai: IAdaptiveAI): void {
  _ai = ai;
}

export function evaluateSignal(result: AnalysisResult): AdaptiveEvaluation {
  return getAdaptiveAI().evaluate(result);
}

export function signalDirLabel(signal: Signal): string {
  return signal === 'BUY' ? 'Compra' : signal === 'SELL' ? 'Venda' : 'Aguardar';
}
