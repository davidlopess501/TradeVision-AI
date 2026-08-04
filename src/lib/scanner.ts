import type { Asset, ScanResult, ScanFilter, Signal } from '@/types';
import { ASSETS } from '@/lib/assets';
import { signalFromStrength } from '@/lib/indicators';

/**
 * Scanner Inteligente
 *
 * Monitors WIN and WDO simultaneously, producing a ScanResult per asset
 * with price, trend, trend strength, volume, score, signal, and last
 * update time. Supports filtering and ranking by score.
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

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export const SCAN_ASSETS: Asset[] = ['WIN', 'WDO'];

/** Scans a single asset and returns its ScanResult. */
export function scanAsset(asset: Asset, seed?: number): ScanResult {
  const info = ASSETS[asset];
  const s = seed ?? Math.floor(Date.now() / 5000);
  const rng = mulberry32(hashStr(`${asset}-${s}`));

  const bias = rng() - 0.5; // -0.5..0.5
  const price = info.basePrice + bias * info.basePrice * 0.004 + (rng() - 0.5) * info.basePrice * 0.001;
  const changePct = (bias * 2 + (rng() - 0.5)) * 1.5;

  const trendStrength = Math.max(8, Math.min(96, Math.round(40 + rng() * 50 + Math.abs(bias) * 20)));
  const trend: ScanResult['trend'] =
    trendStrength >= 60 && bias > 0 ? 'ALTA' : trendStrength >= 60 && bias < 0 ? 'BAIXA' : 'LATERAL';

  const volume = Math.round(50000 + rng() * 250000);
  const volumeRatio = +(0.6 + rng() * 1.6).toFixed(2);

  const score = Math.max(0, Math.min(100, Math.round(30 + rng() * 60 + Math.abs(bias) * 15)));
  const signal: Signal = signalFromStrength(score);

  return {
    asset,
    name: info.name,
    price: Math.round(price),
    changePct: +changePct.toFixed(2),
    trend,
    trendStrength,
    volume,
    volumeRatio,
    score,
    signal,
    updatedAt: Date.now(),
  };
}

/** Scans all monitored assets at once. */
export function scanAll(seed?: number): ScanResult[] {
  return SCAN_ASSETS.map((a) => scanAsset(a, seed));
}

/** Ranks scan results by score descending. */
export function rankByScore(results: ScanResult[]): ScanResult[] {
  return [...results].sort((a, b) => b.score - a.score);
}

/** Filters scan results by the chosen filter. */
export function filterScans(results: ScanResult[], filter: ScanFilter): ScanResult[] {
  switch (filter) {
    case 'STRONG':
      return results.filter((r) => r.score >= 70);
    case 'BUY':
      return results.filter((r) => r.signal === 'BUY');
    case 'SELL':
      return results.filter((r) => r.signal === 'SELL');
    default:
      return results;
  }
}

export const FILTER_LABELS: Record<ScanFilter, string> = {
  ALL: 'Todos',
  STRONG: 'Oportunidades fortes',
  BUY: 'Apenas compra',
  SELL: 'Apenas venda',
};

export function trendLabel(t: ScanResult['trend']): string {
  return t === 'ALTA' ? 'Alta' : t === 'BAIXA' ? 'Baixa' : 'Lateral';
}

export function signalShortLabel(s: Signal): string {
  return s === 'BUY' ? 'COMPRA' : s === 'SELL' ? 'VENDA' : 'AGUARDAR';
}
