import type { Asset, Timeframe, Candle, Quote, IndicatorResult, AnalysisResult } from '@/types';
import { SimulatedMarketDataProvider } from './simulatedProvider';

/**
 * Market Data service interfaces.
 *
 * These describe the contract the UI depends on. Today the app uses a
 * SimulatedMarketDataProvider; in the future a real provider (broker /
 * data vendor) can implement the same interface and be swapped in via
 * setMarketDataProvider() — no UI changes required.
 */

export interface IRealtimeProvider {
  /** Current quote snapshot for an asset. */
  getQuote(asset: Asset): Promise<Quote>;
  /** Subscribe to quote updates; returns an unsubscribe function. */
  subscribeQuotes(asset: Asset, cb: (q: Quote) => void): () => void;
}

export interface ICandleProvider {
  /** Historical candles for an asset/timeframe. */
  getCandles(asset: Asset, timeframe: Timeframe, count: number): Promise<Candle[]>;
}

export interface IIndicatorProvider {
  /** Compute technical indicators for an asset/timeframe. */
  getIndicators(asset: Asset, timeframe: Timeframe): Promise<IndicatorResult[]>;
}

export interface IAnalysisProvider {
  /** Full analysis (indicators + score + signal + levels). */
  analyze(asset: Asset, timeframe: Timeframe): Promise<AnalysisResult>;
}

export interface IMarketDataProvider
  extends IRealtimeProvider,
    ICandleProvider,
    IIndicatorProvider,
    IAnalysisProvider {
  readonly name: string;
}

let _instance: IMarketDataProvider = new SimulatedMarketDataProvider();

/**
 * Factory entry point. Switch the concrete provider via
 * setMarketDataProvider() when wiring a real API. Everything else in the
 * app imports `getMarketDataProvider`, so the interface stays stable.
 */
export function getMarketDataProvider(): IMarketDataProvider {
  return _instance;
}

export function setMarketDataProvider(provider: IMarketDataProvider): void {
  _instance = provider;
}
