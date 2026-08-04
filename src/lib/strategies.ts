import type { Strategy, StrategyKey, StrategyTestResult, Asset, Trade } from '@/types';
import { ASSETS } from '@/lib/assets';

export const STRATEGIES: Strategy[] = [
  {
    key: 'scalper',
    name: 'Scalper Pro',
    description: 'Operações rápidas de segundos a minutos, capturando pequenos movimentos com alta frequência. Exige disciplina e execução precisa.',
    riskLevel: 'ALTO',
    bestTime: '09:00 – 10:30',
    bestTimeframe: '1m',
    bestAsset: 'WIN',
    winRate: 64,
    profitFactor: 1.45,
    totalTrades: 312,
    icon: 'zap',
  },
  {
    key: 'trend',
    name: 'Tendência Inteligente',
    description: 'Segue a direção dominante do mercado usando médias móveis e confirmação de momentum. Opera a favor da tendência principal.',
    riskLevel: 'MÉDIO',
    bestTime: '10:00 – 12:00',
    bestTimeframe: '5m',
    bestAsset: 'WIN',
    winRate: 58,
    profitFactor: 1.82,
    totalTrades: 187,
    icon: 'trending',
  },
  {
    key: 'breakout',
    name: 'Rompimento',
    description: 'Identifica rompimentos de suportes e resistências com volume. Entra na direção do rompimento confirmado.',
    riskLevel: 'MÉDIO',
    bestTime: '09:30 – 11:00',
    bestTimeframe: '15m',
    bestAsset: 'WDO',
    winRate: 52,
    profitFactor: 2.10,
    totalTrades: 142,
    icon: 'breakout',
  },
  {
    key: 'pullback',
    name: 'Pullback',
    description: 'Aguarda correções dentro de uma tendência para entrar a favor da direção principal. Busca melhor relação risco x retorno.',
    riskLevel: 'BAIXO',
    bestTime: '10:30 – 12:30',
    bestTimeframe: '5m',
    bestAsset: 'WIN',
    winRate: 61,
    profitFactor: 1.65,
    totalTrades: 168,
    icon: 'pullback',
  },
  {
    key: 'reversal',
    name: 'Reversão',
    description: 'Detecta pontos de reversão usando divergências, sobrecompra/sobrevenda e níveis-chave. Alta recompensa potencial.',
    riskLevel: 'ALTO',
    bestTime: '11:00 – 13:00',
    bestTimeframe: '15m',
    bestAsset: 'WDO',
    winRate: 47,
    profitFactor: 2.35,
    totalTrades: 98,
    icon: 'reversal',
  },
];

export const STRATEGY_BY_KEY: Record<StrategyKey, Strategy> = Object.fromEntries(
  STRATEGIES.map((s) => [s.key, s]),
) as Record<StrategyKey, Strategy>;

export const RISK_TONE: Record<string, { text: string; bg: string; dot: string }> = {
  BAIXO: { text: 'text-bull-400', bg: 'bg-bull-500/10', dot: 'bg-bull-500' },
  MÉDIO: { text: 'text-gold-400', bg: 'bg-gold-500/10', dot: 'bg-gold-500' },
  ALTO: { text: 'text-bear-400', bg: 'bg-bear-500/10', dot: 'bg-bear-500' },
};

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

export function testStrategy(strategy: StrategyKey, asset: Asset): StrategyTestResult {
  const strat = STRATEGY_BY_KEY[strategy];
  const info = ASSETS[asset];
  const rng = mulberry32(hashStr(`${strategy}-${asset}-${Math.floor(Date.now() / 60000)}`));
  const tradeCount = 40 + Math.floor(rng() * 30);
  const trades: Trade[] = [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (let i = 0; i < tradeCount; i++) {
    const win = rng() < strat.winRate / 100;
    const direction: 'BUY' | 'SELL' = rng() > 0.5 ? 'BUY' : 'SELL';
    const stopPts = asset === 'WIN' ? 100 + Math.round(rng() * 4) * 25 : 10 + Math.round(rng() * 4) * 5;
    const targetPts = Math.round(stopPts * strat.profitFactor);
    const points = win ? targetPts : -stopPts;
    const pointValue = info.tickValue / info.tick;
    const contracts = 1 + Math.floor(rng() * 2);
    const pnl = points * pointValue * contracts;
    const entry = info.basePrice + (rng() - 0.5) * info.basePrice * 0.003;
    trades.push({
      id: `stest-${i}`,
      asset,
      direction,
      entry: Math.round(entry),
      stop: direction === 'BUY' ? Math.round(entry - stopPts) : Math.round(entry + stopPts),
      target: direction === 'BUY' ? Math.round(entry + targetPts) : Math.round(entry - targetPts),
      exit: Math.round(direction === 'BUY' ? entry + points : entry - points),
      result: win ? 'WIN' : 'LOSS',
      points,
      pnl,
      createdAt: now - Math.floor(rng() * 30) * day,
    });
  }

  trades.sort((a, b) => a.createdAt - b.createdAt);
  const wins = trades.filter((t) => t.result === 'WIN').length;
  const losses = trades.filter((t) => t.result === 'LOSS').length;
  const winRate = (wins / trades.length) * 100;

  let cumulative = 0, peak = 0, maxDrawdown = 0, grossWin = 0, grossLoss = 0;
  const equityCurve = [{ x: trades[0]?.createdAt ?? now, y: 0 }];
  for (const t of trades) {
    cumulative += t.pnl;
    equityCurve.push({ x: t.createdAt, y: cumulative });
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (t.result === 'WIN') grossWin += t.pnl;
    else grossLoss += Math.abs(t.pnl);
  }
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 99;

  return { strategy, asset, trades: trades.length, wins, losses, winRate, netProfit: cumulative, maxDrawdown, profitFactor, equityCurve };
}

export function compareStrategies(asset: Asset): StrategyTestResult[] {
  return STRATEGIES.map((s) => testStrategy(s.key, asset));
}

export function bestStrategy(results: StrategyTestResult[]): StrategyTestResult | null {
  if (results.length === 0) return null;
  return results.reduce((best, cur) => (cur.netProfit > best.netProfit ? cur : best));
}
