import type {
  Asset,
  Timeframe,
  Candle,
  Quote,
  IndicatorResult,
  AnalysisResult,
} from '@/types';
import type { IMarketDataProvider } from './types';
import { ASSETS, TIMEFRAMES, formatPrice } from '@/lib/assets';
import {
  INDICATOR_META,
  buildIndicator,
  buildRealEmaIndicators,
  finalizeAnalysis,
} from '@/lib/indicators';

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

function uid(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  );
}

export class SimulatedMarketDataProvider implements IMarketDataProvider {
  readonly name = 'Simulado';

  async getQuote(asset: Asset): Promise<Quote> {
    const info = ASSETS[asset];
    const rng = mulberry32(
      hashStr(`${asset}-quote-${Math.floor(Date.now() / 60000)}`),
    );

    const drift = (rng() - 0.5) * info.basePrice * 0.004;
    const price = info.basePrice + drift;
    const open = price - (rng() - 0.5) * info.basePrice * 0.0025;
    const high = Math.max(price, open) + rng() * info.basePrice * 0.0014;
    const low = Math.min(price, open) - rng() * info.basePrice * 0.0014;
    const changePct = ((price - open) / open) * 100;
    const spread = info.tick * (1 + Math.floor(rng() * 3));

    return {
      asset,
      price,
      changePct,
      high,
      low,
      open,
      spread,
      updatedAt: Date.now(),
    };
  }

  subscribeQuotes(asset: Asset, cb: (q: Quote) => void): () => void {
    let alive = true;

    const tick = async () => {
      if (!alive) return;

      try {
        cb(await this.getQuote(asset));
      } catch {}
    };

    void tick();

    const handle = window.setInterval(tick, 4000);

    return () => {
      alive = false;
      window.clearInterval(handle);
    };
  }

  async getCandles(
    asset: Asset,
    timeframe: Timeframe,
    count: number,
  ): Promise<Candle[]> {
    const info = ASSETS[asset];
    const tfMin =
      TIMEFRAMES.find((t) => t.value === timeframe)?.minutes ?? 1;

    const rng = mulberry32(hashStr(`${asset}-${timeframe}-candles`));

    const now = Date.now();
    const step = tfMin * 60000;

    let price = info.basePrice * (0.995 + rng() * 0.01);

    const vol = info.basePrice * 0.0012;

    const candles: Candle[] = [];

    for (let i = count - 1; i >= 0; i--) {
      const open = price;
      const change = (rng() - 0.48) * vol;
      const close = Math.max(info.tick, open + change);
      const high = Math.max(open, close) + rng() * vol * 0.6;
      const low = Math.min(open, close) - rng() * vol * 0.6;
      const volume = Math.round(500 + rng() * 4500);

      candles.push({
        time: now - i * step,
        open,
        high,
        low,
        close,
        volume,
      });

      price = close;
    }

    return candles;
  }

  async getIndicators(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<IndicatorResult[]> {
    const quote = await this.getQuote(asset);
    const candles = await this.getCandles(asset, timeframe, 120);

    const seed = hashStr(
      `${asset}-${timeframe}-${Math.floor(Date.now() / 30000)}`,
    );

    const rng = mulberry32(seed);

    const realIndicators = buildRealEmaIndicators(
      candles,
      ASSETS[asset].decimals,
    );

    return INDICATOR_META.map((meta) => {
      const real = realIndicators.find((i) => i.key === meta.key);

      if (real) {
        return real;
      }

      return buildIndicator(
        meta.key,
        rng,
        asset,
        quote.price,
        ASSETS[asset].decimals,
      );
    });
  }

  async analyze(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<AnalysisResult> {
    const quote = await this.getQuote(asset);
    const indicators = await this.getIndicators(asset, timeframe);

    const base = finalizeAnalysis(
      asset,
      timeframe,
      indicators,
      quote,
      formatPrice,
    );

    return {
      ...base,
      id: uid(),
      createdAt: Date.now(),
    };
  }
}