import {
  setRealMarketDataProvider,
} from './types';

import {
  SupabaseMarketDataProvider,
} from './supabaseMarketProvider';

/**
 * Registra o Supabase como provedor
 * REAL de dados de mercado.
 *
 * Registrar o provedor NÃO ativa
 * automaticamente o modo REAL.
 */
export function registerRealMarketDataProvider():
  boolean {

  try {
    const provider =
      new SupabaseMarketDataProvider();

    setRealMarketDataProvider(provider);

    console.info(
      '[TradeVision] Supabase B3 registrado como provedor REAL.',
    );

    return true;
  } catch (error) {
    console.error(
      '[TradeVision] Falha ao registrar Supabase:',
      error,
    );

    return false;
  }
}