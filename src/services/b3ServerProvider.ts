import type {
  Asset,
  Quote,
  Candle,
  Timeframe,
} from '@/types';

export interface B3ServerStatus {
  connected: boolean;
  latency: number;
  version?: string;
}

export interface B3ServerProvider {
  testConnection(): Promise<B3ServerStatus>;

  getQuote(
    asset: Asset,
  ): Promise<Quote>;

  getCandles(
    asset: Asset,
    timeframe: Timeframe,
    count: number,
  ): Promise<Candle[]>;
}