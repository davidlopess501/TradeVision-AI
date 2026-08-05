import type {
  Asset,
  Timeframe,
  Candle,
  Quote,
  IndicatorResult,
  AnalysisResult,
} from '@/types';

import type { IMarketDataProvider } from './types';

import {
  ASSETS,
  TIMEFRAMES,
  formatPrice,
} from '@/lib/assets';

import {
  INDICATOR_META,
  buildIndicator,
  buildRealEmaIndicators,
  buildRealRsiIndicator,
  buildRealMacdIndicator,
  finalizeAnalysis,
} from '@/lib/indicators';

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;

    let value = Math.imul(
      seed ^ (seed >>> 15),
      1 | seed,
    );

    value =
      (
        value +
        Math.imul(
          value ^ (value >>> 7),
          61 | value,
        )
      ) ^ value;

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function hashStr(value: string): number {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function uid(): string {
  return (
    Math.random().toString(36).slice(2, 10) +
    Date.now().toString(36).slice(-4)
  );
}

export class SimulatedMarketDataProvider
  implements IMarketDataProvider
{
  readonly name = 'Simulado';

  async getQuote(asset: Asset): Promise<Quote> {
    const info = ASSETS[asset];

    const rng = mulberry32(
      hashStr(
        `${asset}-quote-${Math.floor(
          Date.now() / 60000,
        )}`,
      ),
    );

    const drift =
      (rng() - 0.5) *
      info.basePrice *
      0.004;

    const price =
      info.basePrice + drift;

    const open =
      price -
      (rng() - 0.5) *
        info.basePrice *
        0.0025;

    const high =
      Math.max(price, open) +
      rng() *
        info.basePrice *
        0.0014;

    const low =
      Math.min(price, open) -
      rng() *
        info.basePrice *
        0.0014;

    const changePct =
      ((price - open) / open) * 100;

    const spread =
      info.tick *
      (1 + Math.floor(rng() * 3));

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

  subscribeQuotes(
    asset: Asset,
    callback: (quote: Quote) => void,
  ): () => void {
    let active = true;

    const update = async () => {
      if (!active) return;

      try {
        callback(
          await this.getQuote(asset),
        );
      } catch {
        // Mantém a interface funcionando caso uma atualização falhe.
      }
    };

    void update();

    const interval = window.setInterval(
      update,
      4000,
    );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }

  async getCandles(
    asset: Asset,
    timeframe: Timeframe,
    count: number,
  ): Promise<Candle[]> {
    const info = ASSETS[asset];

    const timeframeMinutes =
      TIMEFRAMES.find(
        (item) =>
          item.value === timeframe,
      )?.minutes ?? 1;

    const rng = mulberry32(
      hashStr(
        `${asset}-${timeframe}-candles`,
      ),
    );

    const now = Date.now();

    const candleDuration =
      timeframeMinutes * 60000;

    let price =
      info.basePrice *
      (0.995 + rng() * 0.01);

    const volatility =
      info.basePrice * 0.0012;

    const candles: Candle[] = [];

    for (
      let index = count - 1;
      index >= 0;
      index -= 1
    ) {
      const open = price;

      const change =
        (rng() - 0.48) *
        volatility;

      const close = Math.max(
        info.tick,
        open + change,
      );

      const high =
        Math.max(open, close) +
        rng() *
          volatility *
          0.6;

      const low =
        Math.min(open, close) -
        rng() *
          volatility *
          0.6;

      const volume = Math.round(
        500 + rng() * 4500,
      );

      candles.push({
        time:
          now -
          index *
            candleDuration,
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
    const quote =
      await this.getQuote(asset);

    const candles =
      await this.getCandles(
        asset,
        timeframe,
        120,
      );

    const seed = hashStr(
      `${asset}-${timeframe}-${Math.floor(
        Date.now() / 30000,
      )}`,
    );

    const rng = mulberry32(seed);

    const realEmaIndicators =
      buildRealEmaIndicators(
        candles,
        ASSETS[asset].decimals,
      );

    const realRsiIndicator =
      buildRealRsiIndicator(candles);

    const realMacdIndicator =
      buildRealMacdIndicator(
        candles,
        ASSETS[asset].decimals,
      );

    const realIndicators: IndicatorResult[] =
      [
        ...realEmaIndicators,
        realRsiIndicator,
        realMacdIndicator,
      ];

    return INDICATOR_META.map(
      (meta) => {
        const realIndicator =
          realIndicators.find(
            (indicator) =>
              indicator.key ===
              meta.key,
          );

        if (realIndicator) {
          return realIndicator;
        }

        return buildIndicator(
          meta.key,
          rng,
          asset,
          quote.price,
          ASSETS[asset].decimals,
        );
      },
    );
  }

  async analyze(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<AnalysisResult> {
    const quote =
      await this.getQuote(asset);

    const indicators =
      await this.getIndicators(
        asset,
        timeframe,
      );

    const analysis =
      finalizeAnalysis(
        asset,
        timeframe,
        indicators,
        quote,
        formatPrice,
      );

    return {
      ...analysis,
      id: uid(),
      createdAt: Date.now(),
    };
  }
}