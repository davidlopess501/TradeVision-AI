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

import {
  WDO_REAL_HISTORY_24082026,
} from '@/data/wdoRealHistory24082026';


/**
 * TRADEVISION AI
 *
 * WDO 5M REAL
 *
 * Histórico real capturado pelo Excel/RTD
 * +
 * candles recebidos continuamente pelo Supabase.
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


function mergeRealCandles(
  historicalCandles: Candle[],
  supabaseCandles: Candle[],
): Candle[] {

  /**
   * Map indexado pelo horário.
   *
   * Primeiro entra o histórico do Excel.
   * Depois entra o Supabase.
   *
   * Assim, caso exista um candle duplicado,
   * o registro do Supabase substitui o local.
   */
  const byTime =
    new Map<number, Candle>();


  for (
    const candle of historicalCandles
  ) {

    if (
      Number.isFinite(candle.time)
    ) {
      byTime.set(
        candle.time,
        candle,
      );
    }

  }


  for (
    const candle of supabaseCandles
  ) {

    if (
      Number.isFinite(candle.time)
    ) {
      byTime.set(
        candle.time,
        candle,
      );
    }

  }


  return Array
    .from(
      byTime.values(),
    )
    .sort(
      (first, second) =>
        first.time -
        second.time,
    );
}


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

    if (asset !== 'WDO') {
      throw new Error(
        `Modo REAL ainda não configurado para ${asset}. Selecione WDO.`,
      );
    }


    if (timeframe !== '5m') {
      throw new Error(
        `Modo REAL disponível somente para WDO 5m. Timeframe recebido: ${timeframe}.`,
      );
    }


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


    const rows =
      (
        data ?? []
      ) as unknown as
        SupabaseCandleRow[];


    const supabaseCandles:
      Candle[] =
        rows
          .map((row) => ({
            time:
              new Date(
                row.candle_time,
              ).getTime(),

            open:
              Number(
                row.open,
              ),

            high:
              Number(
                row.high,
              ),

            low:
              Number(
                row.low,
              ),

            close:
              Number(
                row.close,
              ),

            volume:
              Number(
                row.volume,
              ),
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
          );


    /**
     * Histórico REAL anterior capturado
     * pelo Excel/RTD em 24/08/2026.
     *
     * Não contém registros de 1 segundo.
     */
    const historicalCandles =
      WDO_REAL_HISTORY_24082026;


    const merged =
      mergeRealCandles(
        historicalCandles,
        supabaseCandles,
      );


    if (
      merged.length === 0
    ) {
      throw new Error(
        'Nenhum candle REAL WDO 5m disponível.',
      );
    }


    /**
     * Mantém exatamente a quantidade
     * solicitada pelo consumidor.
     */
    const result =
      merged.length >
      safeCount
        ? merged.slice(
            -safeCount,
          )
        : merged;


    console.info(
      '[TradeVision REAL] WDO 5m',
      {
        historicoExcel:
          historicalCandles.length,

        supabase:
          supabaseCandles.length,

        totalSemDuplicatas:
          merged.length,

        retornados:
          result.length,

        primeiroHorario:
          result[0]
            ?.time,

        ultimoHorario:
          result[
            result.length - 1
          ]?.time,

        ultimoClose:
          result[
            result.length - 1
          ]?.close,
      },
    );


    return result;
  }


  /**
   * ==========================================================
   * COTAÇÃO
   * ==========================================================
   */
  async getQuote(
    asset: Asset,
  ): Promise<Quote> {

    const candles =
      await this.getCandles(
        asset,
        '5m',
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

      spread: 0,

      updatedAt:
        latest.time,
    };
  }


  /**
   * ==========================================================
   * ATUALIZAÇÃO DE COTAÇÃO
   * ==========================================================
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
     * Trabalhamos com margem acima
     * do mínimo anterior.
     */
    if (
      candles.length < 35
    ) {

      throw new Error(
        `Histórico REAL insuficiente. Existem ${candles.length} candles; são necessários pelo menos 35.`,
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


    return INDICATOR_META.map(
      (meta) => {

        const realIndicator =
          realIndicators.find(
            (indicator) =>
              indicator.key ===
              meta.key,
          );


        if (
          realIndicator
        ) {
          return realIndicator;
        }


        /**
         * Indicadores não implementados
         * permanecem neutros.
         */
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


    const candles =
      await this.getCandles(
        asset,
        timeframe,
        120,
      );


    /**
     * O motor interno mostrou que precisamos
     * trabalhar com pelo menos 35 candles.
     */
    if (
      candles.length < 35
    ) {

      throw new Error(
        `Histórico REAL insuficiente: ${candles.length}/35 candles.`,
      );

    }


    const analysis =
      buildHistoricalAnalysis(
        asset,
        timeframe,
        candles,
      );


    console.info(
      '[TradeVision REAL] Análise WDO 5m concluída',
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