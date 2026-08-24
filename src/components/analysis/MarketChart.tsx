import {
  useEffect,
  useMemo,
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
  AnalysisResult,
  Candle,
} from '@/types';

import {
  formatPrice,
} from '@/lib/assets';

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
  analyzeFibonacci,
} from '@/lib/fibonacci';

import {
  CandlestickChart,
  Eye,
  EyeOff,
} from 'lucide-react';


interface MarketChartProps {
  asset: Asset;
  candles: Candle[];
  result: AnalysisResult;
}


interface EmaPoint {
  time: UTCTimestamp;
  value: number;
}


interface ChartLayers {
  structure: boolean;
  levels: boolean;
  orderBlocks: boolean;
  fairValueGaps: boolean;
  sweeps: boolean;
  fibonacci: boolean;
}


const DEFAULT_LAYERS:
  ChartLayers = {
    structure: true,
    levels: false,
    orderBlocks: false,
    fairValueGaps: false,
    sweeps: false,
    fibonacci: false,
  };


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

  if (
    candles.length <
    period
  ) {
    return [];
  }


  const closes =
    candles.map(
      (candle) =>
        candle.close,
    );


  let ema =
    closes
      .slice(
        0,
        period,
      )
      .reduce(
        (
          total,
          value,
        ) =>
          total +
          value,
        0,
      ) /
    period;


  const multiplier =
    2 /
    (
      period +
      1
    );


  const output:
    EmaPoint[] = [
      {
        time:
          toTimestamp(
            candles[
              period - 1
            ].time,
          ),

        value:
          ema,
      },
    ];


  for (
    let index =
      period;

    index <
    closes.length;

    index += 1
  ) {
    ema =
      (
        closes[
          index
        ] -
        ema
      ) *
        multiplier +
      ema;


    output.push({
      time:
        toTimestamp(
          candles[
            index
          ].time,
        ),

      value:
        ema,
    });
  }


  return output;
}


