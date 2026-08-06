import type {
  Asset,
  Timeframe,
  Candle,
  Quote,
  IndicatorResult,
  AnalysisResult,
} from '@/types';

import type {
  IMarketDataProvider,
} from './types';

import {
  ASSETS,
  formatPrice,
} from '@/lib/assets';

import {
  INDICATOR_META,
  buildIndicator,
  buildRealEmaIndicators,
  buildRealRsiIndicator,
  buildRealMacdIndicator,
  buildRealVolumeIndicator,
  buildRealAtrIndicator,
  finalizeAnalysis,
} from '@/lib/indicators';

interface RealProviderOptions {
  baseUrl: string;
  token?: string;
  quotePollingMs?: number;
}

interface ApiQuoteResponse {
  asset: Asset;
  price: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  spread: number;
  updatedAt: number;
}

interface ApiCandleResponse {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function uid(): string {
  return (
    crypto.randomUUID?.() ??
    `${Math.random().toString(36).slice(2)}-${Date.now()}`
  );
}

function assertFiniteNumber(
  value: unknown,
  fieldName: string,
): asserts value is number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value)
  ) {
    throw new Error(
      `Resposta inválida da API: campo "${fieldName}" ausente ou inválido.`,
    );
  }
}

function normalizeQuote(
  asset: Asset,
  payload: ApiQuoteResponse,
): Quote {
  assertFiniteNumber(payload.price, 'price');
  assertFiniteNumber(payload.changePct, 'changePct');
  assertFiniteNumber(payload.high, 'high');
  assertFiniteNumber(payload.low, 'low');
  assertFiniteNumber(payload.open, 'open');
  assertFiniteNumber(payload.spread, 'spread');
  assertFiniteNumber(payload.updatedAt, 'updatedAt');

  return {
    asset,
    price: payload.price,
    changePct: payload.changePct,
    high: payload.high,
    low: payload.low,
    open: payload.open,
    spread: payload.spread,
    updatedAt: payload.updatedAt,
  };
}

function normalizeCandle(
  payload: ApiCandleResponse,
): Candle {
  assertFiniteNumber(payload.time, 'time');
  assertFiniteNumber(payload.open, 'open');
  assertFiniteNumber(payload.high, 'high');
  assertFiniteNumber(payload.low, 'low');
  assertFiniteNumber(payload.close, 'close');
  assertFiniteNumber(payload.volume, 'volume');

  return {
    time: payload.time,
    open: payload.open,
    high: payload.high,
    low: payload.low,
    close: payload.close,
    volume: payload.volume,
  };
}

export class RealMarketDataProvider
  implements IMarketDataProvider
{
  readonly name = 'API de mercado real';

  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly quotePollingMs: number;

  constructor({
    baseUrl,
    token,
    quotePollingMs = 3000,
  }: RealProviderOptions) {
    const normalizedBaseUrl =
      baseUrl.trim().replace(/\/+$/, '');

    if (!normalizedBaseUrl) {
      throw new Error(
        'A URL da API real não foi configurada.',
      );
    }

    this.baseUrl = normalizedBaseUrl;
    this.token = token?.trim() || undefined;
    this.quotePollingMs = Math.max(
      1000,
      quotePollingMs,
    );
  }

  async getQuote(
    asset: Asset,
  ): Promise<Quote> {
    const payload =
      await this.request<ApiQuoteResponse>(
        `/quote?asset=${encodeURIComponent(asset)}`,
      );

    return normalizeQuote(
      asset,
      payload,
    );
  }

  subscribeQuotes(
    asset: Asset,
    callback: (quote: Quote) => void,
  ): () => void {
    let active = true;
    let running = false;

    const update = async () => {
      if (
        !active ||
        running
      ) {
        return;
      }

      running = true;

      try {
        const quote =
          await this.getQuote(asset);

        if (active) {
          callback(quote);
        }
      } catch (error) {
        console.error(
          '[RealMarketDataProvider] Falha ao atualizar cotação:',
          error,
        );
      } finally {
        running = false;
      }
    };

    void update();

    const interval =
      window.setInterval(
        () => void update(),
        this.quotePollingMs,
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
    const safeCount = Math.min(
      2000,
      Math.max(1, Math.floor(count)),
    );

    const payload =
      await this.request<ApiCandleResponse[]>(
        `/candles?asset=${encodeURIComponent(
          asset,
        )}&timeframe=${encodeURIComponent(
          timeframe,
        )}&count=${safeCount}`,
      );

    if (!Array.isArray(payload)) {
      throw new Error(
        'Resposta inválida da API: candles não são uma lista.',
      );
    }

    return payload
      .map(normalizeCandle)
      .sort(
        (first, second) =>
          first.time - second.time,
      );
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

    const decimals =
      ASSETS[asset].decimals;

    const realIndicators:
      IndicatorResult[] = [
        ...buildRealEmaIndicators(
          candles,
          decimals,
        ),
        buildRealRsiIndicator(candles),
        buildRealMacdIndicator(
          candles,
          decimals,
        ),
        buildRealVolumeIndicator(candles),
        buildRealAtrIndicator(
          candles,
          decimals,
        ),
      ];

    return INDICATOR_META.map(
      (meta) => {
        const realIndicator =
          realIndicators.find(
            (indicator) =>
              indicator.key === meta.key,
          );

        if (realIndicator) {
          return realIndicator;
        }

        /*
         * Fallback neutro para indicadores
         * ainda não calculados localmente.
         */
        return buildIndicator(
          meta.key,
          () => 0.5,
          asset,
          quote.price,
          decimals,
        );
      },
    );
  }

  async analyze(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<AnalysisResult> {
    const [quote, indicators] =
      await Promise.all([
        this.getQuote(asset),
        this.getIndicators(
          asset,
          timeframe,
        ),
      ]);

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

  async testConnection(): Promise<boolean> {
    try {
      await this.getQuote('WIN');
      return true;
    } catch {
      return false;
    }
  }

  private async request<T>(
    path: string,
  ): Promise<T> {
    const controller =
      new AbortController();

    const timeout =
      window.setTimeout(
        () => controller.abort(),
        10000,
      );

    try {
      const response = await fetch(
        `${this.baseUrl}${path}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
            ...(this.token
              ? {
                  Authorization:
                    `Bearer ${this.token}`,
                }
              : {}),
          },
          signal: controller.signal,
        },
      );

      if (!response.ok) {
        throw new Error(
          `API de mercado respondeu ${response.status} ${response.statusText}.`,
        );
      }

      return (
        await response.json()
      ) as T;
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        throw new Error(
          'Tempo limite excedido ao conectar à API de mercado.',
        );
      }

      throw error;
    } finally {
      window.clearTimeout(timeout);
    }
  }
}