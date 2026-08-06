import type {
  Asset,
  Timeframe,
  Candle,
  Quote,
  IndicatorResult,
  AnalysisResult,
} from '@/types';

import {
  SimulatedMarketDataProvider,
} from './simulatedProvider';

/**
 * Modos disponíveis para o TradeVision.
 *
 * SIMULATED:
 * Dados totalmente simulados para desenvolvimento.
 *
 * DEMO:
 * Dados e operações simuladas para treinamento.
 *
 * REAL:
 * Dados reais e, futuramente, integração com corretora.
 */
export type MarketDataMode =
  | 'SIMULATED'
  | 'DEMO'
  | 'REAL';

export interface MarketDataStatus {
  mode: MarketDataMode;
  providerName: string;
  connected: boolean;
  realTradingEnabled: boolean;
  description: string;
}

/**
 * Interface para cotações em tempo real.
 */
export interface IRealtimeProvider {
  /**
   * Obtém a cotação atual do ativo.
   */
  getQuote(
    asset: Asset,
  ): Promise<Quote>;

  /**
   * Escuta atualizações de cotação.
   *
   * Retorna uma função para cancelar
   * a assinatura.
   */
  subscribeQuotes(
    asset: Asset,
    callback: (quote: Quote) => void,
  ): () => void;
}

/**
 * Interface para candles históricos.
 */
export interface ICandleProvider {
  getCandles(
    asset: Asset,
    timeframe: Timeframe,
    count: number,
  ): Promise<Candle[]>;
}

/**
 * Interface para indicadores técnicos.
 */
