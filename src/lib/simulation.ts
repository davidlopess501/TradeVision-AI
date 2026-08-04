import type {
  Asset,
  Trade,
  BacktestPeriod,
  BacktestResult,
  SimOperation,
  SimSession,
  DayResult,
  MarketQuality,
  ProPanelData,
} from '@/types';
import { ASSETS } from '@/lib/assets';

// ----- Deterministic PRNG -----

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

const DAY = 24 * 60 * 60 * 1000;
const TRADING_HOURS = 8;

export function periodToDays(period: BacktestPeriod): number {
  switch (period) {
    case '30d': return 30;
    case '90d': return 90;
    case '1y': return 252; // trading days
    case 'custom': return 60;
  }
}

export const PERIOD_LABELS: Record<BacktestPeriod, string> = {
  '30d': 'Últimos 30 dias',
  '90d': 'Últimos 90 dias',
  '1y': 'Último ano',
  custom: 'Personalizado',
};

interface GenOptions {
  asset: Asset;
  days: number;
  seed: number;
  tradesPerDay?: number;
}

function genTrades({ asset, days, seed, tradesPerDay }: GenOptions): Trade[] {
  const info = ASSETS[asset];
  const rng = mulberry32(seed);
  const now = Date.now();
  const tpd = tradesPerDay ?? 1 + Math.floor(rng() * 3);
  const trades: Trade[] = [];

  for (let d = 0; d < days; d++) {
    const dayBase = now - (days - d) * DAY;
    const count = tpd;
    for (let i = 0; i < count; i++) {
      const direction: 'BUY' | 'SELL' = rng() > 0.45 ? 'BUY' : 'SELL';
      const win = rng() > 0.40; // ~60% win rate
      const stopPts = asset === 'WIN' ? 100 + Math.round(rng() * 6) * 25 : 10 + Math.round(rng() * 6) * 5;
      const targetPts = stopPts * 2;
      const points = win ? targetPts : -stopPts;
      const pointValue = info.tickValue / info.tick;
      const contracts = 1 + Math.floor(rng() * 3);
      const pnl = points * pointValue * contracts;
      const entry = info.basePrice + (rng() - 0.5) * info.basePrice * 0.003;
      const exit = direction === 'BUY' ? entry + points : entry - points;
      const hour = 9 + Math.floor(rng() * TRADING_HOURS);
      const min = Math.floor(rng() * 60);
      const createdAt = dayBase + hour * 3_600_000 + min * 60_000;
      trades.push({
        id: `bt-${d}-${i}-${seed.toString(36)}`,
        asset,
        direction,
        entry: Math.round(entry),
        stop: direction === 'BUY' ? Math.round(entry - stopPts) : Math.round(entry + stopPts),
        target: direction === 'BUY' ? Math.round(entry + targetPts) : Math.round(entry - targetPts),
        exit: Math.round(exit),
        result: win ? 'WIN' : 'LOSS',
        points,
        pnl,
        createdAt,
      });
    }
  }
  return trades.sort((a, b) => a.createdAt - b.createdAt);
}

function computeEquity(trades: Trade[], startCapital = 0): { x: number; y: number }[] {
  let cum = startCapital;
  const pts = [{ x: trades[0]?.createdAt ?? Date.now(), y: startCapital }];
  for (const t of trades) {
    cum += t.pnl;
    pts.push({ x: t.createdAt, y: cum });
  }
  return pts;
}

/** Runs a full backtest for an asset/period and returns the result + equity curve. */
export function runBacktest(asset: Asset, period: BacktestPeriod, seed?: number): BacktestResult {
  const days = periodToDays(period);
  const s = seed ?? hashStr(`${asset}-${period}-${Math.floor(Date.now() / 60000)}`);
  const trades = genTrades({ asset, days, seed: s });
  return summarizeBacktest(asset, period, trades);
}

export function summarizeBacktest(asset: Asset, period: BacktestPeriod, trades: Trade[]): BacktestResult {
  const total = trades.length;
  const wins = trades.filter((t) => t.result === 'WIN').length;
  const losses = trades.filter((t) => t.result === 'LOSS').length;
  const winRate = total ? (wins / total) * 100 : 0;

  let cumulative = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let grossWin = 0;
  let grossLoss = 0;

  for (const t of trades) {
    cumulative += t.pnl;
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (t.result === 'WIN') grossWin += t.pnl;
    else if (t.result === 'LOSS') grossLoss += Math.abs(t.pnl);
  }

  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0;
  const expectancy = total ? cumulative / total : 0;
  const returnOnRisk = maxDrawdown > 0 ? (cumulative / maxDrawdown) * 100 : 0;
  const equityCurve = computeEquity(trades);

  return {
    asset,
    period,
    totalTrades: total,
    wins,
    losses,
    winRate,
    netProfit: cumulative,
    maxDrawdown,
    profitFactor,
    expectancy,
    returnOnRisk,
    equityCurve,
    trades,
    startedAt: Date.now(),
  };
}

