import type {
  Asset,
  Quote,
} from '@/types';

import {
  getMarketDataMode,
  getMarketDataProvider,
  getMarketDataStatus,
  type MarketDataMode,
} from './types';

import {
  getProviderSymbol,
} from './symbolMapper';

export type MarketGatewaySource =
  | 'ACTIVE_PROVIDER'
  | 'FINNHUB_TEST';

export interface FinnhubTestQuote {
  provider: 'Finnhub';
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  previousClose: number;
  updatedAt: number;
}

export interface MarketGatewayStatus {
  mode: MarketDataMode;
  providerName: string;
  connected: boolean;
  realTradingEnabled: boolean;
}

export interface GatewayTestResult {
  success: boolean;
  source: MarketGatewaySource;
  message: string;
  updatedAt: number;
  quote?: Quote;
  finnhubQuote?: FinnhubTestQuote;
}

function isFiniteNumber(
  value: unknown,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value)
  );
}

function validateFinnhubQuote(
  payload: unknown,
): FinnhubTestQuote {
  if (
    typeof payload !== 'object' ||
    payload === null
  ) {
    throw new Error(
      'A Finnhub retornou uma resposta inválida.',
    );
  }

  const data =
    payload as Partial<FinnhubTestQuote>;

  if (
    data.provider !== 'Finnhub' ||
    typeof data.symbol !== 'string' ||
    !isFiniteNumber(data.price) ||
    !isFiniteNumber(data.change) ||
    !isFiniteNumber(data.changePct) ||
    !isFiniteNumber(data.high) ||
    !isFiniteNumber(data.low) ||
    !isFiniteNumber(data.open) ||
    !isFiniteNumber(
      data.previousClose,
    ) ||
    !isFiniteNumber(data.updatedAt)
  ) {
    throw new Error(
      'A cotação recebida da Finnhub está incompleta.',
    );
  }

  return {
    provider: 'Finnhub',
    symbol: data.symbol,
    price: data.price,
    change: data.change,
    changePct: data.changePct,
    high: data.high,
    low: data.low,
    open: data.open,
    previousClose:
      data.previousClose,
    updatedAt: data.updatedAt,
  };
}

export function getMarketGatewayStatus():
  MarketGatewayStatus {
  const status =
    getMarketDataStatus();

  return {
    mode: getMarketDataMode(),
    providerName:
      status.providerName,
    connected: status.connected,
    realTradingEnabled:
      status.realTradingEnabled,
  };
}

export async function getActiveQuote(
  asset: Asset,
): Promise<Quote> {
  const provider =
    getMarketDataProvider();

  return provider.getQuote(asset);
}

export async function testActiveProvider(
  asset: Asset = 'WIN',
): Promise<GatewayTestResult> {
  try {
    const provider =
      getMarketDataProvider();

    const providerSymbol =
      getProviderSymbol(
        asset,
        'SIMULATED',
      );

    const quote =
      await provider.getQuote(
        providerSymbol as Asset,
      );

    return {
      success: true,
      source: 'ACTIVE_PROVIDER',
      message:
        `Conexão concluída com ${provider.name}.`,
      updatedAt: Date.now(),
      quote,
    };
  } catch (error) {
    return {
      success: false,
      source: 'ACTIVE_PROVIDER',
      message:
        error instanceof Error
          ? error.message
          : 'Não foi possível consultar o provedor ativo.',
      updatedAt: Date.now(),
    };
  }
}

export async function testFinnhubConnection(
  symbol = 'AAPL',
): Promise<GatewayTestResult> {
  const normalizedSymbol =
    symbol.trim().toUpperCase();

  if (!normalizedSymbol) {
    return {
      success: false,
      source: 'FINNHUB_TEST',
      message:
        'Informe um símbolo válido.',
      updatedAt: Date.now(),
    };
  }

  try {
    const response = await fetch(
      `/api/quote?symbol=${encodeURIComponent(
        normalizedSymbol,
      )}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
        },
      },
    );

    const payload =
      (await response.json()) as unknown;

    if (!response.ok) {
      const errorPayload =
        payload as {
          error?: unknown;
        };

      throw new Error(
        typeof errorPayload.error ===
          'string'
          ? errorPayload.error
          : `A função respondeu com status ${response.status}.`,
      );
    }

    const quote =
      validateFinnhubQuote(payload);

    return {
      success: true,
      source: 'FINNHUB_TEST',
      message:
        `Cotação real de ${quote.symbol} recebida pela Finnhub.`,
      updatedAt: Date.now(),
      finnhubQuote: quote,
    };
  } catch (error) {
    return {
      success: false,
      source: 'FINNHUB_TEST',
      message:
        error instanceof Error
          ? error.message
          : 'Não foi possível consultar a Finnhub.',
      updatedAt: Date.now(),
    };
  }
}