export interface IIndicatorProvider {
  getIndicators(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<IndicatorResult[]>;
}

/**
 * Interface para análise completa.
 */
export interface IAnalysisProvider {
  analyze(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<AnalysisResult>;
}

/**
 * Contrato completo do provedor
 * de dados de mercado.
 */
export interface IMarketDataProvider
  extends IRealtimeProvider,
    ICandleProvider,
    IIndicatorProvider,
    IAnalysisProvider {
  readonly name: string;
}

/**
 * Chave usada para manter o modo salvo
 * no navegador.
 */
const STORAGE_KEY =
  'tradevision-market-data-mode';

/**
 * Provedor simulado padrão.
 */
const simulatedProvider:
  IMarketDataProvider =
    new SimulatedMarketDataProvider();

/**
 * O modo DEMO usa inicialmente o mesmo
 * provedor simulado.
 *
 * Mais adiante poderá usar candles reais,
 * mas continuará bloqueando ordens reais.
 */
const demoProvider:
  IMarketDataProvider =
    new SimulatedMarketDataProvider();

/**
 * Provedor real.
 *
 * Permanece nulo até conectarmos uma API,
 * ProfitDLL, MetaTrader ou outro serviço.
 */
let realProvider:
  IMarketDataProvider | null = null;

/**
 * Modo atual do aplicativo.
 */
let currentMode: MarketDataMode =
  loadSavedMode();

/**
 * Carrega o modo salvo no navegador.
 *
 * Em ambientes sem window, retorna
 * SIMULATED com segurança.
 */
function loadSavedMode(): MarketDataMode {
  if (
    typeof window === 'undefined'
  ) {
    return 'SIMULATED';
  }

  const savedMode =
    window.localStorage.getItem(
      STORAGE_KEY,
    );

  if (
    savedMode === 'SIMULATED' ||
    savedMode === 'DEMO' ||
    savedMode === 'REAL'
  ) {
    /**
     * Nunca inicia automaticamente
     * em modo REAL.
     *
     * Isso evita conexão ou operação
     * real acidental após recarregar.
     */
    if (savedMode === 'REAL') {
      return 'DEMO';
    }

    return savedMode;
  }

  return 'SIMULATED';
}

/**
 * Salva o modo selecionado.
 */
function saveMode(
  mode: MarketDataMode,
): void {
  if (
    typeof window === 'undefined'
  ) {
    return;
  }

  window.localStorage.setItem(
    STORAGE_KEY,
    mode,
  );
}

/**
 * Retorna o modo atual.
 */
export function getMarketDataMode():
  MarketDataMode {
  return currentMode;
}

/**
 * Altera o modo do TradeVision.
 *
 * O modo REAL só pode ser selecionado
 * quando um provedor real estiver
 * registrado.
 */
export function setMarketDataMode(
  mode: MarketDataMode,
): void {
  if (
    mode === 'REAL' &&
    !realProvider
  ) {
    throw new Error(
      'Modo REAL indisponível. Configure um provedor de dados reais antes de ativá-lo.',
    );
  }

  currentMode = mode;
  saveMode(mode);
}

/**
 * Retorna o provedor correspondente
 * ao modo atual.
 */
export function getMarketDataProvider():
  IMarketDataProvider {
  if (
    currentMode === 'REAL'
  ) {
    if (!realProvider) {
      throw new Error(
        'Nenhum provedor de dados reais foi configurado.',
      );
    }

    return realProvider;
  }

  if (
    currentMode === 'DEMO'
  ) {
    return demoProvider;
  }

  return simulatedProvider;
}

/**
 * Registra um provedor real.
 *
 * Registrar não ativa automaticamente
 * o modo REAL.
 */
export function setRealMarketDataProvider(
  provider: IMarketDataProvider,
): void {
  realProvider = provider;
}

/**
 * Remove o provedor real e retorna
 * o aplicativo ao modo DEMO.
 */
export function clearRealMarketDataProvider():
  void {
  realProvider = null;

  if (
    currentMode === 'REAL'
  ) {
    currentMode = 'DEMO';
    saveMode('DEMO');
  }
}

/**
 * Mantém compatibilidade com o código
 * antigo que usava setMarketDataProvider.
 *
 * Agora essa função registra o provedor
 * como provedor REAL, mas não ativa
 * o modo automaticamente.
 */
export function setMarketDataProvider(
  provider: IMarketDataProvider,
): void {
  setRealMarketDataProvider(
    provider,
  );
}

/**
 * Informa se um provedor real já
 * foi configurado.
 */
export function hasRealMarketDataProvider():
  boolean {
  return realProvider !== null;
}

/**
 * Retorna informações para exibir
 * no cabeçalho, configurações ou painel.
 */
export function getMarketDataStatus():
  MarketDataStatus {
  if (
    currentMode === 'REAL'
  ) {
    return {
      mode: 'REAL',
      providerName:
        realProvider?.name ??
        'Não configurado',
      connected:
        realProvider !== null,
      realTradingEnabled:
        realProvider !== null,
      description:
        'Dados reais de mercado. Operações reais exigem confirmação e integração com corretora.',
    };
  }

  if (
    currentMode === 'DEMO'
  ) {
    return {
      mode: 'DEMO',
      providerName:
        demoProvider.name,
      connected: true,
      realTradingEnabled: false,
      description:
        'Modo de treinamento. Nenhuma ordem real pode ser enviada.',
    };
  }

  return {
    mode: 'SIMULATED',
    providerName:
      simulatedProvider.name,
    connected: true,
    realTradingEnabled: false,
    description:
      'Dados simulados para desenvolvimento e testes.',
  };
}

/**
 * Retorna um texto curto para a interface.
 */
export function getMarketDataModeLabel():
  string {
  if (
    currentMode === 'REAL'
  ) {
    return 'Dados reais';
  }

  if (
    currentMode === 'DEMO'
  ) {
    return 'Modo demo';
  }

  return 'Dados simulados';
}

/**
 * Indica se o sistema pode enviar
 * ordens reais.
 *
 * Atualmente continuará falso até
 * adicionarmos uma integração específica
 * de execução e controles de segurança.
 */
export function canSendRealOrders():
  boolean {
  return false;
}