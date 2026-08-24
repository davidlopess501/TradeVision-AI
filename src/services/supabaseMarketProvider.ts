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

export class SupabaseMarketDataProvider
  implements IMarketDataProvider
{
  readonly name = 'Supabase B3 - Excel RTD';

  async getCandles(
    asset: Asset,
    timeframe: Timeframe,
    count: number,
  ): Promise<Candle[]> {

    if (asset !== 'WDO') {
      throw new Error(
        `Supabase real ainda não configurado para ${asset}.`,
      );
    }

    if (timeframe !== '5m') {
      throw new Error(
        `Supabase real ainda não configurado para timeframe ${timeframe}.`,
      );
    }

    const safeCount = Math.min(
      2000,
      Math.max(1, Math.floor(count)),
    );

    const { data, error } = await supabase
      .from('wdo_5m')
      .select(
        'candle_time,asset,open,high,low,close,volume',
      )
      .order('candle_time', {
        ascending: false,
      })
      .limit(safeCount);

    if (error) {
      throw new Error(
        `Erro Supabase candles: ${error.message}`,
      );
    }

    if (!data || data.length === 0) {
      throw new Error(
        'Nenhum candle WDO encontrado no Supabase.',
      );
    }

    return data
      .map((row) => ({
        time: new Date(row.candle_time).getTime(),
        open: Number(row.open),
        high: Number(row.high),
        low: Number(row.low),
        close: Number(row.close),
        volume: Number(row.volume),
      }))
      .filter(
        (candle) =>
          Number.isFinite(candle.time) &&
          Number.isFinite(candle.open) &&
          Number.isFinite(candle.high) &&
          Number.isFinite(candle.low) &&
          Number.isFinite(candle.close) &&
          Number.isFinite(candle.volume),
      )
      .sort(
        (a, b) => a.time - b.time,
      );
  }

  async getQuote(
    asset: Asset,
  ): Promise<Quote> {

    const candles = await this.getCandles(
      asset,
      '5m' as Timeframe,
      2,
    );

    const latest =
      candles[candles.length - 1];

    const previous =
      candles.length > 1
        ? candles[candles.length - 2]
        : latest;

    const changePct =
      previous.close !== 0
        ? (
            (latest.close - previous.close) /
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
    callback: (quote: Quote) => void,
  ): () => void {

    let active = true;

    const update = async () => {
      if (!active) {
        return;
      }

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
    _asset: Asset,
    _timeframe: Timeframe,
  ): Promise<IndicatorResult[]> {
    return [];
  }

  async analyze(
    _asset: Asset,
    _timeframe: Timeframe,
  ): Promise<AnalysisResult> {
    throw new Error(
      'Análise REAL Supabase será conectada na próxima etapa.',
    );
  }
}