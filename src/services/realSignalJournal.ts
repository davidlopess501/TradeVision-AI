import type {
  AnalysisResult,
  Asset,
  Timeframe,
} from '@/types';

import { supabase } from '@/lib/supabase';

type RealSignalJournalInput = {
  asset: Asset;
  timeframe: Timeframe;
  candleTime: number;
  signal: AnalysisResult['finalSignal'];
  score: number;
  confidence: number;
  trend: AnalysisResult['trend'];
  entry: number;
  stop: number;
  target: number;
};

/**
 * Diário idempotente dos sinais calculados em modo REAL.
 * Não envia ordens para corretora.
 */
export async function upsertRealSignalJournal(
  input: RealSignalJournalInput,
): Promise<void> {
  const payload = {
    asset: input.asset,
    timeframe: input.timeframe,
    candle_time: new Date(input.candleTime).toISOString(),
    signal: input.signal,
    score: Number(input.score),
    confidence: Number(input.confidence),
    trend: input.trend,
    entry: Number(input.entry),
    stop: Number(input.stop),
    target: Number(input.target),
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('real_signal_journal')
    .upsert(payload, {
      onConflict: 'asset,timeframe,candle_time',
      ignoreDuplicates: false,
    });

  if (error) {
    throw new Error(
      `real_signal_journal: ${error.message}`,
    );
  }
}
