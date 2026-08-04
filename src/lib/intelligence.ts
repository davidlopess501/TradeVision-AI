import type {
  AnalysisResult,
  SignalExplanation,
  SignalConfirmation,
  ISignalExplainer,
  Signal,
} from '@/types';
import { META_BY_KEY, signalLabel } from '@/lib/indicators';

/**
 * Central de Inteligência
 *
 * Turns an analysis result into a human-readable explanation built from
 * individual "confirmations" — each one a checklist item the trader can
 * verify visually. Today a simulated explainer generates these from the
 * indicator readings; in the future an AI model can implement
 * ISignalExplainer to explain each signal automatically without changing
 * the screen.
 */

interface ConfirmationTemplate {
  id: string;
  label: string;
  description: string;
}

const BUY_CONFIRMATIONS: ConfirmationTemplate[] = [
  { id: 'trend', label: 'Tendência de alta confirmada', description: 'Estrutura de topos e fundos ascendentes' },
  { id: 'ema-cross', label: 'EMA 9 acima da EMA 21', description: 'Cruzamento de médias altista' },
  { id: 'volume', label: 'Volume comprador acima da média', description: 'Pressão de compra sustentando o movimento' },
  { id: 'rsi', label: 'RSI saudável', description: 'Força relativa sem sobrecompra' },
  { id: 'macd', label: 'MACD cruzado para compra', description: 'Histograma positivo, momentum altista' },
  { id: 'support', label: 'Região de suporte respeitada', description: 'Preço reagiu a suporte relevante' },
];

const SELL_CONFIRMATIONS: ConfirmationTemplate[] = [
  { id: 'trend', label: 'Tendência de baixa confirmada', description: 'Estrutura de topos e fundos descendentes' },
  { id: 'ema-cross', label: 'EMA 9 abaixo da EMA 21', description: 'Cruzamento de médias baixista' },
  { id: 'volume', label: 'Volume vendedor acima da média', description: 'Pressão de venda dominando o movimento' },
  { id: 'rsi', label: 'RSI em fraqueza', description: 'Força relativa em deterioração' },
  { id: 'macd', label: 'MACD cruzado para venda', description: 'Histograma negativo, momentum baixista' },
  { id: 'resistance', label: 'Região de resistência respeitada', description: 'Preço reagiu a resistência relevante' },
];

const NEUTRAL_CONFIRMATIONS: ConfirmationTemplate[] = [
  { id: 'trend', label: 'Sem tendência definida', description: 'Mercado em consolidação lateral' },
  { id: 'ema-cross', label: 'Médias entrelaçadas', description: 'EMA 9 e EMA 21 sem cruzamento claro' },
  { id: 'volume', label: 'Volume equilibrado', description: 'Sem pressão dominante de compra ou venda' },
  { id: 'rsi', label: 'RSI em zona neutra', description: 'Sem sobrecompra ou sobrevenda' },
  { id: 'macd', label: 'MACD próximo de zero', description: 'Sem cruzamento definido' },
  { id: 'range', label: 'Preço em zona intermediária', description: 'Entre suporte e resistência' },
];

function templateFor(signal: Signal): ConfirmationTemplate[] {
  if (signal === 'BUY') return BUY_CONFIRMATIONS;
  if (signal === 'SELL') return SELL_CONFIRMATIONS;
  return NEUTRAL_CONFIRMATIONS;
}

/** Build a confirmation from a template + the matching indicator strength. */
function buildConfirmation(tpl: ConfirmationTemplate, result: AnalysisResult, rng: () => number): SignalConfirmation {
  // Map each confirmation to a relevant indicator's strength where possible.
  let strength = 50 + (rng() - 0.5) * 40;
  const indByKey = (key: string) => result.indicators.find((i) => i.key === key);
  switch (tpl.id) {
    case 'trend':
    case 'support':
    case 'resistance':
    case 'range':
      strength = result.score;
      break;
    case 'ema-cross':
      strength = (indByKey('ema9')?.strength ?? 50) * 0.5 + (indByKey('ema21')?.strength ?? 50) * 0.5;
      break;
    case 'volume':
      strength = indByKey('volume')?.strength ?? 50;
      break;
    case 'rsi':
      strength = indByKey('rsi')?.strength ?? 50;
      break;
    case 'macd':
      strength = indByKey('macd')?.strength ?? 50;
      break;
  }
  const score = Math.max(5, Math.min(100, Math.round(strength)));
  // A confirmation is "confirmed" when its score clears a threshold that
  // aligns with the direction of the signal.
  const confirmed = result.finalSignal === 'WAIT' ? score <= 55 : score >= 55;
  return { id: tpl.id, label: tpl.label, description: tpl.description, confirmed, score };
}

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildSummary(result: AnalysisResult, confirmedCount: number, total: number): string {
  const dir = result.finalSignal === 'BUY' ? 'compra' : result.finalSignal === 'SELL' ? 'venda' : 'aguardar';
  if (result.finalSignal === 'WAIT') {
    return `Os indicadores não convergem em uma direção clara. ${confirmedCount} de ${total} confirmações estão alinhadas — recomenda-se aguardar uma definição de mercado antes de operar.`;
  }
  return `O sinal de ${dir.toUpperCase()} é sustentado por ${confirmedCount} de ${total} confirmações técnicas. Score ${result.score}/100 com ${result.confidence}% de confiança.`;
}

function buildTitle(result: AnalysisResult): string {
  if (result.finalSignal === 'BUY') return 'Motivo da Compra';
  if (result.finalSignal === 'SELL') return 'Motivo da Venda';
  return 'Motivo do Aguardar';
}

/**
 * Simulated implementation of ISignalExplainer. Replace with an AI-backed
 * explainer that implements the same interface — the Intelligence screen
 * calls explain() and renders whatever it returns.
 */
export class SimulatedSignalExplainer implements ISignalExplainer {
  readonly name = 'Simulado';

  explain(result: AnalysisResult): SignalExplanation {
    const templates = templateFor(result.finalSignal);
    const rng = mulberry32(Math.floor(result.createdAt / 30000) + result.score);
    const confirmations = templates.map((tpl) => buildConfirmation(tpl, result, rng));
    const confirmedCount = confirmations.filter((c) => c.confirmed).length;
    return {
      id: `intel-${result.id}`,
      asset: result.asset,
      timeframe: result.timeframe,
      signal: result.finalSignal,
      title: buildTitle(result),
      confidence: result.confidence,
      confirmations,
      confirmedCount,
      totalCount: confirmations.length,
      summary: buildSummary(result, confirmedCount, confirmations.length),
      price: result.price,
      score: result.score,
      createdAt: result.createdAt,
    };
  }
}

let _explainer: ISignalExplainer = new SimulatedSignalExplainer();

/** Factory: swap in an AI-backed explainer here without touching the UI. */
export function getSignalExplainer(): ISignalExplainer {
  return _explainer;
}

export function setSignalExplainer(explainer: ISignalExplainer): void {
  _explainer = explainer;
}

/** Convenience helper used by the Intelligence screen. */
export function explainSignal(result: AnalysisResult): SignalExplanation {
  return getSignalExplainer().explain(result);
}

export function signalExplanationLabel(signal: Signal): string {
  return signal === 'BUY' ? 'Compra' : signal === 'SELL' ? 'Venda' : 'Aguardar';
}

export { META_BY_KEY, signalLabel };
