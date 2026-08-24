import type {
  Asset,
  Timeframe,
  Candle,
  Quote,
  IndicatorResult,
  AnalysisResult,
} from '@/types';

import type {
  IMarketDataProvider,
} from './types';

import { supabase } from '@/lib/supabase';

import {
  ASSETS,
} from '@/lib/assets';

import {
  INDICATOR_META,
  buildIndicator,
  buildRealEmaIndicators,
  buildRealRsiIndicator,
  buildRealMacdIndicator,
  buildRealVolumeIndicator,
  buildRealAtrIndicator,
} from '@/lib/indicators';

import {
  buildHistoricalAnalysis,
} from './historicalAnalysisBuilder';


/**
 * ============================================================
 * TRADEVISION AI
 * PROVIDER REAL WDO 5M
 *
 * Excel / RTD
 *      ↓
 * Supabase
 *      ↓
 * TradeVision REAL
 * ============================================================
 */

type SupabaseCandleRow = {
  candle_time: string;
  asset: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string;
};


export class SupabaseMarketDataProvider
  implements IMarketDataProvider
{
  readonly name =
    'Supabase B3 - Excel RTD';


  /**
   * ==========================================================
   * CANDLES
   * ==========================================================
   */
  async getCandles(
    asset: Asset,
    timeframe: Timeframe,
    count: number,
  ): Promise<Candle[]> {

    /**
     * Nesta primeira versão REAL,
     * trabalhamos somente com:
     *
     * WDO
     * 5 minutos
     */
    if (asset !== 'WDO') {
      throw new Error(
        `Modo REAL ainda não configurado para ${asset}. Selecione WDO.`,
      );
    }


    if (timeframe !== '5m') {
      throw new Error(
        `Modo REAL do Supabase está disponível somente para WDO 5m. Timeframe recebido: ${timeframe}.`,
      );
    }


    /**
     * O Supabase será consultado no máximo
     * por 2.000 candles por chamada.
     *
     * Isso evita consultas muito pesadas
     * enquanto estamos na primeira versão.
     */
    const safeCount =
      Math.min(
        2000,
        Math.max(
          1,
          Math.floor(count),
        ),
      );


    const {
      data,
      error,
    } = await supabase
      .from('wdo_5m')
      .select(
        [
          'candle_time',
          'asset',
          'open',
          'high',
          'low',
          'close',
          'volume',
        ].join(','),
      )
      .order(
        'candle_time',
        {
          ascending: false,
        },
      )
      .limit(safeCount);


    if (error) {
      throw new Error(
        `Erro Supabase candles: ${error.message}`,
      );
    }


    if (
      !data ||
      data.length === 0
    ) {
      throw new Error(
        'Nenhum candle WDO 5m encontrado no Supabase.',
      );
    }


    /**
     * O cliente Supabase deste projeto ainda
     * não possui os tipos gerados da tabela
     * wdo_5m.
     *
     * Por isso tipamos explicitamente as
     * linhas retornadas antes da conversão
     * para Candle.
     */
    const rows =
      data as unknown as SupabaseCandleRow[];


    /**
     * Converte os registros do Supabase
     * para o formato Candle usado
     * internamente pelo TradeVision.
     */
    const candles: Candle[] =
      rows
        .map((row) => ({
          time:
            new Date(
              row.candle_time,
            ).getTime(),

          open:
            Number(row.open),

          high:
            Number(row.high),

          low:
            Number(row.low),

          close:
            Number(row.close),

          volume:
            Number(row.volume),
        }))
        .filter(
          (candle) =>
            Number.isFinite(
              candle.time,
            ) &&
            Number.isFinite(
              candle.open,
            ) &&
            Number.isFinite(
              candle.high,
            ) &&
            Number.isFinite(
              candle.low,
            ) &&
            Number.isFinite(
              candle.close,
            ) &&
            Number.isFinite(
              candle.volume,
            ),
        )
        .sort(
          (
            first,
            second,
          ) =>
            first.time -
            second.time,
        );


    if (candles.length === 0) {
      throw new Error(
        'Os registros do Supabase foram encontrados, mas nenhum candle válido pôde ser convertido.',
      );
    }


    console.info(
      '[TradeVision REAL] Candles WDO 5m recebidos do Supabase:',
      {
        total:
          candles.length,

        primeiro:
          candles[0]?.time,

        ultimo:
          candles[
            candles.length - 1
          ]?.time,

        ultimoClose:
          candles[
            candles.length - 1
          ]?.close,
      },
    );


    return candles;
  }


  /**
   * ==========================================================
   * COTAÇÃO
   * ==========================================================
   *
   * Utilizamos o último candle fechado
   * armazenado no Supabase.
   */
  async getQuote(
    asset: Asset,
  ): Promise<Quote> {

    const candles =
      await this.getCandles(
        asset,
        '5m' as Timeframe,
        2,
      );


    const latest =
      candles[
        candles.length - 1
      ];


    if (!latest) {
      throw new Error(
        'Não foi possível obter o último candle WDO.',
      );
    }


    const previous =
      candles.length > 1
        ? candles[
            candles.length - 2
          ]
        : latest;


    const changePct =
      previous.close !== 0
        ? (
            (
              latest.close -
              previous.close
            ) /
            previous.close
          ) * 100
        : 0;


    return {
      asset,

      price:
        latest.close,

      changePct,

      high:
        latest.high,

      low:
        latest.low,

      open:
        latest.open,

      /**
       * Ainda não recebemos BID/ASK pelo
       * Excel, portanto spread permanece
       * neutro nesta etapa.
       */
      spread: 0,

      updatedAt:
        latest.time,
    };
  }


  /**
   * ==========================================================
   * ATUALIZAÇÃO DE COTAÇÃO
   * ==========================================================
   *
   * Consulta o Supabase a cada 5 segundos.
   *
   * Como o Excel envia candle fechado de
   * 5 minutos, o preço só muda quando um
   * novo candle entrar no banco.
   */
  subscribeQuotes(
    asset: Asset,
    callback:
      (quote: Quote) => void,
  ): () => void {

    let active = true;
    let running = false;


    const update =
      async () => {

        if (
          !active ||
          running
        ) {
          return;
        }


        running = true;


        try {

          const quote =
            await this.getQuote(
              asset,
            );


          if (active) {
            callback(
              quote,
            );
          }

        } catch (error) {

          console.error(
            '[SupabaseMarketDataProvider] Falha ao atualizar cotação:',
            error,
          );

        } finally {

          running = false;

        }
      };


    void update();


    const interval =
      window.setInterval(
        () =>
          void update(),
        5000,
      );


    return () => {

      active = false;

      window.clearInterval(
        interval,
      );

    };
  }


  /**
   * ==========================================================
   * INDICADORES REAIS
   * ==========================================================
   *
   * Utiliza os mesmos cálculos que já
   * existem no TradeVision.
   *
   * Nenhum indicador é inventado.
   */
  async getIndicators(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<IndicatorResult[]> {

    const quote =
      await this.getQuote(
        asset,
      );


    const candles =
      await this.getCandles(
        asset,
        timeframe,
        120,
      );


    /**
     * Precisamos de histórico mínimo
     * para indicadores como EMA e MACD.
     */
    if (candles.length < 30) {

      throw new Error(
        `Histórico REAL ainda insuficiente para calcular indicadores. Candles disponíveis: ${candles.length}.`,
      );

    }


    const decimals =
      ASSETS[asset].decimals;


    const realIndicators:
      IndicatorResult[] = [

        ...buildRealEmaIndicators(
          candles,
          decimals,
        ),

        buildRealRsiIndicator(
          candles,
        ),

        buildRealMacdIndicator(
          candles,
          decimals,
        ),

        buildRealVolumeIndicator(
          candles,
        ),

        buildRealAtrIndicator(
          candles,
          decimals,
        ),

      ];


    /**
     * Mantemos a mesma lista de
     * indicadores esperada pelo sistema.
     *
     * Indicadores ainda não calculados
     * ficam neutros.
     */
    return INDICATOR_META.map(
      (meta) => {

        const realIndicator =
          realIndicators.find(
            (indicator) =>
              indicator.key ===
              meta.key,
          );


        if (realIndicator) {
          return realIndicator;
        }


        return buildIndicator(
          meta.key,
          () => 0.5,
          asset,
          quote.price,
          decimals,
        );

      },
    );
  }


  /**
   * ==========================================================
   * ANÁLISE REAL
   * ==========================================================
   *
   * 1. Busca candles reais do Supabase.
   * 2. Usa o motor histórico já existente
   *    no TradeVision.
   * 3. Retorna AnalysisResult normalmente.
   */
  async analyze(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<AnalysisResult> {

    if (
      asset !== 'WDO' ||
      timeframe !== '5m'
    ) {

      throw new Error(
        'Análise REAL disponível nesta etapa somente para WDO 5m.',
      );

    }


    /**
     * 120 candles é a janela utilizada
     * para a análise real.
     */
    const candles =
      await this.getCandles(
        asset,
        timeframe,
        120,
      );


    /**
     * A análise técnica precisa de
     * histórico suficiente.
     */
    if (candles.length < 30) {

      throw new Error(
        `Supabase conectado, mas ainda há apenas ${candles.length} candles reais. Precisamos acumular mais histórico para liberar a análise técnica completa.`,
      );

    }


    const analysis =
      buildHistoricalAnalysis(
        asset,
        timeframe,
        candles,
      );


    console.info(
      '[TradeVision REAL] Análise WDO 5m concluída:',
      {
        candles:
          candles.length,

        score:
          analysis.score,

        trend:
          analysis.trend,

        signal:
          analysis.finalSignal,
      },
    );


    return analysis;
  }
}