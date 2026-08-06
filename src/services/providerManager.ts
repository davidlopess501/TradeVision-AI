import type {
  IMarketDataProvider,
} from './types';

import {
  getMarketDataProvider,
  getMarketDataMode,
  hasRealMarketDataProvider,
  type MarketDataMode,
} from './types';

export interface ProviderManagerStatus {
  mode: MarketDataMode;
  providerName: string;
  realProviderAvailable: boolean;
}

export function getProviderManagerStatus():
  ProviderManagerStatus {
  const provider =
    getMarketDataProvider();

  return {
    mode: getMarketDataMode(),
    providerName: provider.name,
    realProviderAvailable:
      hasRealMarketDataProvider(),
  };
}

export function getActiveMarketProvider():
  IMarketDataProvider {
  return getMarketDataProvider();
}