// ----- Modo Simulação (live) -----

const CLOSE_REASONS_WIN = ['Alvo atingido', 'Movimento completo', 'Take profit', 'Sinal de reversão'];
const CLOSE_REASONS_LOSS = ['Stop acionado', 'Reversão de mercado', 'Tempo expirado', 'Volatilidade contra'];
const CLOSE_REASONS_BE = ['Break-even acionado', 'Pivot neutro'];

function pickReason(result: 'WIN' | 'LOSS' | 'BE', rng: () => number): string {
  const arr = result === 'WIN' ? CLOSE_REASONS_WIN : result === 'LOSS' ? CLOSE_REASONS_LOSS : CLOSE_REASONS_BE;
  return arr[Math.floor(rng() * arr.length)];
}

/** Generates a single simulated operation for the live simulation mode. */
export function genSimOperation(asset: Asset, dayIndex: number, opIndex: number, daySeed: number): SimOperation {
  const info = ASSETS[asset];
  const rng = mulberry32(daySeed + opIndex * 1013);
  const direction: 'BUY' | 'SELL' = rng() > 0.45 ? 'BUY' : 'SELL';
  const win = rng() > 0.40;
  const result: SimOperation['result'] = win ? 'WIN' : 'LOSS';
  const stopPts = asset === 'WIN' ? 100 + Math.round(rng() * 6) * 25 : 10 + Math.round(rng() * 6) * 5;
  const targetPts = stopPts * 2;
  const points = result === 'WIN' ? targetPts : -stopPts;
  const pointValue = info.tickValue / info.tick;
  const contracts = 1 + Math.floor(rng() * 2);
  const pnl = points * pointValue * contracts;
  const entry = info.basePrice + (rng() - 0.5) * info.basePrice * 0.003;
  const exit = direction === 'BUY' ? entry + points : entry - points;
  const hour = 9 + Math.floor(rng() * TRADING_HOURS);
  const min = Math.floor(rng() * 60);
  const openTime = Date.now() - (dayIndex * DAY) + hour * 3_600_000 + min * 60_000;
  const durationMin = 2 + Math.floor(rng() * 28);
  const closeTime = openTime + durationMin * 60_000;
  return {
    id: `sim-${dayIndex}-${opIndex}`,
    asset,
    direction,
    entry: Math.round(entry),
    stop: direction === 'BUY' ? Math.round(entry - stopPts) : Math.round(entry + stopPts),
    target: direction === 'BUY' ? Math.round(entry + targetPts) : Math.round(entry - targetPts),
    exit: Math.round(exit),
    result,
    pnl,
    points,
    openTime,
    closeTime,
    durationMin,
    closeReason: pickReason(result, rng),
  };
}

/** Generates a full simulation session across N days. */
export function genSimSession(asset: Asset, days: number): SimSession {
  const ops: SimOperation[] = [];
  let wins = 0;
  let losses = 0;
  let totalPnl = 0;
  for (let d = 0; d < days; d++) {
    const daySeed = hashStr(`sim-${asset}-${d}`);
    const count = 1 + (mulberry32(daySeed)() * 3 | 0);
    for (let i = 0; i < count; i++) {
      const op = genSimOperation(asset, d, i, daySeed);
      ops.push(op);
      if (op.result === 'WIN') wins++;
      else if (op.result === 'LOSS') losses++;
      totalPnl += op.pnl;
    }
  }
  ops.sort((a, b) => b.openTime - a.openTime);
  return { operations: ops, daysSimulated: days, totalPnl, wins, losses };
}

// ----- Painel Profissional -----

export function classifyMarket(score: number): { quality: MarketQuality; label: string; tone: 'bull' | 'accent' | 'wait' | 'gold' | 'bear' } {
  if (score >= 80) return { quality: 'EXCELLENT', label: 'Mercado Excelente', tone: 'bull' };
  if (score >= 60) return { quality: 'GOOD', label: 'Mercado Bom', tone: 'accent' };
  if (score >= 40) return { quality: 'NEUTRAL', label: 'Mercado Neutro', tone: 'wait' };
  if (score >= 20) return { quality: 'RISKY', label: 'Mercado Arriscado', tone: 'gold' };
  return { quality: 'VERY_RISKY', label: 'Mercado Muito Arriscado', tone: 'bear' };
}

