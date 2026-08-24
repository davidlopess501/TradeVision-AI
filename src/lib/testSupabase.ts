import { supabase } from './supabase';

export async function testSupabaseConnection() {
  const { data, error } = await supabase
    .from('wdo_5m')
    .select('*')
    .order('candle_time', { ascending: false })
    .limit(5);

  if (error) {
    console.error('[TradeVision] Supabase ERRO:', error);
    return;
  }

  console.log('[TradeVision] Supabase OK:', data);
}
