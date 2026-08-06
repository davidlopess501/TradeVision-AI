import type {
  Asset,
  Candle,
  Quote,
  Timeframe,
} from '@/types';

import type {
  B3ServerProvider,
  B3ServerStatus,
} from './b3ServerProvider';

export class HttpB3ServerProvider
  implements B3ServerProvider
{
  constructor(
    private readonly baseUrl: string,
  ) {}

  async testConnection(): Promise<B3ServerStatus> {
    return {
      connected: false,
      latency: 0,
      version: 'Aguardando servidor',
    };
  }

  async getQuote(
    _asset: Asset,
  ): Promise<Quote> {
    throw new Error(
      'Servidor B3 ainda não conectado.',
    );
  }

  async getCandles(
    _asset: Asset,
    _timeframe: Timeframe,
    _count: number,
  ): Promise<Candle[]> {
    throw new Error(
      'Servidor B3 ainda não conectado.',
    );
  }
}