export const MARKET_BANDS = [
  { quality: 'EXCELLENT' as MarketQuality, label: 'Excelente', range: '80–100', tone: 'bull' as const, min: 80 },
  { quality: 'GOOD' as MarketQuality, label: 'Bom', range: '60–79', tone: 'accent' as const, min: 60 },
  { quality: 'NEUTRAL' as MarketQuality, label: 'Neutro', range: '40–59', tone: 'wait' as const, min: 40 },
  { quality: 'RISKY' as MarketQuality, label: 'Arriscado', range: '20–39', tone: 'gold' as const, min: 20 },
  { quality: 'VERY_RISKY' as MarketQuality, label: 'Muito Arriscado', range: '0–19', tone: 'bear' as const, min: 0 },
];

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Builds calendar day results from trades (last N days). */
export function buildCalendar(trades: Trade[], days: number): DayResult[] {
  const now = startOfDay(Date.now());
  const map = new Map<number, DayResult>();
  for (let i = 0; i < days; i++) {
    const date = now - (days - 1 - i) * DAY;
    map.set(date, { date, pnl: 0, trades: 0, win: false });
  }
  for (const t of trades) {
    const date = startOfDay(t.createdAt);
    const entry = map.get(date);
    if (entry) {
      entry.pnl += t.pnl;
      entry.trades += 1;
    }
  }
  for (const entry of map.values()) {
    entry.win = entry.pnl >= 0;
  }
  return [...map.values()];
}

function buildAISummary(data: { dayPnl: number; winRate: number; totalTrades: number; marketQuality: { label: string } }): string {
  const profit = data.dayPnl >= 0;
  const winWord = data.winRate >= 60 ? 'boa taxa de acerto' : data.winRate >= 45 ? 'taxa de acerto moderada' : 'taxa de acerto baixa';
  const trend = profit ? 'positivo' : 'negativo';
  return `O desempenho do dia foi ${trend}, com ${data.totalTrades} operações e ${winWord} (${data.winRate.toFixed(0)}%). A qualidade atual do mercado é classificada como "${data.marketQuality.label}". ${profit ? 'A IA recomenda manter a disciplina e a gestão de risco atual.' : 'A IA recomenda reduzir o tamanho das posições e aguardar setups de maior probabilidade.'}`;
}

/** Generates the full pro-panel dataset from simulated trades. */
export function buildProPanel(seed?: number): ProPanelData {
  const s = seed ?? hashStr(`propanel-${Math.floor(Date.now() / 60000)}`);
  const rng = mulberry32(s);
  const asset: Asset = rng() > 0.5 ? 'WIN' : 'WDO';
  const trades = genTrades({ asset, days: 30, seed: s, tradesPerDay: 2 + Math.floor(rng() * 2) });

  const total = trades.length;
  const wins = trades.filter((t) => t.result === 'WIN').length;
  const winRate = total ? (wins / total) * 100 : 0;

  const today = startOfDay(Date.now());
  const dayPnl = trades.filter((t) => startOfDay(t.createdAt) === today).reduce((a, b) => a + b.pnl, 0);
  const weekPnl = trades.filter((t) => Date.now() - t.createdAt <= 7 * DAY).reduce((a, b) => a + b.pnl, 0);
  const monthPnl = trades.filter((t) => Date.now() - t.createdAt <= 30 * DAY).reduce((a, b) => a + b.pnl, 0);

  let cumulative = 10000;
  let peak = 10000;
  let maxDrawdown = 0;
  let grossWin = 0;
  let grossLoss = 0;
  const equityCurve = [{ x: trades[0]?.createdAt ?? Date.now(), y: 10000 }];
  for (const t of trades) {
    cumulative += t.pnl;
    equityCurve.push({ x: t.createdAt, y: cumulative });
    if (cumulative > peak) peak = cumulative;
    const dd = peak - cumulative;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (t.result === 'WIN') grossWin += t.pnl;
    else if (t.result === 'LOSS') grossLoss += Math.abs(t.pnl);
  }
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : 99;

  // Weekly curve (cumulative pnl per day, last 7 days)
  const cal30 = buildCalendar(trades, 30);
  const weeklyCurve = cal30.slice(-7).map((d, i) => ({
    x: d.date,
    y: cal30.slice(-7).slice(0, i + 1).reduce((a, b) => a + b.pnl, 0),
  }));

  const marketQualityScore = Math.round(30 + rng() * 65);
  const mk = classifyMarket(marketQualityScore);

  const calendar = buildCalendar(trades, 35);

  return {
    capital: cumulative,
    dayPnl,
    weekPnl,
    monthPnl,
    totalTrades: total,
    winRate,
    profitFactor,
    maxDrawdown,
    marketQualityScore,
    marketQuality: mk.quality,
    calendar,
    equityCurve,
    weeklyCurve,
    aiSummary: buildAISummary({ dayPnl, winRate, totalTrades: total, marketQuality: mk }),
  };
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min}min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h${m}min` : `${h}h`;
}
