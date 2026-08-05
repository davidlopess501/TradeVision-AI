import type {
  Asset,
  Candle,
} from '@/types';

import {
  analyzeMarketStructure,
} from '@/lib/marketStructure';

import {
  analyzeOrderBlocks,
} from '@/lib/orderBlocks';

import {
  analyzeFairValueGaps,
} from '@/lib/fairValueGaps';

import {
  analyzeLiquiditySweeps,
} from '@/lib/liquiditySweeps';

import {
  formatPrice,
} from '@/lib/assets';

interface SmartMoneyPanelProps {
  asset: Asset;
  candles: Candle[];
}

export function SmartMoneyPanel({
  asset,
  candles,
}: SmartMoneyPanelProps) {
  const marketStructure =
    analyzeMarketStructure(candles);

  const orderBlockAnalysis =
    analyzeOrderBlocks(candles);

  const fairValueGapAnalysis =
    analyzeFairValueGaps(candles);

  const liquiditySweepAnalysis =
    analyzeLiquiditySweeps(candles);

  const structureTone =
    marketStructure.trend === 'BULLISH'
      ? 'bull'
      : marketStructure.trend === 'BEARISH'
        ? 'bear'
        : 'wait';

  const structureLabel =
    marketStructure.trend === 'BULLISH'
      ? 'ALTA'
      : marketStructure.trend === 'BEARISH'
        ? 'BAIXA'
        : 'LATERAL';

  const strongestOrderBlock = [
    ...orderBlockAnalysis.bullish,
    ...orderBlockAnalysis.bearish,
  ].reduce(
    (maximum, block) =>
      Math.max(maximum, block.strength),
    0,
  );

  const strongestGap =
    fairValueGapAnalysis.gaps.reduce(
      (maximum, gap) =>
        Math.max(maximum, gap.strength),
      0,
    );

  const strongestSweep =
    liquiditySweepAnalysis.sweeps.reduce(
      (maximum, sweep) =>
        Math.max(maximum, sweep.strength),
      0,
    );

  return (
    <section className="animate-fade-up space-y-3">
      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          Smart Money
        </h3>

        <p className="mt-1 text-[11px] text-slate-600">
          Estrutura, Order Blocks, FVG e Liquidity Sweeps
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat
          label="Estrutura"
          value={structureLabel}
          tone={structureTone}
        />

        <MiniStat
          label="BOS / CHOCH"
          value={`${marketStructure.events.length}`}
        />

        <MiniStat
          label="Suportes"
          value={`${marketStructure.supports.length}`}
          tone="bull"
        />

        <MiniStat
          label="Resistências"
          value={`${marketStructure.resistances.length}`}
          tone="bear"
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat
          label="OB ativos"
          value={`${orderBlockAnalysis.active.length}`}
          tone={
            orderBlockAnalysis.active.length > 0
              ? 'bull'
              : 'wait'
          }
        />

        <MiniStat
          label="OB compra"
          value={
            orderBlockAnalysis.nearestBullish
              ? formatPrice(
                  asset,
                  orderBlockAnalysis.nearestBullish.midpoint,
                )
              : '—'
          }
          tone="bull"
        />

        <MiniStat
          label="OB venda"
          value={
            orderBlockAnalysis.nearestBearish
              ? formatPrice(
                  asset,
                  orderBlockAnalysis.nearestBearish.midpoint,
                )
              : '—'
          }
          tone="bear"
        />

        <MiniStat
          label="Força OB"
          value={`${strongestOrderBlock}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat
          label="FVG abertos"
          value={`${fairValueGapAnalysis.open.length}`}
          tone={
            fairValueGapAnalysis.open.length > 0
              ? 'bull'
              : 'wait'
          }
        />

        <MiniStat
          label="FVG compra"
          value={
            fairValueGapAnalysis.nearestBullish
              ? formatPrice(
                  asset,
                  fairValueGapAnalysis.nearestBullish.midpoint,
                )
              : '—'
          }
          tone="bull"
        />

        <MiniStat
          label="FVG venda"
          value={
            fairValueGapAnalysis.nearestBearish
              ? formatPrice(
                  asset,
                  fairValueGapAnalysis.nearestBearish.midpoint,
                )
              : '—'
          }
          tone="bear"
        />

        <MiniStat
          label="Força FVG"
          value={`${strongestGap}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <MiniStat
          label="Sweeps confirmados"
          value={`${liquiditySweepAnalysis.confirmed.length}`}
          tone={
            liquiditySweepAnalysis.confirmed.length > 0
              ? 'bull'
              : 'wait'
          }
        />

        <MiniStat
          label="Sweep compra"
          value={
            liquiditySweepAnalysis.nearestBullish
              ? formatPrice(
                  asset,
                  liquiditySweepAnalysis.nearestBullish.sweptLevel,
                )
              : '—'
          }
          tone="bull"
        />

        <MiniStat
          label="Sweep venda"
          value={
            liquiditySweepAnalysis.nearestBearish
              ? formatPrice(
                  asset,
                  liquiditySweepAnalysis.nearestBearish.sweptLevel,
                )
              : '—'
          }
          tone="bear"
        />

        <MiniStat
          label="Força Sweep"
          value={`${strongestSweep}`}
        />
      </div>
    </section>
  );
}

function MiniStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'bull' | 'bear' | 'wait';
}) {
  return (
    <div className="rounded-lg bg-ink-800/60 p-2.5 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div
        className={`mt-0.5 font-mono text-xs font-bold tabular ${
          tone === 'bull'
            ? 'text-bull-400'
            : tone === 'bear'
              ? 'text-bear-400'
              : tone === 'wait'
                ? 'text-wait-400'
                : 'text-slate-200'
        }`}
      >
        {value}
      </div>
    </div>
  );
}