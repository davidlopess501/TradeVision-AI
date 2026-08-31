import { supabase } from '@/lib/supabase';

export type RealAsset =
  | 'WDO'
  | 'WIN';

export type RealTimeframe =
  | '5m'
  | '15m';

export type RealSignal =
  | 'BUY'
  | 'SELL'
  | 'WAIT';

export type RealTrend =
  | 'ALTA'
  | 'BAIXA'
  | 'LATERAL';

export type RealSignalResult =
  | 'OPEN'
  | 'WIN'
  | 'LOSS'
  | 'BREAKEVEN'
  | 'IGNORED';

export interface RealSignalJournalRow {
  id: number;
  asset: RealAsset;
  timeframe: RealTimeframe;
  candle_time: string;
  signal: RealSignal;
  score: number;
  confidence: number;
  trend: RealTrend;
  entry: number;
  stop: number;
  target: number;
  result: RealSignalResult;
  exit_price: number | null;
  pnl_points: number | null;
  pnl_money: number | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RealSignalJournalInput {
  asset: RealAsset;
  timeframe: RealTimeframe;
  candleTime: number;
  signal: RealSignal;
  score: number;
  confidence: number;
  trend: RealTrend;
  entry: number;
  stop: number;
  target: number;
}

interface CandleRow {
  candle_time: string;
  high: number | string;
  low: number | string;
  close: number | string;
}

export interface RealSignalMetrics {
  total: number;
  actionable: number;
  open: number;
  wins: number;
  losses: number;
  breakevens: number;
  winRate: number;
  netPnlMoney: number;
  avgScore: number;
  avgConfidence: number;
  buys: number;
  sells: number;
  waits: number;
}

function getMarketConfig(
  asset: RealAsset,
  timeframe: RealTimeframe,
): {
  table: string;
  symbol: string;
  moneyPerPoint: number;
} | null {
  if (
    asset === 'WDO' &&
    timeframe === '5m'
  ) {
    return {
      table: 'wdo_5m',
      symbol: 'WDOU26',
      moneyPerPoint: 10,
    };
  }

  if (
    asset === 'WIN' &&
    timeframe === '15m'
  ) {
    return {
      table: 'win_15m',
      symbol: 'WINV26',
      moneyPerPoint: 0.2,
    };
  }

  return null;
}

function isActionableSignal(
  signal: RealSignal,
): signal is 'BUY' | 'SELL' {
  return (
    signal === 'BUY' ||
    signal === 'SELL'
  );
}

function validTradePlan(
  row: RealSignalJournalRow,
): boolean {
  if (!isActionableSignal(row.signal)) {
    return false;
  }

  if (
    !Number.isFinite(row.entry) ||
    !Number.isFinite(row.stop) ||
    !Number.isFinite(row.target) ||
    row.entry <= 0 ||
    row.stop <= 0 ||
    row.target <= 0
  ) {
    return false;
  }

  if (row.signal === 'BUY') {
    return (
      row.stop < row.entry &&
      row.target > row.entry
    );
  }

  return (
    row.stop > row.entry &&
    row.target < row.entry
  );
}

/**
 * Salva uma analise por candle REAL.
 * O indice UNIQUE(asset,timeframe,candle_time)
 * evita registros duplicados.
 */
export async function upsertRealSignalJournal(
  input: RealSignalJournalInput,
): Promise<void> {
  const actionable =
    isActionableSignal(input.signal);

  const payload = {
    asset: input.asset,
    timeframe: input.timeframe,
    candle_time:
      new Date(input.candleTime)
        .toISOString(),
    signal: input.signal,
    score: Number(input.score),
    confidence:
      Number(input.confidence),
    trend: input.trend,
    entry: actionable
      ? Number(input.entry)
      : 0,
    stop: actionable
      ? Number(input.stop)
      : 0,
    target: actionable
      ? Number(input.target)
      : 0,
    result: actionable
      ? 'OPEN'
      : 'IGNORED',
    updated_at:
      new Date().toISOString(),
  };

  const {
    error,
  } = await supabase
    .from('real_signal_journal')
    .upsert(
      payload,
      {
        onConflict:
          'asset,timeframe,candle_time',
        ignoreDuplicates: false,
      },
    );

  if (error) {
    throw new Error(
      `real_signal_journal: ${error.message}`,
    );
  }
}

/**
 * Resolve sinais BUY/SELL com candles posteriores.
 *
 * Se alvo e stop forem atingidos no mesmo candle,
 * assume LOSS de forma conservadora, pois nao
 * conhecemos a sequencia intrabar.
 */
export async function resolvePendingRealSignals():
  Promise<number> {
  const {
    data,
    error,
  } = await supabase
    .from('real_signal_journal')
    .select(
      [
        'id',
        'asset',
        'timeframe',
        'candle_time',
        'signal',
        'score',
        'confidence',
        'trend',
        'entry',
        'stop',
        'target',
        'result',
        'exit_price',
        'pnl_points',
        'pnl_money',
        'resolved_at',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .eq('result', 'OPEN')
    .order(
      'candle_time',
      { ascending: true },
    )
    .limit(500);

  if (error) {
    throw new Error(
      `Falha ao buscar sinais abertos: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as unknown as
      RealSignalJournalRow[];

  let resolved = 0;

  for (const row of rows) {
    const config =
      getMarketConfig(
        row.asset,
        row.timeframe,
      );

    if (
      !config ||
      !validTradePlan(row)
    ) {
      continue;
    }

    const {
      data: candleData,
      error: candleError,
    } = await supabase
      .from(config.table)
      .select(
        'candle_time,high,low,close',
      )
      .eq(
        'asset',
        config.symbol,
      )
      .gt(
        'candle_time',
        row.candle_time,
      )
      .order(
        'candle_time',
        { ascending: true },
      )
      .limit(250);

    if (candleError) {
      console.error(
        '[TradeVision] Falha ao buscar candles para resolver journal:',
        candleError,
      );
      continue;
    }

    const candles =
      (candleData ?? []) as unknown as
        CandleRow[];

    let result:
      RealSignalResult | null = null;

    let exitPrice:
      number | null = null;

    for (const candle of candles) {
      const high =
        Number(candle.high);

      const low =
        Number(candle.low);

      if (
        !Number.isFinite(high) ||
        !Number.isFinite(low)
      ) {
        continue;
      }

      if (row.signal === 'BUY') {
        const hitStop =
          low <= row.stop;

        const hitTarget =
          high >= row.target;

        if (hitStop) {
          result = 'LOSS';
          exitPrice = row.stop;
          break;
        }

        if (hitTarget) {
          result = 'WIN';
          exitPrice = row.target;
          break;
        }
      }

      if (row.signal === 'SELL') {
        const hitStop =
          high >= row.stop;

        const hitTarget =
          low <= row.target;

        if (hitStop) {
          result = 'LOSS';
          exitPrice = row.stop;
          break;
        }

        if (hitTarget) {
          result = 'WIN';
          exitPrice = row.target;
          break;
        }
      }
    }

    if (
      !result ||
      exitPrice === null
    ) {
      continue;
    }

    const pnlPoints =
      row.signal === 'BUY'
        ? exitPrice - row.entry
        : row.entry - exitPrice;

    const pnlMoney =
      pnlPoints *
      config.moneyPerPoint;

    const {
      error: updateError,
    } = await supabase
      .from('real_signal_journal')
      .update({
        result,
        exit_price: exitPrice,
        pnl_points: pnlPoints,
        pnl_money: pnlMoney,
        resolved_at:
          new Date().toISOString(),
        updated_at:
          new Date().toISOString(),
      })
      .eq('id', row.id);

    if (updateError) {
      console.error(
        '[TradeVision] Falha ao resolver sinal:',
        updateError,
      );
      continue;
    }

    resolved += 1;
  }

  return resolved;
}

export async function getRealSignalHistory(
  limit = 300,
): Promise<RealSignalJournalRow[]> {
  const safeLimit =
    Math.min(
      1000,
      Math.max(
        1,
        Math.floor(limit),
      ),
    );

  const {
    data,
    error,
  } = await supabase
    .from('real_signal_journal')
    .select(
      [
        'id',
        'asset',
        'timeframe',
        'candle_time',
        'signal',
        'score',
        'confidence',
        'trend',
        'entry',
        'stop',
        'target',
        'result',
        'exit_price',
        'pnl_points',
        'pnl_money',
        'resolved_at',
        'created_at',
        'updated_at',
      ].join(','),
    )
    .order(
      'candle_time',
      { ascending: false },
    )
    .limit(safeLimit);

  if (error) {
    throw new Error(
      `Falha ao carregar historico REAL: ${error.message}`,
    );
  }

  const rows =
    (data ?? []) as unknown as
      RealSignalJournalRow[];

  return rows.map(
    (row) => ({
      ...row,
      score:
        Number(row.score),
      confidence:
        Number(row.confidence),
      entry:
        Number(row.entry),
      stop:
        Number(row.stop),
      target:
        Number(row.target),
      exit_price:
        row.exit_price === null
          ? null
          : Number(
              row.exit_price,
            ),
      pnl_points:
        row.pnl_points === null
          ? null
          : Number(
              row.pnl_points,
            ),
      pnl_money:
        row.pnl_money === null
          ? null
          : Number(
              row.pnl_money,
            ),
    }),
  );
}

export function summarizeRealSignals(
  rows: RealSignalJournalRow[],
): RealSignalMetrics {
  const total =
    rows.length;

  const actionable =
    rows.filter(
      (row) =>
        isActionableSignal(
          row.signal,
        ),
    ).length;

  const wins =
    rows.filter(
      (row) =>
        row.result === 'WIN',
    ).length;

  const losses =
    rows.filter(
      (row) =>
        row.result === 'LOSS',
    ).length;

  const breakevens =
    rows.filter(
      (row) =>
        row.result ===
        'BREAKEVEN',
    ).length;

  const open =
    rows.filter(
      (row) =>
        row.result === 'OPEN',
    ).length;

  const closed =
    wins +
    losses +
    breakevens;

  const winRate =
    closed > 0
      ? (
          wins /
          closed
        ) * 100
      : 0;

  const netPnlMoney =
    rows.reduce(
      (
        sum,
        row,
      ) =>
        sum +
        (row.pnl_money ?? 0),
      0,
    );

  const avgScore =
    total > 0
      ? rows.reduce(
          (
            sum,
            row,
          ) =>
            sum +
            row.score,
          0,
        ) / total
      : 0;

  const avgConfidence =
    total > 0
      ? rows.reduce(
          (
            sum,
            row,
          ) =>
            sum +
            row.confidence,
          0,
        ) / total
      : 0;

  return {
    total,
    actionable,
    open,
    wins,
    losses,
    breakevens,
    winRate,
    netPnlMoney,
    avgScore,
    avgConfidence,
    buys:
      rows.filter(
        (row) =>
          row.signal === 'BUY',
      ).length,
    sells:
      rows.filter(
        (row) =>
          row.signal === 'SELL',
      ).length,
    waits:
      rows.filter(
        (row) =>
          row.signal === 'WAIT',
      ).length,
  };
}
