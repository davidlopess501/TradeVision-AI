import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  LineSeries,
  createChart,
  createSeriesMarkers,
  type CandlestickData,
  type LineData,
  type UTCTimestamp,
} from 'lightweight-charts';

import type {
  Asset,
  Timeframe,
  AnalysisResult,
  Candle,
} from '@/types';

import { getMarketDataProvider } from '@/services/types';
import { useStore } from '@/store';

import {
  ASSET_LIST,
  TIMEFRAMES,
  formatPrice,
  formatDateTime,
} from '@/lib/assets';

import {
  META_BY_KEY,
  signalLabel,
} from '@/lib/indicators';

import {
  analyzeMarketStructure,
} from '@/lib/marketStructure';

import {
  analyzeOrderBlocks,
  type OrderBlock,
} from '@/lib/orderBlocks';

import {
  analyzeFairValueGaps,
  type FairValueGap,
} from '@/lib/fairValueGaps';

import {
  analyzeLiquiditySweeps,
} from '@/lib/liquiditySweeps';

import {
  analyzeFibonacci,
} from '@/lib/fibonacci';

import {
  ArrowUpCircle,
  ArrowDownCircle,
  CircleDot,
  RefreshCw,
  TrendingUp,
  DollarSign,
  Sparkles,
  Cpu,
  CandlestickChart,
} from 'lucide-react';

import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { ProgressBar } from '@/components/ui/ProgressBar';

const ASSET_ICON: Record<
  Asset,
  typeof TrendingUp
> = {
  WIN: TrendingUp,
  WDO: DollarSign,
};

interface AnalysisScreenProps {
  initialAsset: Asset;
  onGoToAI: (asset: Asset) => void;
  onGoToEngine: (asset: Asset) => void;
}

interface MarketChartProps {
  asset: Asset;
  candles: Candle[];
  result: AnalysisResult;
}

interface EmaPoint {
  time: UTCTimestamp;
  value: number;
}

function toTimestamp(
  milliseconds: number,
): UTCTimestamp {
  return Math.floor(
    milliseconds / 1000,
  ) as UTCTimestamp;
}

function calculateEmaSeries(
  candles: Candle[],
  period: number,
): EmaPoint[] {
  if (candles.length < period) {
    return [];
  }

  const closes = candles.map(
    (candle) => candle.close,
  );

  let ema =
    closes
      .slice(0, period)
      .reduce(
        (total, value) => total + value,
        0,
      ) / period;

  const multiplier = 2 / (period + 1);

  const result: EmaPoint[] = [
    {
      time: toTimestamp(
        candles[period - 1].time,
      ),
      value: ema,
    },
  ];

  for (
    let index = period;
    index < closes.length;
    index += 1
  ) {
    ema =
      (closes[index] - ema) *
        multiplier +
      ema;

    result.push({
      time: toTimestamp(
        candles[index].time,
      ),
      value: ema,
    });
  }

  return result;
}


function orderBlockColor(
  block: OrderBlock,
  opacity: number,
): string {
  return block.direction === 'BULLISH'
    ? `rgba(16, 185, 129, ${opacity})`
    : `rgba(239, 68, 68, ${opacity})`;
}

function orderBlockLabel(
  block: OrderBlock,
): string {
  const direction =
    block.direction === 'BULLISH'
      ? 'OB COMPRA'
      : 'OB VENDA';

  const status =
    block.status === 'ACTIVE'
      ? 'ATIVO'
      : block.status === 'MITIGATED'
        ? 'MITIGADO'
        : 'INVALIDADO';

  return `${direction} · ${status} · ${block.strength}`;
}

function fairValueGapColor(
  gap: FairValueGap,
  opacity: number,
): string {
  return gap.direction === 'BULLISH'
    ? `rgba(14, 165, 233, ${opacity})`
    : `rgba(168, 85, 247, ${opacity})`;
}

function fairValueGapLabel(
  gap: FairValueGap,
): string {
  const direction =
    gap.direction === 'BULLISH'
      ? 'FVG COMPRA'
      : 'FVG VENDA';

  const status =
    gap.status === 'OPEN'
      ? 'ABERTO'
      : gap.status === 'PARTIAL'
        ? `${gap.fillPercent}% PREENCHIDO`
        : gap.status === 'FILLED'
          ? 'PREENCHIDO'
          : 'INVALIDADO';

  return `${direction} · ${status} · ${gap.strength}`;
}

