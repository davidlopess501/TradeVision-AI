import type {
  Asset,
  Timeframe,
  AnalysisResult,
  IndicatorResult,
  Signal,
  IndicatorKey,
  Quote,
} from '@/types';
import { ASSETS, TIMEFRAMES, timeframesToMinutes } from '@/lib/assets';

interface IndicatorMeta {
  key: IndicatorKey;
  label: string;
  abbr: string;
  description: string;
}

export const INDICATOR_META: IndicatorMeta[] = [
  { key: 'ema9', label: 'EMA 9', abbr: 'EMA9', description: 'Média exponencial curta — direção de curto prazo' },
  { key: 'ema21', label: 'EMA 21', abbr: 'EMA21', description: 'Média exponencial média — tendência intermediária' },
  { key: 'rsi', label: 'RSI', abbr: 'RSI', description: 'Índice de força relativa — sobrecompra / sobrevenda' },
  { key: 'macd', label: 'MACD', abbr: 'MACD', description: 'Convergência/divergência — momentum' },
  { key: 'volume', label: 'Volume', abbr: 'VOL', description: 'Pressão de compradores vs. vendedores' },
  { key: 'atr', label: 'ATR', abbr: 'ATR', description: 'Volatilidade média — tamanho do movimento' },
];

export const META_BY_KEY: Record<IndicatorKey, IndicatorMeta> = Object.fromEntries(
  INDICATOR_META.map((m) => [m.key, m]),
) as Record<IndicatorKey, IndicatorMeta>;

export const INDICATOR_LABELS: Record<IndicatorKey, string> = Object.fromEntries(
  INDICATOR_META.map((m) => [m.key, m.label]),
) as Record<IndicatorKey, string>;

const STRENGTH_BUY = 62;
const STRENGTH_SELL = 38;

export function signalFromStrength(strength: number): Signal {
  if (strength >= STRENGTH_BUY) return 'BUY';
  if (strength <= STRENGTH_SELL) return 'SELL';
  return 'WAIT';
}

const WEIGHTS: Record<IndicatorKey, number> = {
  ema9: 1.2,
  ema21: 1.0,
  rsi: 1.0,
  macd: 1.3,
  volume: 0.9,
  atr: 0.6,
};

const TOTAL_WEIGHT = Object.values(WEIGHTS).reduce((a, b) => a + b, 0);

export function signalLabel(s: Signal): string {
  return s === 'BUY' ? 'Compra' : s === 'SELL' ? 'Venda' : 'Neutro';
}

export function signalShort(s: Signal): string {
  return s === 'BUY' ? 'COMPRA' : s === 'SELL' ? 'VENDA' : 'AGUARDAR';
}

type Rng = () => number;

export function buildIndicator(
  key: IndicatorKey,
  rng: Rng,
  asset: Asset,
  price: number,
  decimals: number,
): IndicatorResult {
  const strength = Math.round(8 + rng() * 86); // 8..94
  const signal = signalFromStrength(strength);
  const bias = strength - 50;
  let value = '';
  let detail = '';

  switch (key) {
    case 'ema9': {
      const diff = (rng() - 0.5) * price * 0.0012;
      const ema = price - diff;
      value = ema.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      detail =
        bias > 4 ? `Preço acima da EMA9` : bias < -4 ? `Preço abaixo da EMA9` : 'Preço próximo da EMA9';
      break;
    }
    case 'ema21': {
      const diff = (rng() - 0.5) * price * 0.0022;
      const ema = price - diff;
      value = ema.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      detail =
        bias > 4 ? 'EMA9 acima da EMA21 — cruzamento altista' : bias < -4 ? 'EMA9 abaixo da EMA21 — cruzamento baixista' : 'Médias entrelaçadas';
      break;
    }
    case 'rsi': {
      const rsi = Math.round(18 + rng() * 66); // 18..84
      value = `${rsi}`;
      detail = rsi >= 70 ? 'Sobrecompra — possível reversão' : rsi <= 30 ? 'Sobrevenda — possível reversão' : 'Zona neutra';
      break;
    }
    case 'macd': {
      const macd = (rng() - 0.45) * price * 0.0009;
      value = macd.toLocaleString('pt-BR', { minimumFractionDigits: decimals + 1, maximumFractionDigits: decimals + 1 });
      detail = bias > 4 ? 'Histograma positivo — momentum altista' : bias < -4 ? 'Histograma negativo — momentum baixista' : 'Histograma próximo de zero';
      break;
    }
    case 'volume': {
      const ratio = (0.6 + rng() * 1.5).toFixed(2);
      value = `${ratio}x`;
      detail = bias > 4 ? 'Volume comprador dominante' : bias < -4 ? 'Volume vendedor dominante' : 'Volume equilibrado';
      break;
    }
    case 'atr': {
      const atr = price * (0.0008 + rng() * 0.0022);
      value = atr.toLocaleString('pt-BR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      const volPct = atr / price;
      detail = volPct > 0.002 ? 'Volatilidade elevada' : volPct > 0.0011 ? 'Volatilidade moderada' : 'Volatilidade baixa';
      break;
    }
  }

  return { key, signal, value, detail, strength };
}

export function finalizeAnalysis(
  asset: Asset,
  timeframe: Timeframe,
  indicators: IndicatorResult[],
  quote: Quote,
  priceFmt: (a: Asset, v: number) => string,
): Omit<AnalysisResult, 'id' | 'createdAt'> {
  const info = ASSETS[asset];
  let weighted = 0;
  for (const ind of indicators) {
    weighted += (ind.strength - 50) * WEIGHTS[ind.key];
  }
  const bias = weighted / TOTAL_WEIGHT; // -50..50
  const score = Math.max(0, Math.min(100, Math.round(50 + bias)));
  const confidence = Math.round(Math.min(100, 45 + Math.abs(bias) * 1.1 + (mulberryHash(score) % 12)));

  let finalSignal: Signal = 'WAIT';
  if (score >= 62) finalSignal = 'BUY';
  else if (score <= 38) finalSignal = 'SELL';

  const trend: AnalysisResult['trend'] =
    score >= 58 ? 'ALTA' : score <= 42 ? 'BAIXA' : 'LATERAL';

  const tfMin = timeframesToMinutes(timeframe);
  const stopDist = info.basePrice * 0.0009 * (tfMin / 5 + 0.6);
  const stopDistRounded = Math.max(info.tick, Math.round(stopDist / info.tick) * info.tick);
  const stop = finalSignal === 'BUY' ? quote.price - stopDistRounded : quote.price + stopDistRounded;
  const target =
    finalSignal === 'BUY' ? quote.price + stopDistRounded * 2 : quote.price - stopDistRounded * 2;
  const entry = quote.price;
  const probability = Math.round(50 + bias * 0.6);
  const aiScore = Math.round(score * 0.6 + confidence * 0.4);

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
    entry,
    stop,
    target,
    trend,
    probability,
    aiScore,
  };
}

function mulberryHash(n: number): number {
  let t = Math.imul(n ^ (n >>> 15), 1 | n);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) % 100;
}

export function scoreGrade(score: number): { label: string; tone: string } {
  if (score >= 75) return { label: 'Forte Compra', tone: 'bull' };
  if (score >= 62) return { label: 'Compra', tone: 'bull' };
  if (score >= 42) return { label: 'Neutro', tone: 'wait' };
  if (score >= 25) return { label: 'Venda', tone: 'bear' };
  return { label: 'Forte Venda', tone: 'bear' };
}

export const TIMEFRAME_OPTIONS = TIMEFRAMES;
