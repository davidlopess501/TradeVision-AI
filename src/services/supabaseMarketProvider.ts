import type {
  AnalysisResult,
  Asset,
  Candle,
  IndicatorResult,
  Quote,
  Timeframe,
} from '@/types';

import type {
  IMarketDataProvider,
} from './types';

import { supabase } from '@/lib/supabase';
import { ASSETS } from '@/lib/assets';

import {
  INDICATOR_META,
  buildIndicator,
  buildRealAtrIndicator,
  buildRealEmaIndicators,
  buildRealMacdIndicator,
  buildRealRsiIndicator,
  buildRealVolumeIndicator,
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

type RealMarketConfig = {
  asset: Asset;
  timeframe: Timeframe;
  table: string;
  minutes: number;
  symbolPrefix: string;
};

const REAL_MARKETS: RealMarketConfig[] = [
  {
    asset: 'WDO',
    timeframe: '5m',
    table: 'wdo_5m',
    minutes: 5,
    symbolPrefix: 'WDO',
  },
  {
    asset: 'WIN',
    timeframe: '15m',
    table: 'win_15m',
    minutes: 15,
    symbolPrefix: 'WIN',
  },
];

function getRealMarketConfig(
  asset: Asset,
  timeframe: Timeframe,
): RealMarketConfig {
  const config = REAL_MARKETS.find(
    (item) =>
      item.asset === asset &&
      item.timeframe === timeframe,
  );

  if (!config) {
    throw new Error(
      `Modo REAL não configurado para ${asset} ${timeframe}. Disponíveis: WDO 5m e WIN 15m.`,
    );
  }

  return config;
}

function getDefaultTimeframe(
  asset: Asset,
): Timeframe {
  if (asset === 'WDO') return '5m';
  if (asset === 'WIN') return '15m';

  throw new Error(
    `Modo REAL não configurado para ${asset}. Disponíveis: WDO e WIN.`,
  );
}

function isTimeframeBoundary(
  milliseconds: number,
  minutes: number,
): boolean {
  const date = new Date(milliseconds);

  return (
    Number.isFinite(milliseconds) &&
    date.getUTCSeconds() === 0 &&
    date.getUTCMilliseconds() === 0 &&
    date.getUTCMinutes() % minutes === 0
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

  const bodyHigh = Math.max(
    candle.open,
    candle.close,
  );

  const bodyLow = Math.min(
    candle.open,
    candle.close,
  );

  return (
    candle.high >= bodyHigh &&
    candle.low <= bodyLow &&
    candle.high >= candle.low
  );
}

function isValidRealCandle(
  candle: Candle,
  minutes: number,
): boolean {
  return (
    isTimeframeBoundary(
      candle.time,
      minutes,
    ) &&
    isValidOhlc(candle)
  );
}

function mergeRealCandles(
  historicalCandles: Candle[],
  supabaseCandles: Candle[],
  minutes: number,
): Candle[] {
  const byTime = new Map<number, Candle>();

  for (const candle of historicalCandles) {
    if (isValidRealCandle(candle, minutes)) {
      byTime.set(candle.time, candle);
    }
  }

  for (const candle of supabaseCandles) {
    if (isValidRealCandle(candle, minutes)) {
      byTime.set(candle.time, candle);
    }
  }

  return Array
    .from(byTime.values())
    .sort(
      (first, second) =>
        first.time - second.time,
    );
}

function mapSupabaseRowsToCandles(
  rows: SupabaseCandleRow[],
  symbolPrefix: string,
  minutes: number,
): Candle[] {
  return rows
    .filter(
      (row) =>
        String(row.asset)
          .toUpperCase()
          .includes(symbolPrefix),
    )
    .map(
      (row) => ({
        time: new Date(
          row.candle_time,
        ).getTime(),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }),
    )
    .filter(
      (candle) =>
        isValidRealCandle(
          candle,
          minutes,
        ),
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
    const config =
      getRealMarketConfig(
        asset,
        timeframe,
      );

    const safeCount = Math.min(
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
      .from(config.table)
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
        `Erro Supabase candles ${asset} ${timeframe}: ${error.message}`,
      );
    }

    const rows = (
      data ?? []
    ) as unknown as SupabaseCandleRow[];

    const supabaseCandles =
      mapSupabaseRowsToCandles(
        rows,
        config.symbolPrefix,
        config.minutes,
      );

    const historicalCandles: Candle[] =
      asset === 'WDO' &&
      timeframe === '5m'
        ? WDO_REAL_HISTORY_24082026.filter(
            (candle) =>
              isValidRealCandle(
                candle,
                config.minutes,
              ),
          )
        : [];

    const merged =
      mergeRealCandles(
        historicalCandles,
        supabaseCandles,
        config.minutes,
      );

    if (merged.length === 0) {
      throw new Error(
        `Nenhum candle REAL ${asset} ${timeframe} válido disponível.`,
      );
    }

    const result =
      merged.length > safeCount
        ? merged.slice(-safeCount)
        : merged;

    console.info(
      `[TradeVision REAL] ${asset} ${timeframe}`,
      {
        tabela: config.table,
        historicoLocal:
          historicalCandles.length,
        supabaseValidos:
          supabaseCandles.length,
        totalSemDuplicatas:
          merged.length,
        retornados:
          result.length,
        primeiro:
          result[0]?.time,
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
    const timeframe =
      getDefaultTimeframe(asset);

    const candles =
      await this.getCandles(
        asset,
        timeframe,
        2,
      );

    const latest =
      candles[
        candles.length - 1
      ];

    if (!latest) {
      throw new Error(
        `Não foi possível obter o último candle REAL de ${asset}.`,
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
      price: latest.close,
      changePct,
      high: latest.high,
      low: latest.low,
      open: latest.open,
      spread: 0,
      updatedAt: latest.time,
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
            await this.getQuote(asset);

          if (active) {
            callback(quote);
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
        () => void update(),
        5000,
      );

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }

  async getIndicators(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<IndicatorResult[]> {
    getRealMarketConfig(
      asset,
      timeframe,
    );

    const quote =
      await this.getQuote(asset);

    const candles =
      await this.getCandles(
        asset,
        timeframe,
        120,
      );

    if (candles.length < 35) {
      throw new Error(
        `Histórico REAL insuficiente para ${asset} ${timeframe}. Existem ${candles.length} candles; são necessários pelo menos 35.`,
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

  async analyze(
    asset: Asset,
    timeframe: Timeframe,
  ): Promise<AnalysisResult> {
    getRealMarketConfig(
      asset,
      timeframe,
    );

    const candles =
      await this.getCandles(
        asset,
        timeframe,
        120,
      );

    if (candles.length < 35) {
      throw new Error(
        `Histórico REAL insuficiente para ${asset} ${timeframe}: ${candles.length}/35 candles.`,
      );
    }

    const analysis =
      buildHistoricalAnalysis(
        asset,
        timeframe,
        candles,
      );

    console.info(
      `[TradeVision REAL] Análise ${asset} ${timeframe} concluída`,
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