function MarketChart({
  asset,
  candles,
  result,
}: MarketChartProps) {
  const containerRef =
    useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container =
      containerRef.current;

    if (!container || candles.length === 0) {
      return;
    }

    const marketStructure =
      analyzeMarketStructure(candles);

    const orderBlockAnalysis =
      analyzeOrderBlocks(candles);

    const fairValueGapAnalysis =
      analyzeFairValueGaps(candles);

    const liquiditySweepAnalysis =
      analyzeLiquiditySweeps(candles);

    const fibonacciAnalysis =
      analyzeFibonacci(candles);

    const chart = createChart(container, {
      width: container.clientWidth,
      height: 390,

      layout: {
        background: {
          type: ColorType.Solid,
          color: '#07101f',
        },
        textColor: '#64748b',
        fontFamily:
          'Inter, system-ui, sans-serif',
      },

      grid: {
        vertLines: {
          color:
            'rgba(148, 163, 184, 0.055)',
        },
        horzLines: {
          color:
            'rgba(148, 163, 184, 0.055)',
        },
      },

      crosshair: {
        mode: CrosshairMode.Normal,

        vertLine: {
          color:
            'rgba(14, 165, 233, 0.45)',
          width: 1,
          style: 2,
          labelBackgroundColor:
            '#0284c7',
        },

        horzLine: {
          color:
            'rgba(14, 165, 233, 0.45)',
          width: 1,
          style: 2,
          labelBackgroundColor:
            '#0284c7',
        },
      },

      rightPriceScale: {
        borderColor:
          'rgba(148, 163, 184, 0.12)',
        scaleMargins: {
          top: 0.12,
          bottom: 0.12,
        },
      },

      timeScale: {
        borderColor:
          'rgba(148, 163, 184, 0.12)',
        timeVisible: true,
        secondsVisible: false,
        barSpacing: 8,
        rightOffset: 6,
      },

      handleScroll: {
        mouseWheel: true,
        pressedMouseMove: true,
        horzTouchDrag: true,
        vertTouchDrag: false,
      },

      handleScale: {
        axisPressedMouseMove: true,
        mouseWheel: true,
        pinch: true,
      },

      localization: {
        priceFormatter: (price) =>
          formatPrice(asset, price),
      },
    });

    const ema21Series =
      chart.addSeries(LineSeries, {
        color: '#f59e0b',
        lineWidth: 2,
        title: 'EMA 21',
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
      });

    const ema9Series =
      chart.addSeries(LineSeries, {
        color: '#38bdf8',
        lineWidth: 2,
        title: 'EMA 9',
        priceLineVisible: false,
        lastValueVisible: true,
        crosshairMarkerVisible: false,
      });

    const candleSeries =
      chart.addSeries(
        CandlestickSeries,
        {
          upColor: '#10b981',
          downColor: '#ef4444',
          borderUpColor: '#10b981',
          borderDownColor: '#ef4444',
          wickUpColor: '#34d399',
          wickDownColor: '#f87171',
          priceLineVisible: true,
          lastValueVisible: true,
        },
      );

    const candleData: CandlestickData[] =
      candles.map((candle) => ({
        time: toTimestamp(candle.time),
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
      }));

    const ema9Data: LineData[] =
      calculateEmaSeries(
        candles,
        9,
      ).map((point) => ({
        time: point.time,
        value: point.value,
      }));

    const ema21Data: LineData[] =
      calculateEmaSeries(
        candles,
        21,
      ).map((point) => ({
        time: point.time,
        value: point.value,
      }));

    candleSeries.setData(candleData);
    ema9Series.setData(ema9Data);
    ema21Series.setData(ema21Data);

    const structureMarkers =
      marketStructure.events
        .slice(-12)
        .map((event) => {
          const bullish =
            event.type === 'BOS_BULL' ||
            event.type === 'CHOCH_BULL';

          const choch =
            event.type === 'CHOCH_BULL' ||
            event.type === 'CHOCH_BEAR';

          return {
            time: toTimestamp(event.time),
            position: bullish
              ? ('belowBar' as const)
              : ('aboveBar' as const),
            color: bullish
              ? choch
                ? '#22d3ee'
                : '#10b981'
              : choch
                ? '#c084fc'
                : '#ef4444',
            shape: bullish
              ? ('arrowUp' as const)
              : ('arrowDown' as const),
            text: event.label,
          };
        })
        .sort(
          (first, second) =>
            Number(first.time) -
            Number(second.time),
        );

    const orderBlockMarkers =
      [
        ...orderBlockAnalysis.bullish,
        ...orderBlockAnalysis.bearish,
      ]
        .filter(
          (block) =>
            block.status !==
            'INVALIDATED',
        )
        .slice(-8)
        .map((block) => ({
          time: toTimestamp(
            block.confirmationTime,
          ),
          position:
            block.direction ===
            'BULLISH'
              ? ('belowBar' as const)
              : ('aboveBar' as const),
          color:
            block.direction ===
            'BULLISH'
              ? '#34d399'
              : '#fb7185',
          shape:
            block.direction ===
            'BULLISH'
              ? ('arrowUp' as const)
              : ('arrowDown' as const),
          text:
            block.direction ===
            'BULLISH'
              ? `OB↑ ${block.strength}`
              : `OB↓ ${block.strength}`,
        }));

    const fairValueGapMarkers =
      fairValueGapAnalysis.gaps
        .filter(
          (gap) =>
            gap.status === 'OPEN' ||
            gap.status === 'PARTIAL',
        )
        .slice(-8)
        .map((gap) => ({
          time: toTimestamp(
            gap.confirmationTime,
          ),
          position:
            gap.direction === 'BULLISH'
              ? ('belowBar' as const)
              : ('aboveBar' as const),
          color:
            gap.direction === 'BULLISH'
              ? '#38bdf8'
              : '#c084fc',
          shape:
            gap.direction === 'BULLISH'
              ? ('arrowUp' as const)
              : ('arrowDown' as const),
          text:
            gap.direction === 'BULLISH'
              ? `FVG↑ ${gap.strength}`
              : `FVG↓ ${gap.strength}`,
        }));


    const liquiditySweepMarkers =
      liquiditySweepAnalysis.sweeps
        .slice(-10)
        .map((sweep) => ({
          time: toTimestamp(sweep.time),
          position:
            sweep.direction === 'BULLISH'
              ? ('belowBar' as const)
              : ('aboveBar' as const),
          color:
            sweep.direction === 'BULLISH'
              ? sweep.status === 'CONFIRMED'
                ? '#2dd4bf'
                : '#5eead4'
              : sweep.status === 'CONFIRMED'
                ? '#f43f5e'
                : '#fda4af',
          shape:
            sweep.direction === 'BULLISH'
              ? ('arrowUp' as const)
              : ('arrowDown' as const),
          text:
            sweep.direction === 'BULLISH'
              ? `SWEEP↑ ${sweep.strength}`
              : `SWEEP↓ ${sweep.strength}`,
        }));

    createSeriesMarkers(
      candleSeries,
      [
        ...structureMarkers,
        ...orderBlockMarkers,
        ...fairValueGapMarkers,
        ...liquiditySweepMarkers,
      ].sort(
        (first, second) =>
          Number(first.time) -
          Number(second.time),
      ),
    );

    marketStructure.supports
      .slice(0, 3)
      .forEach((level, index) => {
        candleSeries.createPriceLine({
          price: level.price,
          color:
            index === 0
              ? '#22c55e'
              : 'rgba(34, 197, 94, 0.55)',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: `Suporte ${level.touches}x`,
        });
      });

    marketStructure.resistances
      .slice(0, 3)
      .forEach((level, index) => {
        candleSeries.createPriceLine({
          price: level.price,
          color:
            index === 0
              ? '#f97316'
              : 'rgba(249, 115, 22, 0.55)',
          lineWidth: 1,
          lineStyle: 3,
          axisLabelVisible: true,
          title: `Resist. ${level.touches}x`,
        });
      });

    if (
      orderBlockAnalysis.nearestBullish
    ) {
      candleSeries.createPriceLine({
        price:
          orderBlockAnalysis
            .nearestBullish.midpoint,
        color: '#10b981',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: 'OB Compra',
      });
    }

    if (
      orderBlockAnalysis.nearestBearish
    ) {
      candleSeries.createPriceLine({
        price:
          orderBlockAnalysis
            .nearestBearish.midpoint,
        color: '#ef4444',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: 'OB Venda',
      });
    }

    if (
      fairValueGapAnalysis.nearestBullish
    ) {
      candleSeries.createPriceLine({
        price:
          fairValueGapAnalysis
            .nearestBullish.midpoint,
        color: '#0ea5e9',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: 'FVG Compra',
      });
    }

    if (
      fairValueGapAnalysis.nearestBearish
    ) {
      candleSeries.createPriceLine({
        price:
          fairValueGapAnalysis
            .nearestBearish.midpoint,
        color: '#a855f7',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: 'FVG Venda',
      });
    }


    if (
      liquiditySweepAnalysis.nearestBullish
    ) {
      candleSeries.createPriceLine({
        price:
          liquiditySweepAnalysis
            .nearestBullish.sweptLevel,
        color: '#14b8a6',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: 'Sweep Compra',
      });
    }

    if (
      liquiditySweepAnalysis.nearestBearish
    ) {
      candleSeries.createPriceLine({
        price:
          liquiditySweepAnalysis
            .nearestBearish.sweptLevel,
        color: '#f43f5e',
        lineWidth: 1,
        lineStyle: 3,
        axisLabelVisible: true,
        title: 'Sweep Venda',
      });
    }

    if (fibonacciAnalysis) {
      const fibonacciColors: Record<string, string> = {
        '23,6%': '#64748b',
        '38,2%': '#60a5fa',
        '50%': '#facc15',
        '61,8%': '#f59e0b',
        '78,6%': '#f97316',
        '127,2%': '#a78bfa',
        '161,8%': '#c084fc',
      };

      fibonacciAnalysis.levels
        .filter(
          (level) =>
            level.label !== '0%' &&
            level.label !== '100%',
        )
        .forEach((level) => {
          candleSeries.createPriceLine({
            price: level.price,
            color:
              fibonacciColors[level.label] ??
              'rgba(148, 163, 184, 0.55)',
            lineWidth:
              level.label === '61,8%' ? 2 : 1,
            lineStyle:
              level.type === 'EXTENSION' ? 2 : 3,
            axisLabelVisible: true,
            title: `Fib ${level.label}`,
          });
        });
    }

    candleSeries.createPriceLine({
      price: result.entry,
      color: '#38bdf8',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Entrada',
    });

    candleSeries.createPriceLine({
      price: result.stop,
      color: '#ef4444',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Stop',
    });

    candleSeries.createPriceLine({
      price: result.target,
      color: '#10b981',
      lineWidth: 1,
      lineStyle: 2,
      axisLabelVisible: true,
      title: 'Alvo',
    });

    chart.timeScale().fitContent();

    container.style.position =
      'relative';

    const orderBlockOverlay =
      document.createElement('div');

    orderBlockOverlay.style.position =
      'absolute';
    orderBlockOverlay.style.inset = '0';
    orderBlockOverlay.style.pointerEvents =
      'none';
    orderBlockOverlay.style.zIndex = '3';
    orderBlockOverlay.style.overflow =
      'hidden';

    container.appendChild(
      orderBlockOverlay,
    );

    const visibleOrderBlocks = [
      ...orderBlockAnalysis.active,
      ...[
        ...orderBlockAnalysis.bullish,
        ...orderBlockAnalysis.bearish,
      ].filter(
        (block) =>
          block.status ===
          'MITIGATED',
      ),
    ]
      .sort(
        (first, second) =>
          first.startIndex -
          second.startIndex,
      )
      .slice(-6);

    const visibleFairValueGaps =
      fairValueGapAnalysis.gaps
        .filter(
          (gap) =>
            gap.status === 'OPEN' ||
            gap.status === 'PARTIAL',
        )
        .slice(-6);

    const renderOrderBlockZones = () => {
      orderBlockOverlay.replaceChildren();

      const lastCandle =
        candles[candles.length - 1];

      if (!lastCandle) return;

      for (const block of visibleOrderBlocks) {
        const startX =
          chart
            .timeScale()
            .timeToCoordinate(
              toTimestamp(
                block.startTime,
              ),
            );

        const endX =
          chart
            .timeScale()
            .timeToCoordinate(
              toTimestamp(
                lastCandle.time,
              ),
            );

        const highY =
          candleSeries.priceToCoordinate(
            block.high,
          );

        const lowY =
          candleSeries.priceToCoordinate(
            block.low,
          );

        if (
          startX === null ||
          endX === null ||
          highY === null ||
          lowY === null
        ) {
          continue;
        }

        const left = Math.min(
          startX,
          endX,
        );

        const top = Math.min(
          highY,
          lowY,
        );

        const width = Math.max(
          18,
          Math.abs(endX - startX),
        );

        const height = Math.max(
          4,
          Math.abs(lowY - highY),
        );

        const zone =
          document.createElement('div');

        zone.style.position =
          'absolute';
        zone.style.left = `${left}px`;
        zone.style.top = `${top}px`;
        zone.style.width = `${width}px`;
        zone.style.height = `${height}px`;
        zone.style.borderRadius =
          '3px';
        zone.style.background =
          orderBlockColor(
            block,
            block.status ===
              'ACTIVE'
              ? 0.14
              : 0.07,
          );
        zone.style.border =
          `1px solid ${orderBlockColor(
            block,
            block.status ===
              'ACTIVE'
              ? 0.78
              : 0.36,
          )}`;
        zone.style.boxSizing =
          'border-box';

        const label =
          document.createElement('span');

        label.textContent =
          orderBlockLabel(block);
        label.style.position =
          'absolute';
        label.style.left = '5px';
        label.style.top = '2px';
        label.style.padding =
          '1px 4px';
        label.style.borderRadius =
          '4px';
        label.style.background =
          'rgba(7, 16, 31, 0.82)';
        label.style.color =
          block.direction ===
          'BULLISH'
            ? '#6ee7b7'
            : '#fda4af';
        label.style.fontSize = '9px';
        label.style.fontWeight =
          '700';
        label.style.whiteSpace =
          'nowrap';

        zone.appendChild(label);
        orderBlockOverlay.appendChild(
          zone,
        );
      }

      for (const gap of visibleFairValueGaps) {
        const startX =
          chart
            .timeScale()
            .timeToCoordinate(
              toTimestamp(gap.startTime),
            );

        const endX =
          chart
            .timeScale()
            .timeToCoordinate(
              toTimestamp(lastCandle.time),
            );

        const highY =
          candleSeries.priceToCoordinate(
            gap.high,
          );

        const lowY =
          candleSeries.priceToCoordinate(
            gap.low,
          );

        if (
          startX === null ||
          endX === null ||
          highY === null ||
          lowY === null
        ) {
          continue;
        }

        const zone =
          document.createElement('div');

        zone.style.position = 'absolute';
        zone.style.left = `${Math.min(
          startX,
          endX,
        )}px`;
        zone.style.top = `${Math.min(
          highY,
          lowY,
        )}px`;
        zone.style.width = `${Math.max(
          18,
          Math.abs(endX - startX),
        )}px`;
        zone.style.height = `${Math.max(
          4,
          Math.abs(lowY - highY),
        )}px`;
        zone.style.borderRadius = '3px';
        zone.style.boxSizing = 'border-box';
        zone.style.background =
          fairValueGapColor(
            gap,
            gap.status === 'OPEN'
              ? 0.12
              : 0.06,
          );
        zone.style.border =
          `1px dashed ${fairValueGapColor(
            gap,
            gap.status === 'OPEN'
              ? 0.75
              : 0.35,
          )}`;

        const label =
          document.createElement('span');

        label.textContent =
          fairValueGapLabel(gap);
        label.style.position = 'absolute';
        label.style.left = '5px';
        label.style.top = '2px';
        label.style.padding = '1px 4px';
        label.style.borderRadius = '4px';
        label.style.background =
          'rgba(7, 16, 31, 0.82)';
        label.style.color =
          gap.direction === 'BULLISH'
            ? '#7dd3fc'
            : '#d8b4fe';
        label.style.fontSize = '9px';
        label.style.fontWeight = '700';
        label.style.whiteSpace = 'nowrap';

        zone.appendChild(label);
        orderBlockOverlay.appendChild(zone);
      }
    };

    const handleVisibleRangeChange =
      () => {
        renderOrderBlockZones();
      };

    chart
      .timeScale()
      .subscribeVisibleLogicalRangeChange(
        handleVisibleRangeChange,
      );

    requestAnimationFrame(
      renderOrderBlockZones,
    );

    const resizeObserver =
      new ResizeObserver((entries) => {
        const entry = entries[0];

        if (!entry) return;

        chart.applyOptions({
          width:
            entry.contentRect.width,
        });

        requestAnimationFrame(
          renderOrderBlockZones,
        );
      });

    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();

      chart
        .timeScale()
        .unsubscribeVisibleLogicalRangeChange(
          handleVisibleRangeChange,
        );

      orderBlockOverlay.remove();
      chart.remove();
    };
  }, [
    asset,
    candles,
    result.entry,
    result.stop,
    result.target,
  ]);

  const marketStructure =
    analyzeMarketStructure(candles);

  const orderBlockAnalysis =
    analyzeOrderBlocks(candles);

  const fairValueGapAnalysis =
    analyzeFairValueGaps(candles);

  const liquiditySweepAnalysis =
    analyzeLiquiditySweeps(candles);

  const fibonacciAnalysis =
    analyzeFibonacci(candles);

  const structureTrend =
    marketStructure.trend === 'BULLISH'
      ? {
          label: 'Estrutura de alta',
          className: 'text-bull-400',
        }
      : marketStructure.trend === 'BEARISH'
        ? {
            label: 'Estrutura de baixa',
            className: 'text-bear-400',
          }
        : {
            label: 'Estrutura lateral',
            className: 'text-wait-400',
          };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#07101f]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] px-3.5 py-3">
        <div className="flex items-center gap-2">
          <CandlestickChart className="h-4 w-4 text-accent-400" />

          <div>
            <div className="text-xs font-bold text-white">
              Gráfico de mercado
            </div>

            <div className="text-[10px] text-slate-600">
              Candles, SMC, OB, FVG, Liquidity Sweep e Fibonacci
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-[10px] font-semibold">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-0.5 w-4 rounded-full bg-sky-400" />
            EMA 9
          </span>

          <span className="flex items-center gap-1.5 text-slate-400">
            <span className="h-0.5 w-4 rounded-full bg-amber-500" />
            EMA 21
          </span>

          <span
            className={`flex items-center gap-1.5 ${structureTrend.className}`}
          >
            {structureTrend.label}
          </span>
        </div>
      </div>

      <div
        ref={containerRef}
        className="h-[390px] w-full"
      />

      <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] bg-ink-950/40 px-3.5 py-3 sm:grid-cols-4">
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
                  orderBlockAnalysis
                    .nearestBullish.midpoint,
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
                  orderBlockAnalysis
                    .nearestBearish.midpoint,
                )
              : '—'
          }
          tone="bear"
        />

        <MiniStat
          label="Maior força"
          value={`${
            [
              ...orderBlockAnalysis.bullish,
              ...orderBlockAnalysis.bearish,
            ].reduce(
              (maximum, block) =>
                Math.max(
                  maximum,
                  block.strength,
                ),
              0,
            )
          }`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] bg-ink-950/40 px-3.5 py-3 sm:grid-cols-4">
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
                  fairValueGapAnalysis
                    .nearestBullish.midpoint,
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
                  fairValueGapAnalysis
                    .nearestBearish.midpoint,
                )
              : '—'
          }
          tone="bear"
        />

        <MiniStat
          label="Maior FVG"
          value={`${fairValueGapAnalysis.gaps.reduce(
            (maximum, gap) =>
              Math.max(maximum, gap.strength),
            0,
          )}`}
        />
      </div>


      <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] bg-ink-950/40 px-3.5 py-3 sm:grid-cols-4">
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
                  liquiditySweepAnalysis
                    .nearestBullish.sweptLevel,
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
                  liquiditySweepAnalysis
                    .nearestBearish.sweptLevel,
                )
              : '—'
          }
          tone="bear"
        />

        <MiniStat
          label="Maior sweep"
          value={`${liquiditySweepAnalysis.sweeps.reduce(
            (maximum, sweep) =>
              Math.max(maximum, sweep.strength),
            0,
          )}`}
        />
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-white/[0.06] bg-ink-950/40 px-3.5 py-3 sm:grid-cols-4">
        <MiniStat
          label="Fib direção"
          value={
            fibonacciAnalysis
              ? fibonacciAnalysis.direction === 'BULLISH'
                ? 'ALTA'
                : 'BAIXA'
              : '—'
          }
          tone={
            fibonacciAnalysis
              ? fibonacciAnalysis.direction === 'BULLISH'
                ? 'bull'
                : 'bear'
              : 'wait'
          }
        />

        <MiniStat
          label="Nível próximo"
          value={
            fibonacciAnalysis?.nearestLevel?.label ?? '—'
          }
        />

        <MiniStat
          label="Preço Fib"
          value={
            fibonacciAnalysis?.nearestLevel
              ? formatPrice(
                  asset,
                  fibonacciAnalysis.nearestLevel.price,
                )
              : '—'
          }
        />

        <MiniStat
          label="Amplitude"
          value={
            fibonacciAnalysis
              ? formatPrice(asset, fibonacciAnalysis.range)
              : '—'
          }
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-3.5 py-2.5">
        <div className="flex items-center gap-3 text-[10px]">
          <span className="text-accent-400">
            Entrada
          </span>

          <span className="text-bear-400">
            Stop
          </span>

          <span className="text-bull-400">
            Alvo
          </span>

          <span className="text-emerald-400">
            BOS alta
          </span>

          <span className="text-red-400">
            BOS baixa
          </span>

          <span className="text-cyan-400">
            CHOCH alta
          </span>

          <span className="text-purple-400">
            CHOCH baixa
          </span>

          <span className="text-emerald-300">
            OB compra
          </span>

          <span className="text-rose-300">
            OB venda
          </span>


          <span className="text-sky-300">
            FVG compra
          </span>

          <span className="text-purple-300">
            FVG venda
          </span>


          <span className="text-teal-300">
            Sweep compra
          </span>

          <span className="text-rose-300">
            Sweep venda
          </span>


          <span className="text-amber-300">
            Fibonacci
          </span>
        </div>

        <p className="text-[9px] text-slate-700">
          Gráfico criado com Lightweight
          Charts™ da TradingView
        </p>
      </div>
    </div>
  );
}

