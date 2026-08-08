import type {
  Asset,
  AssetInfo,
  Timeframe,
} from '@/types';

export const ASSETS: Record<Asset, AssetInfo> = {
  WIN: {
    code: 'WIN',
    name: 'Mini Índice',
    fullName: 'WIN — Mini Índice Bovespa',
    basePrice: 129_800,

    // B3:
    // - variação mínima: 5 pontos
    // - cada ponto: R$ 0,20
    // Portanto:
    // 5 pontos por tick = R$ 1,00 por tick / contrato.
    tick: 5,
    tickValue: 1,
    decimals: 0,
  },

  WDO: {
    code: 'WDO',
    name: 'Mini Dólar',
    fullName: 'WDO — Mini Dólar Futures',

    // A cotação do WDO é em BRL por USD 1.000.
    // Ex.: 5,432 BRL/USD aparece na escala do contrato
    // aproximadamente como 5432,0.
    //
    // Mantemos o preço-base na mesma escala do contrato
    // para que tick, stop, target e indicadores sejam coerentes.
    basePrice: 5432,

    // B3:
    // - variação mínima: 0,5 ponto
    // - cada tick: R$ 5,00 por contrato
    // Logo:
    // 1 ponto = R$ 10,00 por contrato.
    tick: 0.5,
    tickValue: 5,
    decimals: 1,
  },
};

export const ASSET_LIST: AssetInfo[] = [
  ASSETS.WIN,
  ASSETS.WDO,
];

export const TIMEFRAMES: {
  value: Timeframe;
  label: string;
  minutes: number;
}[] = [
  {
    value: '1m',
    label: '1 minuto',
    minutes: 1,
  },
  {
    value: '5m',
    label: '5 minutos',
    minutes: 5,
  },
  {
    value: '15m',
    label: '15 minutos',
    minutes: 15,
  },
  {
    value: '60m',
    label: '60 minutos',
    minutes: 60,
  },
];

export function timeframesToMinutes(
  tf: Timeframe,
): number {
  return (
    TIMEFRAMES.find(
      (timeframe) =>
        timeframe.value === tf,
    )?.minutes ?? 1
  );
}

export function formatPrice(
  asset: Asset,
  value: number,
): string {
  const info =
    ASSETS[asset];

  return value.toLocaleString(
    'pt-BR',
    {
      minimumFractionDigits:
        info.decimals,
      maximumFractionDigits:
        info.decimals,
    },
  );
}

export function formatMoney(
  value: number,
): string {
  return value.toLocaleString(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  );
}

export function formatPct(
  value: number,
  digits = 2,
): string {
  return `${value.toFixed(digits)}%`;
}

export function formatDate(
  ts: number,
): string {
  return new Date(
    ts,
  ).toLocaleDateString(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit',
    },
  );
}

export function formatTime(
  ts: number,
): string {
  return new Date(
    ts,
  ).toLocaleTimeString(
    'pt-BR',
    {
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

export function formatDateTime(
  ts: number,
): string {
  return `${formatDate(ts)} ${formatTime(ts)}`;
}