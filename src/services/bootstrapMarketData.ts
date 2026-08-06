import {
  setRealMarketDataProvider,
} from './types';

import {
  RealMarketDataProvider,
} from './realProvider';

export function registerRealMarketDataProvider():
  boolean {
  const baseUrl =
    import.meta.env
      .VITE_MARKET_API_URL?.trim();

  if (!baseUrl) {
    return false;
  }

  const token =
    import.meta.env
      .VITE_MARKET_API_TOKEN?.trim();

  const pollingValue =
    Number(
      import.meta.env
        .VITE_MARKET_QUOTE_POLLING_MS,
    );

  const quotePollingMs =
    Number.isFinite(pollingValue) &&
    pollingValue >= 1000
      ? pollingValue
      : 3000;

  setRealMarketDataProvider(
    new RealMarketDataProvider({
      baseUrl,
      token,
      quotePollingMs,
    }),
  );

  return true;
}