export default function AnalysisScreen({
  initialAsset,
  onGoToAI,
  onGoToEngine,
}: AnalysisScreenProps) {
  const provider =
    getMarketDataProvider();

  const { addHistory } = useStore();

  const [asset, setAsset] =
    useState<Asset>(initialAsset);

  const [timeframe, setTimeframe] =
    useState<Timeframe>('5m');

  const [result, setResult] =
    useState<AnalysisResult | null>(
      null,
    );

  const [candles, setCandles] =
    useState<Candle[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);

    try {
      const [
        nextResult,
        nextCandles,
      ] = await Promise.all([
        provider.analyze(
          asset,
          timeframe,
        ),

        provider.getCandles(
          asset,
          timeframe,
          120,
        ),
      ]);

      setResult(nextResult);
      setCandles(nextCandles);
      addHistory(nextResult);
    } catch (caughtError) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível analisar o mercado.',
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, timeframe]);

  const finalSignal =
    result?.finalSignal ?? 'WAIT';

  const signalCfg =
    finalSignal === 'BUY'
      ? {
          label: 'COMPRA',
          text: 'text-bull-400',
          bg: 'from-bull-500/20 to-bull-600/5',
          ring: 'ring-bull-500/40',
          Icon: ArrowUpCircle,
        }
      : finalSignal === 'SELL'
        ? {
            label: 'VENDA',
            text: 'text-bear-400',
            bg: 'from-bear-500/20 to-bear-600/5',
            ring: 'ring-bear-500/40',
            Icon: ArrowDownCircle,
          }
        : {
            label: 'AGUARDAR',
            text: 'text-wait-400',
            bg: 'from-wait-500/15 to-wait-600/5',
            ring: 'ring-wait-500/30',
            Icon: CircleDot,
          };

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">
          Análise
        </h2>

        <p className="text-xs text-slate-500">
          Gráfico, indicadores técnicos e
          sinal final
        </p>
      </section>

      <section className="animate-fade-up space-y-4">
        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Ativo
          </label>

          <div className="grid grid-cols-2 gap-2">
            {ASSET_LIST.map((item) => {
              const Icon =
                ASSET_ICON[item.code];

              const isActive =
                asset === item.code;

              return (
                <button
                  key={item.code}
                  onClick={() =>
                    setAsset(item.code)
                  }
                  className={`group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                    isActive
                      ? 'border-accent-500/60 bg-accent-500/10 shadow-lg shadow-accent-500/10'
                      : 'border-white/[0.06] bg-ink-850/60 hover:border-white/[0.12] hover:bg-ink-800'
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                      isActive
                        ? 'bg-accent-500/20 text-accent-300'
                        : 'bg-ink-800 text-slate-500'
                    }`}
                  >
                    <Icon
                      className="h-4.5 w-4.5"
                      strokeWidth={2.2}
                    />
                  </span>

                  <span className="min-w-0">
                    <span
                      className={`block text-sm font-bold leading-tight ${
                        isActive
                          ? 'text-white'
                          : 'text-slate-300'
                      }`}
                    >
                      {item.code}
                    </span>

                    <span className="block truncate text-[11px] text-slate-500">
                      {item.name}
                    </span>
                  </span>

                  {isActive && (
                    <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-accent-400 shadow-[0_0_8px] shadow-accent-400" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Timeframe
          </label>

          <div className="grid grid-cols-4 gap-1.5 rounded-xl border border-white/[0.06] bg-ink-850/60 p-1.5">
            {TIMEFRAMES.map((item) => {
              const isActive =
                timeframe === item.value;

              return (
                <button
                  key={item.value}
                  onClick={() =>
                    setTimeframe(
                      item.value,
                    )
                  }
                  className={`rounded-lg px-2 py-2.5 text-center text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-accent-500 text-white shadow-lg shadow-accent-500/20'
                      : 'text-slate-400 hover:bg-ink-800 hover:text-slate-200'
                  }`}
                >
                  {item.value}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {error && (
        <section className="rounded-xl border border-bear-500/30 bg-bear-500/10 p-4 text-sm text-bear-300">
          {error}
        </section>
      )}

      {!result && loading ? (
        <div className="card flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <RefreshCw className="h-4 w-4 animate-spin-slow" />
          Analisando...
        </div>
      ) : result ? (
        <>
          <section className="animate-fade-up">
            <MarketChart
              asset={asset}
              candles={candles}
              result={result}
            />
          </section>

          <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MiniStat
              label="Estrutura SMC"
              value={
                analyzeMarketStructure(candles).trend ===
                'BULLISH'
                  ? 'ALTA'
                  : analyzeMarketStructure(candles).trend ===
                      'BEARISH'
                    ? 'BAIXA'
                    : 'LATERAL'
              }
              tone={
                analyzeMarketStructure(candles).trend ===
                'BULLISH'
                  ? 'bull'
                  : analyzeMarketStructure(candles).trend ===
                      'BEARISH'
                    ? 'bear'
                    : 'wait'
              }
            />

            <MiniStat
              label="BOS / CHOCH"
              value={`${analyzeMarketStructure(candles).events.length}`}
            />

            <MiniStat
              label="Suportes"
              value={`${analyzeMarketStructure(candles).supports.length}`}
              tone="bull"
            />

            <MiniStat
              label="Resistências"
              value={`${analyzeMarketStructure(candles).resistances.length}`}
              tone="bear"
            />
          </section>

          <section className="card animate-fade-up p-4 sm:p-5">
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:justify-between">
              <ScoreGauge
                score={result.score}
                label="Score"
              />

              <div className="w-full flex-1 space-y-3">
                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                      Confiança
                    </span>

                    <span className="font-mono text-sm font-bold tabular text-white">
                      {result.confidence}%
                    </span>
                  </div>

                  <ProgressBar
                    value={
                      result.confidence
                    }
                    tone="accent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <MiniStat
                    label="Tendência"
                    value={result.trend}
                    tone={
                      result.trend ===
                      'ALTA'
                        ? 'bull'
                        : result.trend ===
                            'BAIXA'
                          ? 'bear'
                          : 'wait'
                    }
                  />

                  <MiniStat
                    label="Probabilidade"
                    value={`${result.probability}%`}
                  />

                  <MiniStat
                    label="Preço"
                    value={formatPrice(
                      asset,
                      result.price,
                    )}
                  />
                </div>
              </div>
            </div>
          </section>

          <section className="animate-fade-up">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                Indicadores Técnicos
              </h3>

              <button
                onClick={() => void run()}
                disabled={loading}
                className="flex items-center gap-1 text-[11px] font-semibold text-accent-400 hover:text-accent-300 disabled:opacity-50"
              >
                <RefreshCw
                  className={`h-3 w-3 ${
                    loading
                      ? 'animate-spin-slow'
                      : ''
                  }`}
                />
                Atualizar
              </button>
            </div>

            <div className="grid gap-2.5">
              {result.indicators.map(
                (indicator, index) => {
                  const meta =
                    META_BY_KEY[
                      indicator.key
                    ];

                  const config =
                    indicator.signal ===
                    'BUY'
                      ? {
                          text: 'text-bull-400',
                          bg: 'bg-bull-500/10',
                          ring: 'ring-bull-500/30',
                          dot: 'bg-bull-500',
                          Icon: ArrowUpCircle,
                        }
                      : indicator.signal ===
                          'SELL'
                        ? {
                            text: 'text-bear-400',
                            bg: 'bg-bear-500/10',
                            ring: 'ring-bear-500/30',
                            dot: 'bg-bear-500',
                            Icon: ArrowDownCircle,
                          }
                        : {
                            text: 'text-wait-400',
                            bg: 'bg-wait-500/10',
                            ring: 'ring-wait-500/20',
                            dot: 'bg-wait-500',
                            Icon: CircleDot,
                          };

                  const bias =
                    indicator.strength -
                    50;

                  return (
                    <div
                      key={indicator.key}
                      className="group relative overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850/70 p-3.5 transition-all hover:border-white/[0.12]"
                      style={{
                        animation:
                          'fade-up 0.4s both',
                        animationDelay: `${index * 50}ms`,
                      }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex min-w-0 items-center gap-2">
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ink-800 text-[10px] font-bold text-slate-400">
                            {meta.abbr}
                          </span>

                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold text-white">
                              {meta.label}
                            </div>

                            <div className="truncate text-[10px] text-slate-500">
                              {
                                meta.description
                              }
                            </div>
                          </div>
                        </div>

                        <div className="shrink-0 text-right">
                          <div className="font-mono text-sm font-semibold tabular text-slate-200">
                            {
                              indicator.value
                            }
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-ink-800">
                          <div className="absolute inset-y-0 left-1/2 w-px bg-white/15" />

                          <div
                            className={`absolute inset-y-0 rounded-full transition-all duration-500 ${
                              bias >= 0
                                ? 'bg-bull-500'
                                : 'bg-bear-500'
                            }`}
                            style={{
                              width: `${Math.abs(
                                bias,
                              ) * 2}%`,
                              left:
                                bias >= 0
                                  ? '50%'
                                  : undefined,
                              right:
                                bias < 0
                                  ? '50%'
                                  : undefined,
                            }}
                          />
                        </div>

                        <div
                          className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 ring-1 ${config.bg} ${config.ring}`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${config.dot}`}
                          />

                          <config.Icon
                            className={`h-3.5 w-3.5 ${config.text}`}
                            strokeWidth={2.5}
                          />

                          <span
                            className={`text-[11px] font-bold ${config.text}`}
                          >
                            {signalLabel(
                              indicator.signal,
                            )}
                          </span>
                        </div>
                      </div>

                      <p className="mt-2 truncate text-[11px] text-slate-500">
                        {indicator.detail}
                      </p>
                    </div>
                  );
                },
              )}
            </div>
          </section>

          <section className="animate-fade-up">
            <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Sinal Final
            </h3>

            <div
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${signalCfg.bg} p-5 ring-1 ${signalCfg.ring}`}
            >
              <div className="absolute inset-0 grid-noise opacity-30" />

              <div className="relative flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <signalCfg.Icon
                    className={`h-10 w-10 ${signalCfg.text}`}
                    strokeWidth={2}
                  />

                  <div>
                    <div
                      className={`text-2xl font-extrabold tracking-tight ${signalCfg.text}`}
                    >
                      {signalCfg.label}
                    </div>

                    <div className="text-[11px] text-slate-400">
                      Score {result.score} ·
                      Confiança{' '}
                      {result.confidence}% ·{' '}
                      {result.timeframe}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-col gap-2">
                  <button
                    onClick={() =>
                      onGoToAI(asset)
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-accent-400" />
                    Ver IA
                  </button>

                  <button
                    onClick={() =>
                      onGoToEngine(asset)
                    }
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors hover:bg-white/10"
                  >
                    <Cpu className="h-3.5 w-3.5 text-accent-400" />
                    Engine
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-2">
              <LevelCard
                label="Entrada"
                value={formatPrice(
                  asset,
                  result.entry,
                )}
              />

              <LevelCard
                label="Stop"
                value={formatPrice(
                  asset,
                  result.stop,
                )}
                tone="bear"
              />

              <LevelCard
                label="Alvo"
                value={formatPrice(
                  asset,
                  result.target,
                )}
                tone="bull"
              />
            </div>

            <p className="mt-2 text-center text-[11px] text-slate-600 tabular">
              Atualizado em{' '}
              {formatDateTime(
                result.createdAt,
              )}{' '}
              · Dados simulados
            </p>
          </section>
        </>
      ) : null}
    </div>
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

function LevelCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'bull' | 'bear';
}) {
  return (
    <div className="card p-3 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-sm font-bold tabular ${
          tone === 'bull'
            ? 'text-bull-400'
            : tone === 'bear'
              ? 'text-bear-400'
              : 'text-slate-200'
        }`}
      >
        {value}
      </div>
    </div>
  );
}