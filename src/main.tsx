import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import App from './App.tsx';
import './index.css';

import {
  registerRealMarketDataProvider,
} from '@/services/bootstrapMarketData';

import {
  testSupabaseConnection,
} from './lib/testSupabase';

/*
 * Teste temporário da conexão com o Supabase.
 *
 * Neste momento ele apenas consulta os
 * últimos candles da tabela wdo_5m.
 */
void testSupabaseConnection();

/*
 * Tenta registrar o provedor real ao iniciar.
 *
 * Se ainda não houver configuração válida,
 * o aplicativo continua normalmente nos
 * modos SIMULADO e DEMO.
 */
try {
  const registered =
    registerRealMarketDataProvider();

  console.info(
    registered
      ? '[TradeVision] Provedor real registrado.'
      : '[TradeVision] Provedor real ainda não configurado.',
  );
} catch (error) {
  console.error(
    '[TradeVision] Não foi possível registrar o provedor real:',
    error,
  );
}

const rootElement =
  document.getElementById('root');

if (!rootElement) {
  throw new Error(
    'Elemento raiz do aplicativo não encontrado.',
  );
}

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>,
);