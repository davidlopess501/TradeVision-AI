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
import { ASSETS } from '@/lib/assets';

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


type SupabaseCandleRow = {
  candle_time: string;
  asset: string;
  open: number | string;
  high: number | string;
  low: number | string;
  close: number | string;
  volume: number | string;
};


/**
 * Aceita somente horários reais de candle 5m:
 * xx:00, xx:05, xx:10, ...
 *
 * Isso remove:
 * - candle teste com segundos quebrados;
 * - registros de 1 segundo;
 * - registros que não pertencem ao timeframe 5m.
 */
function isFiveMinuteBoundary(
  milliseconds: number,
): boolean {
  const date =
    new Date(milliseconds);

  return (
    Number.isFinite(milliseconds) &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0 &&
    date.getUTCMinutes() % 5 === 0
  );
}


function isValidOhlc(
  candle: Candle,
): boolean {
  if (
    !Number.isFinite(candle.open) ||
    !Number.isFinite(candle.high) ||
    !Number.isFinite(candle.low) ||
    !Number.isFinite(candle.close) ||
    !Number.isFinite(candle.volume)
  ) {
    return false;
  }

  if (
    candle.open <= 0 ||
    candle.high <= 0 ||
    candle.low <= 0 ||
    candle.close <= 0 ||
    candle.volume < 0
  ) {
    return false;
  }

  const bodyHigh =
    Math.max(
      candle.open,
      candle.close,
    );

  const bodyLow =
    Math.min(
      candle.open,
      candle.close,
    );

  return (
    candle.high >= bodyHigh &&
    candle.low <= bodyLow &&
    candle.high >= candle.low
  );
}


function isValidFiveMinuteCandle(
  candle: Candle,
): boolean {
  return (
    isFiveMinuteBoundary(
      candle.time,
    ) &&
    isValidOhlc(
      candle,
    )
  );
}


function mergeRealCandles(
  historicalCandles: Candle[],
  supabaseCandles: Candle[],
): Candle[] {
  const byTime =
    new Map<number, Candle>();


  for (
    const candle of historicalCandles
  ) {
    if (
      isValidFiveMinuteCandle(
        candle,
      )
    ) {
      byTime.set(
        candle.time,
        candle,
      );
    }
  }


  /**
   * Supabase entra depois.
   * Portanto, se existir o mesmo horário,
   * o registro mais recente do Supabase
   * substitui o histórico local.
   */
  for (
    const candle of supabaseCandles
  ) {
    if (
      isValidFiveMinuteCandle(
        candle,
      )
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
          .filter(
            (row) =>
              String(
                row.asset,
              )
                .toUpperCase()
                .includes(
                  'WDO',
                ),
          )
          .map(
            (row) => ({
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
            }),
          )
          .filter(
            isValidFiveMinuteCandle,
          );


    const historicalCandles =
      WDO_REAL_HISTORY_24082026
        .filter(
          isValidFiveMinuteCandle,
        );


    const merged =
      mergeRealCandles(
        historicalCandles,
        supabaseCandles,
      );


    if (
      merged.length === 0
    ) {
      throw new Error(
        'Nenhum candle REAL WDO 5m válido disponível.',
      );
    }


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

        supabaseValidos:
          supabaseCandles.length,

        totalSemDuplicatas:
          merged.length,

        retornados:
          result.length,

        primeiro:
          result[0]
            ?.time,

        ultimo:
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
            '[SupabaseMarketDataProvider]',
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


    if (
      candles.length < 35
    ) {
      throw new Error(
        `Histórico REAL insuficiente. Existem ${candles.length} candles; são necessários pelo menos 35.`,
      );
    }


    const decimals =
      ASSETS[
        asset
      ].decimals;


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