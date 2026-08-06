import type { Asset } from '@/types';

export type MarketProviderId =
  | 'SIMULATED'
  | 'FINNHUB'
  | 'B3_SERVER';

interface SymbolMapping {
  appAsset: Asset;
  simulated: Asset;
  finnhubTest: string;
  b3Server: string;
}

/**
 * Mapeamento central de símbolos.
 *
 * Importante:
 * A Finnhub não fornece WIN/WDO como precisamos.
 * Por isso, os símbolos dela são apenas para testes
 * de conexão com ativos americanos.
 */
const SYMBOL_MAP: Record<
  Asset,
  SymbolMapping
> = {
  WIN: {
    appAsset: 'WIN',
    simulated: 'WIN',
    finnhubTest: 'AAPL',
    b3Server: 'WIN',
  },

  WDO: {
    appAsset: 'WDO',
    simulated: 'WDO',
    finnhubTest: 'MSFT',
    b3Server: 'WDO',
  },
};

export function getProviderSymbol(
  asset: Asset,
  provider: MarketProviderId,
): string {
  const mapping = SYMBOL_MAP[asset];

  if (provider === 'FINNHUB') {
    return mapping.finnhubTest;
  }

  if (provider === 'B3_SERVER') {
    return mapping.b3Server;
  }

  return mapping.simulated;
}

export function getSymbolMapping(
  asset: Asset,
): SymbolMapping {
  return SYMBOL_MAP[asset];
}