export function MarketChart({
  asset,
  candles,
  result,
}: MarketChartProps) {

  const containerRef =
    useRef<
      HTMLDivElement |
      null
    >(null);


  const [
    layers,
    setLayers,
  ] =
    useState<
      ChartLayers
    >(
      DEFAULT_LAYERS,
    );


  const marketStructure =
    useMemo(
      () =>
        analyzeMarketStructure(
          candles,
        ),
      [candles],
    );


  const orderBlockAnalysis =
    useMemo(
      () =>
        analyzeOrderBlocks(
          candles,
        ),
      [candles],
    );


  const fairValueGapAnalysis =
    useMemo(
      () =>
        analyzeFairValueGaps(
          candles,
        ),
      [candles],
    );


  const liquiditySweepAnalysis =
    useMemo(
      () =>
        analyzeLiquiditySweeps(
          candles,
        ),
      [candles],
    );


  const fibonacciAnalysis =
    useMemo(
      () =>
        analyzeFibonacci(
          candles,
        ),
      [candles],
    );


  const riskPoints =
    Math.abs(
      result.entry -
      result.stop,
    );


  const rewardPoints =
    Math.abs(
      result.target -
      result.entry,
    );


  const riskReward =
    riskPoints > 0
      ? rewardPoints /
        riskPoints
      : 0;


  useEffect(
    () => {

      const container =
        containerRef.current;


      if (
        !container ||
        candles.length === 0
      ) {
        return;
      }


      const chart =
        createChart(
          container,
          {
            width:
              container.clientWidth,

            height: 520,

            layout: {
              background: {
                type:
                  ColorType.Solid,

                color:
                  '#07101f',
              },

              textColor:
                '#8290a6',

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
              mode:
                CrosshairMode.Normal,

              vertLine: {
                color:
                  'rgba(56, 189, 248, 0.38)',

                width: 1,

                style: 2,

                labelBackgroundColor:
                  '#0284c7',
              },

              horzLine: {
                color:
                  'rgba(56, 189, 248, 0.38)',

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
                top: 0.1,
                bottom: 0.1,
              },
            },

            timeScale: {
              borderColor:
                'rgba(148, 163, 184, 0.12)',

              timeVisible: true,

              secondsVisible:
                false,

              barSpacing: 15,

              minBarSpacing: 7,

              rightOffset: 5,
            },

            handleScroll: {
              mouseWheel:
                true,

              pressedMouseMove:
                true,

              horzTouchDrag:
                true,

              vertTouchDrag:
                false,
            },

            handleScale: {
              axisPressedMouseMove:
                true,

              mouseWheel:
                true,

              pinch:
                true,
            },

            localization: {
              priceFormatter:
                (
                  price:
                    number,
                ) =>
                  formatPrice(
                    asset,
                    price,
                  ),
            },
          },
        );


      const candleSeries =
        chart.addSeries(
          CandlestickSeries,
          {
            upColor:
              '#10b981',

            downColor:
              '#ef4444',

            borderUpColor:
              '#10b981',

            borderDownColor:
              '#ef4444',

            wickUpColor:
              '#34d399',

            wickDownColor:
              '#f87171',

            priceLineVisible:
              true,

            lastValueVisible:
              true,
          },
        );


      const ema9Series =
        chart.addSeries(
          LineSeries,
          {
            color:
              '#38bdf8',

            lineWidth: 2,

            title:
              'EMA 9',

            priceLineVisible:
              false,

            lastValueVisible:
              true,

            crosshairMarkerVisible:
              false,
          },
        );


      const ema21Series =
        chart.addSeries(
          LineSeries,
          {
            color:
              '#f59e0b',

            lineWidth: 2,

            title:
              'EMA 21',

            priceLineVisible:
              false,

            lastValueVisible:
              true,

            crosshairMarkerVisible:
              false,
          },
        );


      const candleData:
        CandlestickData[] =
          candles.map(
            (
              candle,
            ) => ({
              time:
                toTimestamp(
                  candle.time,
                ),

              open:
                candle.open,

              high:
                candle.high,

              low:
                candle.low,

              close:
                candle.close,
            }),
          );


      candleSeries.setData(
        candleData,
      );


      const ema9Data:
        LineData[] =
          calculateEmaSeries(
            candles,
            9,
          ).map(
            (
              point,
            ) => ({
              time:
                point.time,

              value:
                point.value,
            }),
          );


      const ema21Data:
        LineData[] =
          calculateEmaSeries(
            candles,
            21,
          ).map(
            (
              point,
            ) => ({
              time:
                point.time,

              value:
                point.value,
            }),
          );


      ema9Series.setData(
        ema9Data,
      );


      ema21Series.setData(
        ema21Data,
      );


      const markers:
        Array<any> = [];


      if (
        layers.structure
      ) {
        marketStructure
          .events
          .slice(-6)
          .forEach(
            (
              event,
            ) => {

              const bullish =
                event.type ===
                  'BOS_BULL' ||
                event.type ===
                  'CHOCH_BULL';


              const choch =
                event.type ===
                  'CHOCH_BULL' ||
                event.type ===
                  'CHOCH_BEAR';


              markers.push({
                time:
                  toTimestamp(
                    event.time,
                  ),

                position:
                  bullish
                    ? 'belowBar'
                    : 'aboveBar',

                color:
                  bullish
                    ? '#10b981'
                    : '#ef4444',

                shape:
                  bullish
                    ? 'arrowUp'
                    : 'arrowDown',

                text:
                  choch
                    ? bullish
                      ? 'CHOCH↑'
                      : 'CHOCH↓'
                    : bullish
                      ? 'BOS↑'
                      : 'BOS↓',
              });
            },
          );
      }


      if (
        layers.orderBlocks
      ) {
        [
          ...orderBlockAnalysis
            .bullish,

          ...orderBlockAnalysis
            .bearish,
        ]
          .filter(
            (
              block,
            ) =>
              block.status !==
              'INVALIDATED',
          )
          .slice(-4)
          .forEach(
            (
              block,
            ) => {

              const bullish =
                block.direction ===
                'BULLISH';


              markers.push({
                time:
                  toTimestamp(
                    block
                      .confirmationTime,
                  ),

                position:
                  bullish
                    ? 'belowBar'
                    : 'aboveBar',

                color:
                  bullish
                    ? '#34d399'
                    : '#fb7185',

                shape:
                  bullish
                    ? 'arrowUp'
                    : 'arrowDown',

                text:
                  bullish
                    ? 'OB↑'
                    : 'OB↓',
              });
            },
          );
      }


      if (
        layers.fairValueGaps
      ) {
        fairValueGapAnalysis
          .gaps
          .filter(
            (
              gap,
            ) =>
              gap.status ===
                'OPEN' ||
              gap.status ===
                'PARTIAL',
          )
          .slice(-4)
          .forEach(
            (
              gap,
            ) => {

              const bullish =
                gap.direction ===
                'BULLISH';


              markers.push({
                time:
                  toTimestamp(
                    gap.confirmationTime,
                  ),

                position:
                  bullish
                    ? 'belowBar'
                    : 'aboveBar',

                color:
                  bullish
                    ? '#38bdf8'
                    : '#c084fc',

                shape:
                  bullish
                    ? 'arrowUp'
                    : 'arrowDown',

                text:
                  bullish
                    ? 'FVG↑'
                    : 'FVG↓',
              });
            },
          );
      }


      if (
        layers.sweeps
      ) {
        liquiditySweepAnalysis
          .sweeps
          .slice(-4)
          .forEach(
            (
              sweep,
            ) => {

              const bullish =
                sweep.direction ===
                'BULLISH';


              markers.push({
                time:
                  toTimestamp(
                    sweep.time,
                  ),

                position:
                  bullish
                    ? 'belowBar'
                    : 'aboveBar',

                color:
                  bullish
                    ? '#2dd4bf'
                    : '#f43f5e',

                shape:
                  bullish
                    ? 'arrowUp'
                    : 'arrowDown',

                text:
                  bullish
                    ? 'SW↑'
                    : 'SW↓',
              });
            },
          );
      }


      createSeriesMarkers(
        candleSeries,
        markers.sort(
          (
            first,
            second,
          ) =>
            Number(
              first.time,
            ) -
            Number(
              second.time,
            ),
        ),
      );


      if (
        layers.levels
      ) {
        marketStructure
          .supports
          .slice(
            0,
            2,
          )
          .forEach(
            (
              level,
              index,
            ) => {
              candleSeries
                .createPriceLine({
                  price:
                    level.price,

                  color:
                    '#22c55e',

                  lineWidth: 1,

                  lineStyle: 3,

                  axisLabelVisible:
                    index === 0,

                  title:
                    index === 0
                      ? 'Suporte'
                      : '',
                });
            },
          );


        marketStructure
          .resistances
          .slice(
            0,
            2,
          )
          .forEach(
            (
              level,
              index,
            ) => {
              candleSeries
                .createPriceLine({
                  price:
                    level.price,

                  color:
                    '#f97316',

                  lineWidth: 1,

                  lineStyle: 3,

                  axisLabelVisible:
                    index === 0,

                  title:
                    index === 0
                      ? 'Resistência'
                      : '',
                });
            },
          );
      }


      if (
        layers.fibonacci &&
        fibonacciAnalysis
      ) {
        const lastClose =
          candles[
            candles.length - 1
          ]?.close ??
          0;


        [...fibonacciAnalysis
          .levels]
          .filter(
            (
              level,
            ) =>
              level.label !==
                '0%' &&
              level.label !==
                '100%',
          )
          .sort(
            (
              first,
              second,
            ) =>
              Math.abs(
                first.price -
                lastClose,
              ) -
              Math.abs(
                second.price -
                lastClose,
              ),
          )
          .slice(
            0,
            3,
          )
          .forEach(
            (
              level,
            ) => {
              candleSeries
                .createPriceLine({
                  price:
                    level.price,

                  color:
                    '#a78bfa',

                  lineWidth: 1,

                  lineStyle: 3,

                  axisLabelVisible:
                    true,

                  title:
                    `Fib ${level.label}`,
                });
            },
          );
      }


      candleSeries
        .createPriceLine({
          price:
            result.entry,

          color:
            '#38bdf8',

          lineWidth: 2,

          lineStyle: 2,

          axisLabelVisible:
            true,

          title:
            'Entrada',
        });


      candleSeries
        .createPriceLine({
          price:
            result.stop,

          color:
            '#ef4444',

          lineWidth: 2,

          lineStyle: 2,

          axisLabelVisible:
            true,

          title:
            'Stop',
        });


      candleSeries
        .createPriceLine({
          price:
            result.target,

          color:
            '#10b981',

          lineWidth: 2,

          lineStyle: 2,

          axisLabelVisible:
            true,

          title:
            'Alvo',
        });


      /**
       * Foco parecido com plataforma profissional:
       * mostra apenas os candles recentes.
       *
       * Assim eles ficam grandes e fáceis de ler.
       */
      const visibleBars =
        Math.min(
          55,
          candles.length,
        );


      chart
        .timeScale()
        .setVisibleLogicalRange({
          from:
            Math.max(
              0,
              candles.length -
              visibleBars,
            ) -
            1,

          to:
            candles.length +
            4,
        });


      const resizeObserver =
        new ResizeObserver(
          (
            entries,
          ) => {

            const entry =
              entries[
                0
              ];


            if (!entry) {
              return;
            }


            chart.applyOptions({
              width:
                entry
                  .contentRect
                  .width,
            });
          },
        );


      resizeObserver
        .observe(
          container,
        );


      return () => {
        resizeObserver
          .disconnect();

        chart.remove();
      };
    },
    [
      asset,
      candles,
      result.entry,
      result.stop,
      result.target,
      layers,
      marketStructure,
      orderBlockAnalysis,
      fairValueGapAnalysis,
      liquiditySweepAnalysis,
      fibonacciAnalysis,
    ],
  );


  const structureTrend =
    marketStructure
      .trend ===
      'BULLISH'
      ? {
          label:
            'Estrutura de alta',

          className:
            'text-bull-400',
        }
      : marketStructure
          .trend ===
          'BEARISH'
        ? {
            label:
              'Estrutura de baixa',

            className:
              'text-bear-400',
          }
        : {
            label:
              'Estrutura lateral',

            className:
              'text-wait-400',
          };


  function toggleLayer(
    layer:
      keyof ChartLayers,
  ) {
    setLayers(
      (
        current,
      ) => ({
        ...current,

        [layer]:
          !current[
            layer
          ],
      }),
    );
  }


  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[#07101f]">

      <div className="border-b border-white/[0.06] px-4 py-4">

        <div className="flex flex-wrap items-center justify-between gap-3">

          <div className="flex items-center gap-2.5">

            <CandlestickChart className="h-5 w-5 text-accent-400" />

            <div>
              <div className="text-sm font-bold text-white">
                Gráfico de mercado
              </div>

              <div className="text-[10px] text-slate-500">
                WDO real • 5m • EMA 9 • EMA 21
              </div>
            </div>

          </div>


          <div className="flex flex-wrap items-center gap-4 text-[10px] font-semibold">

            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-0.5 w-4 rounded bg-sky-400" />
              EMA 9
            </span>


            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="h-0.5 w-4 rounded bg-amber-500" />
              EMA 21
            </span>


            <span
              className={
                structureTrend
                  .className
              }
            >
              {
                structureTrend
                  .label
              }
            </span>

          </div>

        </div>


        <div className="mt-4 flex flex-wrap gap-2">

          <LayerButton
            active={
              layers.structure
            }
            label="Estrutura"
            onClick={
              () =>
                toggleLayer(
                  'structure',
                )
            }
          />

          <LayerButton
            active={
              layers.levels
            }
            label="S/R"
            onClick={
              () =>
                toggleLayer(
                  'levels',
                )
            }
          />

          <LayerButton
            active={
              layers.orderBlocks
            }
            label="OB"
            onClick={
              () =>
                toggleLayer(
                  'orderBlocks',
                )
            }
          />

          <LayerButton
            active={
              layers.fairValueGaps
            }
            label="FVG"
            onClick={
              () =>
                toggleLayer(
                  'fairValueGaps',
                )
            }
          />

          <LayerButton
            active={
              layers.sweeps
            }
            label="Sweep"
            onClick={
              () =>
                toggleLayer(
                  'sweeps',
                )
            }
          />

          <LayerButton
            active={
              layers.fibonacci
            }
            label="Fibonacci"
            onClick={
              () =>
                toggleLayer(
                  'fibonacci',
                )
            }
          />

        </div>

      </div>


      <div
        ref={
          containerRef
        }
        className="h-[520px] w-full"
      />


      <div className="grid grid-cols-3 border-t border-white/[0.06] bg-ink-950/40 sm:grid-cols-6">

        <TradeStat
          label="Entrada"
          value={
            formatPrice(
              asset,
              result.entry,
            )
          }
          tone="accent"
        />

        <TradeStat
          label="Stop"
          value={
            formatPrice(
              asset,
              result.stop,
            )
          }
          tone="bear"
        />

        <TradeStat
          label="Alvo"
          value={
            formatPrice(
              asset,
              result.target,
            )
          }
          tone="bull"
        />

        <TradeStat
          label="Risco"
          value={`${formatPrice(
            asset,
            riskPoints,
          )} pts`}
          tone="bear"
        />

        <TradeStat
          label="Retorno"
          value={`${formatPrice(
            asset,
            rewardPoints,
          )} pts`}
          tone="bull"
        />

        <TradeStat
          label="R/R"
          value={
            riskReward.toFixed(
              2,
            )
          }
        />

      </div>


      <div className="grid grid-cols-2 border-t border-white/[0.06] bg-ink-950/25 sm:grid-cols-6">

        <TradeStat
          label="Candles"
          value={`${candles.length}`}
        />

        <TradeStat
          label="OB ativos"
          value={`${orderBlockAnalysis.active.length}`}
          tone="bull"
        />

        <TradeStat
          label="FVG abertos"
          value={`${fairValueGapAnalysis.open.length}`}
          tone="bull"
        />

        <TradeStat
          label="Sweeps"
          value={`${liquiditySweepAnalysis.confirmed.length}`}
        />

        <TradeStat
          label="Fib próximo"
          value={
            fibonacciAnalysis
              ?.nearestLevel
              ?.label ??
            '—'
          }
        />

        <TradeStat
          label="Estrutura"
          value={
            marketStructure
              .trend ===
              'BULLISH'
              ? 'ALTA'
              : marketStructure
                    .trend ===
                  'BEARISH'
                ? 'BAIXA'
                : 'LATERAL'
          }
          tone={
            marketStructure
              .trend ===
              'BULLISH'
              ? 'bull'
              : marketStructure
                    .trend ===
                  'BEARISH'
                ? 'bear'
                : undefined
          }
        />

      </div>


      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] px-4 py-3">

        <p className="text-[10px] text-slate-500">
          Arraste o gráfico • scroll para zoom • eixo direito para escala
        </p>

        <p className="text-[9px] text-slate-700">
          Lightweight Charts™
        </p>

      </div>

    </div>
  );
}


function LayerButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {

  return (
    <button
      type="button"
      onClick={
        onClick
      }
      className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[10px] font-bold transition ${
        active
          ? 'border-sky-400/40 bg-sky-500/10 text-sky-300'
          : 'border-white/[0.07] bg-white/[0.025] text-slate-500 hover:bg-white/[0.05]'
      }`}
    >

      {active ? (
        <Eye className="h-3 w-3" />
      ) : (
        <EyeOff className="h-3 w-3" />
      )}

      {label}

    </button>
  );
}


function TradeStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?:
    | 'bull'
    | 'bear'
    | 'accent';
}) {

  return (
    <div className="border-r border-white/[0.05] px-3 py-3 text-center">

      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-xs font-bold ${
          tone === 'bull'
            ? 'text-emerald-400'
            : tone === 'bear'
              ? 'text-red-400'
              : tone === 'accent'
                ? 'text-sky-400'
                : 'text-slate-200'
        }`}
      >
        {value}
      </div>

    </div>
  );
}