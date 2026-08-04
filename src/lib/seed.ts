import type { Trade, Asset } from '@/types';
import { ASSETS } from '@/lib/assets';

/**
 * Generates a deterministic set of simulated historical trades so the
 * Backtest / Histórico screens have meaningful content out of the box.
 * Replace with real persisted trades when wiring a backend.
 */
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function uid(i: number): string {
  return `seed-${i}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

export function seedTrades(): Trade[] {
  const rng = mulberry32(20240802);
  const trades: Trade[] = [];
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  for (let i = 0; i < 38; i++) {
    const asset: Asset = rng() > 0.5 ? 'WIN' : 'WDO';
    const info = ASSETS[asset];
    const direction = rng() > 0.45 ? 'BUY' : 'SELL';
    const win = rng() > 0.42; // ~58% win rate
    const stopPts = asset === 'WIN' ? 150 + Math.round(rng() * 6) * 25 : 15 + Math.round(rng() * 6) * 5;
    const targetPts = stopPts * 2;
    const points = win ? targetPts : -stopPts;
    const pointValue = info.tickValue / info.tick;
    const contracts = 1 + Math.floor(rng() * 3);
    const pnl = points * pointValue * contracts;
    const entry = info.basePrice + (rng() - 0.5) * info.basePrice * 0.002;
    const exit = direction === 'BUY' ? entry + points : entry - points;
    trades.push({
      id: uid(i),
      asset,
      direction,
      entry: Math.round(entry),
      stop: direction === 'BUY' ? entry - stopPts : entry + stopPts,
      target: direction === 'BUY' ? entry + targetPts : entry - targetPts,
      exit: Math.round(exit),
      result: win ? 'WIN' : 'LOSS',
      points,
      pnl,
      createdAt: now - Math.floor(rng() * 40) * day - Math.floor(rng() * day),
    });
  }
  return trades.sort((a, b) => b.createdAt - a.createdAt);
}
