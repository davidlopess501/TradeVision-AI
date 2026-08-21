import { useEffect, useMemo, useState } from 'react';

import type {
  Asset,
  Timeframe,
  AnalysisResult,
  Candle,
} from '@/types';

import { getMarketDataProvider } from '@/services/types';

import {
  evaluateAnalysis,
} from '@/services/decisionEngine';

import {
  buildHistoricalAnalysis,
} from '@/services/historicalAnalysisBuilder';

import {
  prepareOrder,
} from '@/services/orderManager';

import {
  DEFAULT_RISK_RULES,
  evaluateOrderRisk,
} from '@/services/riskManager';

import {
  runBacktestV2,
} from '@/services/backtestV2Runner';

import type {
  BacktestResult,
} from '@/services/backtestEngine';

import {
  WIN_15M_REAL_CANDLES,
} from '@/data/win15mReal';

import {
  WIN_15M_OUT_OF_SAMPLE_CANDLES,
} from '@/data/win15mOutOfSample';

import {
  WDO_15M_REAL_CANDLES,
} from '@/data/wdo15mReal';

import {
  buildOosMonitorSnapshot,
  printOosMonitor,
} from '@/services/oosMonitor';

import {
  connectBroker,
  getBrokerAccount,
  getBrokerStatus,
  sendBrokerOrder,
  validateBrokerOrder,
} from '@/services/brokerManager';

import type {
  BrokerAccount,
  BrokerOrderResponse,
  BrokerStatus,
} from '@/services/brokerConnector';

import {
  addDemoOrderHistory,
  clearDemoOrderHistory,
  getDemoOrderHistory,
  type DemoOrderHistoryItem,
} from '@/services/demoOrderHistory';

import { useStore } from '@/store';
import { formatPrice } from '@/lib/assets';
import { analyzeFibonacci } from '@/lib/fibonacci';

import {
  analyzeMultipleTimeframes,
  type MultiTimeframeAnalysis,
} from '@/lib/multiTimeframe';

import {
  analyzeInstitutionalAI,
  type InstitutionalAnalysis,
} from '@/lib/institutionalAI';

import {
  buildInstitutionalNarrative,
} from '@/lib/institutionalNarrative';

import { RefreshCw } from 'lucide-react';

import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { ProgressBar } from '@/components/ui/ProgressBar';

import { AssetSelector } from '@/components/analysis/AssetSelector';
import { TimeframeSelector } from '@/components/analysis/TimeframeSelector';
import { MarketChart } from '@/components/analysis/MarketChart';
import { IndicatorCards } from '@/components/analysis/IndicatorCards';
import { SignalPanel } from '@/components/analysis/SignalPanel';
import { SmartMoneyPanel } from '@/components/analysis/SmartMoneyPanel';
import { FibonacciPanel } from '@/components/analysis/FibonacciPanel';
import { MultiTimeframePanel } from '@/components/analysis/MultiTimeframePanel';
import { InstitutionalPanel } from '@/components/analysis/InstitutionalPanel';
import {
  DecisionEnginePanel,
} from '@/components/analysis/DecisionEnginePanel';
import {
  BrokerPanel,
} from '@/components/analysis/BrokerPanel';

import {
  DemoOrderHistoryPanel,
} from '@/components/analysis/DemoOrderHistoryPanel';

import {
  RiskManagerPanel,
} from '@/components/analysis/RiskManagerPanel';

import {
  BacktestPanel,
} from '@/components/backtest/BacktestPanel';

interface AnalysisScreenProps {
  initialAsset: Asset;
  onGoToAI: (asset: Asset) => void;
  onGoToEngine: (asset: Asset) => void;
}

type BrokerActionState =
  | 'IDLE'
  | 'CONNECTING'
  | 'VALIDATING'
  | 'SENDING';

interface BrokerFeedback {
  tone: 'neutral' | 'success' | 'error';
  message: string;
}

export default function AnalysisScreen({
  initialAsset,
  onGoToAI,
  onGoToEngine,
}: AnalysisScreenProps) {
  const provider = getMarketDataProvider();
  const { addHistory } = useStore();

  const [asset, setAsset] =
    useState<Asset>(initialAsset);

  const [timeframe, setTimeframe] =
    useState<Timeframe>('5m');

  const [result, setResult] =
    useState<AnalysisResult | null>(null);

  const [candles, setCandles] =
    useState<Candle[]>([]);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [multiTimeframe, setMultiTimeframe] =
    useState<MultiTimeframeAnalysis | null>(null);

  const [multiTimeframeLoading, setMultiTimeframeLoading] =
    useState(false);

  const [multiTimeframeError, setMultiTimeframeError] =
    useState<string | null>(null);

  const [institutionalAnalysis, setInstitutionalAnalysis] =
    useState<InstitutionalAnalysis | null>(null);

  const [brokerStatus, setBrokerStatus] =
    useState<BrokerStatus>(
      getBrokerStatus(),
    );

  const [brokerAccount, setBrokerAccount] =
    useState<BrokerAccount | null>(null);

  const [brokerActionState, setBrokerActionState] =
    useState<BrokerActionState>('IDLE');

  const [brokerFeedback, setBrokerFeedback] =
    useState<BrokerFeedback>({
      tone: 'neutral',
      message:
        'Conecte a conta demo para validar e simular o envio da ordem.',
    });

  const [lastBrokerOrder, setLastBrokerOrder] =
    useState<BrokerOrderResponse | null>(null);

  const [demoOrderHistory, setDemoOrderHistory] =
    useState<DemoOrderHistoryItem[]>(
      () => getDemoOrderHistory(),
    );

  const [backtestResult, setBacktestResult] =
    useState<BacktestResult | null>(null);

  const [backtestLoading, setBacktestLoading] =
    useState(false);

  const fibonacciAnalysis = useMemo(
    () => analyzeFibonacci(candles),
    [candles],
  );

  const institutionalNarrative = useMemo(() => {
    if (
      !result ||
      !institutionalAnalysis ||
      candles.length === 0
    ) {
      return null;
    }

    return buildInstitutionalNarrative({
      asset,
      result,
      candles,
      institutional: institutionalAnalysis,
      multiTimeframe,
    });
  }, [
    asset,
    result,
    candles,
    institutionalAnalysis,
    multiTimeframe,
  ]);

  const decision = useMemo(() => {
    if (!result) {
      return null;
    }

    return evaluateAnalysis(result);
  }, [result]);

  const preparedOrder = useMemo(() => {
    if (!result || !decision) {
      return null;
    }

    return prepareOrder(
      result,
      decision,
    );
  }, [result, decision]);

  const riskEvaluation = useMemo(() => {
    if (!preparedOrder) {
      return null;
    }

    return evaluateOrderRisk(
      preparedOrder,
      DEFAULT_RISK_RULES,
      {
        dailyPnl: 0,
        openPositions: 0,
      },
    );
  }, [preparedOrder]);

  async function run() {
    setLoading(true);
    setError(null);

    try {
      const [nextResult, nextCandles] =
        await Promise.all([
          provider.analyze(
            asset,
            timeframe,
          ),
          provider.getCandles(
            asset,
            timeframe,
            30000,
          ),
        ]);

      setResult(nextResult);
      setCandles(nextCandles);
      setBacktestResult(null);
      addHistory(nextResult);
      setLastBrokerOrder(null);
      setBrokerFeedback({
        tone: 'neutral',
        message:
          'Nova análise concluída. Valide novamente a ordem antes de simular o envio.',
      });
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

  async function runMultiTimeframe() {
    setMultiTimeframeLoading(true);
    setMultiTimeframeError(null);

    try {
      const nextAnalysis =
        await analyzeMultipleTimeframes(asset);

      setMultiTimeframe(nextAnalysis);
    } catch (caughtError) {
      setMultiTimeframeError(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível analisar os múltiplos timeframes.',
      );
    } finally {
      setMultiTimeframeLoading(false);
    }
  }

  async function handleConnectBroker() {
    setBrokerActionState('CONNECTING');
    setBrokerFeedback({
      tone: 'neutral',
      message:
        'Conectando à conta demo...',
    });

    try {
      const nextStatus =
        await connectBroker();

      const nextAccount =
        await getBrokerAccount();

      setBrokerStatus(nextStatus);
      setBrokerAccount(nextAccount);
      setBrokerFeedback({
        tone:
          nextStatus.connectionStatus === 'CONNECTED'
            ? 'success'
            : 'error',
        message: nextStatus.message,
      });
    } catch (caughtError) {
      setBrokerFeedback({
        tone: 'error',
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Não foi possível conectar à conta demo.',
      });
    } finally {
      setBrokerActionState('IDLE');
    }
  }

  async function handleValidateOrder() {
    if (!preparedOrder) {
      setBrokerFeedback({
        tone: 'error',
        message:
          'Nenhuma ordem foi preparada.',
      });
      return;
    }

    setBrokerActionState('VALIDATING');

    try {
      const validation =
        await validateBrokerOrder(
          preparedOrder,
        );

      setBrokerFeedback({
        tone: validation.valid
          ? 'success'
          : 'error',
        message: validation.message,
      });
    } catch (caughtError) {
      setBrokerFeedback({
        tone: 'error',
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Não foi possível validar a ordem.',
      });
    } finally {
      setBrokerActionState('IDLE');
    }
  }

  async function handleSendDemoOrder() {
    if (
      !preparedOrder ||
      preparedOrder.status !== 'READY' ||
      !preparedOrder.side
    ) {
      setBrokerFeedback({
        tone: 'error',
        message:
          'A ordem está bloqueada e não pode ser enviada.',
      });
      return;
    }

    if (
      !riskEvaluation ||
      riskEvaluation.decision !== 'APPROVED' ||
      riskEvaluation.quantity < 1
    ) {
      setBrokerFeedback({
        tone: 'error',
        message:
          riskEvaluation?.reason ??
          'A ordem não foi aprovada pelo Risk Manager.',
      });
      return;
    }

    setBrokerActionState('SENDING');

    try {
      const validation =
        await validateBrokerOrder(
          preparedOrder,
        );

      if (!validation.valid) {
        setBrokerFeedback({
          tone: 'error',
          message: validation.message,
        });
        return;
      }

      const request = {
        clientOrderId:
          preparedOrder.id,
        asset:
          preparedOrder.asset,
        side:
          preparedOrder.side,
        quantity: riskEvaluation.quantity,
        entry:
          preparedOrder.entry,
        stop:
          preparedOrder.stop,
        target:
          preparedOrder.target,
      };

      const response =
        await sendBrokerOrder(request);

      setLastBrokerOrder(response);

      if (response.status === 'ACCEPTED') {
        addDemoOrderHistory(
          request,
          response,
        );

        setDemoOrderHistory(
          getDemoOrderHistory(),
        );
      }

      setBrokerFeedback({
        tone:
          response.status === 'ACCEPTED'
            ? 'success'
            : 'error',
        message: response.message,
      });
    } catch (caughtError) {
      setBrokerFeedback({
        tone: 'error',
        message:
          caughtError instanceof Error
            ? caughtError.message
            : 'Não foi possível enviar a ordem demo.',
      });
    } finally {
      setBrokerActionState('IDLE');
    }
  }

  async function handleRunBacktest() {
    const costScenarios = {
      ZERO: {
        slippageTicksPerSide: 0,
        fixedCostPerContractRoundTrip: 0,
      },
      LEVE: {
        slippageTicksPerSide: 1,
        fixedCostPerContractRoundTrip: 0.5,
      },
      MODERADO: {
        slippageTicksPerSide: 2,
        fixedCostPerContractRoundTrip: 1,
      },
    } as const;

    const isRealWin15m =
      asset === 'WIN' &&
      timeframe === '15m';

    if (isRealWin15m) {
      const realCandles =
        WIN_15M_REAL_CANDLES;

      /*
       * WALK-FORWARD REAL
       *
       * Dividimos o histórico real em janelas cronológicas
       * consecutivas, sem sobreposição.
       *
       * A estratégia NÃO é recalibrada entre as janelas.
       * O objetivo é apenas medir estabilidade temporal.
       */
      const windowSize = 500;

      if (realCandles.length < windowSize * 3) {
        console.warn(
          `[TradeVision] Walk-forward real requer pelo menos ${
            windowSize * 3
          } candles. Recebidos: ${realCandles.length}.`,
        );
        return;
      }

      setBacktestLoading(true);

      try {
        const windows: Candle[][] = [];

        for (
          let startIndex = 0;
          startIndex < realCandles.length;
          startIndex += windowSize
        ) {
          const windowCandles =
            realCandles.slice(
              startIndex,
              Math.min(
                startIndex + windowSize,
                realCandles.length,
              ),
            );

          if (windowCandles.length >= 360) {
            windows.push(
              windowCandles,
            );
          }
        }

        console.group(
          '[TradeVision] WIN 15m REAL — WALK-FORWARD + STRESS TEST DE CUSTOS',
        );

        console.log(
          '[TradeVision] Fonte',
          {
            asset: 'WIN',
            timeframe: '15m',
            source:
              'Toro Trader — OHLC real',
            totalCandles:
              realCandles.length,
            windowSize,
            validWindows:
              windows.length,
            volume:
              'INDISPONÍVEL — mantido neutro, sem dados inventados',
          },
        );

        console.log(
          '[TradeVision] Janelas',
          Object.fromEntries(
            windows.map(
              (
                windowCandles,
                windowIndex,
              ) => [
                `W${windowIndex + 1}`,
                {
                  candles:
                    windowCandles.length,
                  from:
                    windowCandles[0]?.time,
                  to:
                    windowCandles[
                      windowCandles.length - 1
                    ]?.time,
                },
              ],
            ),
          ),
        );

        async function runRealWindow(
          windowCandles: Candle[],
          executionCosts: (typeof costScenarios)[keyof typeof costScenarios],
        ) {
          return runBacktestV2({
            asset: 'WIN',
            timeframe: '15m',
            initialCapital: 10000,
            candles: windowCandles,
            strategyMode: 'BUY_ONLY',
            executionCosts,
          });
        }

        const rows:
          Record<
            string,
            {
              trades: number;
              winRate: number;
              netProfit: number;
              profitFactor: number;
              maxDrawdown: number;
            }
          > = {};

        const moderateResults:
          BacktestResult[] = [];

        for (
          let windowIndex = 0;
          windowIndex < windows.length;
          windowIndex += 1
        ) {
          const windowCandles =
            windows[windowIndex];

          const [
            zero,
            light,
            moderate,
          ] = await Promise.all([
            runRealWindow(
              windowCandles,
              costScenarios.ZERO,
            ),
            runRealWindow(
              windowCandles,
              costScenarios.LEVE,
            ),
            runRealWindow(
              windowCandles,
              costScenarios.MODERADO,
            ),
          ]);

          moderateResults.push(
            moderate,
          );

          const row = (
            result: BacktestResult,
          ) => ({
            trades:
              result.totalTrades,
            winRate:
              result.winRate,
            netProfit:
              result.netProfit,
            profitFactor:
              result.profitFactor,
            maxDrawdown:
              result.maxDrawdown,
          });

          rows[
            `W${windowIndex + 1} — ZERO`
          ] = row(zero);

          rows[
            `W${windowIndex + 1} — LEVE`
          ] = row(light);

          rows[
            `W${windowIndex + 1} — MODERADO`
          ] = row(moderate);
        }

        console.table(
          rows,
        );

        const positiveModerate =
          moderateResults.filter(
            (result) =>
              result.netProfit > 0,
          );

        const negativeModerate =
          moderateResults.filter(
            (result) =>
              result.netProfit < 0,
          );

        const flatModerate =
          moderateResults.filter(
            (result) =>
              result.netProfit === 0,
          );

        const totalModerateProfit =
          moderateResults.reduce(
            (
              total,
              result,
            ) =>
              total +
              result.netProfit,
            0,
          );

        const totalModerateTrades =
          moderateResults.reduce(
            (
              total,
              result,
            ) =>
              total +
              result.totalTrades,
            0,
          );

        const bestWindow =
          moderateResults.reduce(
            (
              best,
              result,
              index,
            ) => {
              if (
                !best ||
                result.netProfit >
                  best.result.netProfit
              ) {
                return {
                  index,
                  result,
                };
              }

              return best;
            },
            null as
              | {
                  index: number;
                  result: BacktestResult;
                }
              | null,
          );

        const worstWindow =
          moderateResults.reduce(
            (
              worst,
              result,
              index,
            ) => {
              if (
                !worst ||
                result.netProfit <
                  worst.result.netProfit
              ) {
                return {
                  index,
                  result,
                };
              }

              return worst;
            },
            null as
              | {
                  index: number;
                  result: BacktestResult;
                }
              | null,
          );

        const worstDrawdown =
          moderateResults.reduce(
            (
              max,
              result,
            ) =>
              Math.max(
                max,
                result.maxDrawdown,
              ),
            0,
          );

        const positiveRate =
          moderateResults.length > 0
            ? (
                positiveModerate.length /
                moderateResults.length
              ) * 100
            : 0;

        console.table({
          'WALK-FORWARD MODERADO': {
            windows:
              moderateResults.length,
            positiveWindows:
              positiveModerate.length,
            negativeWindows:
              negativeModerate.length,
            flatWindows:
              flatModerate.length,
            positiveRate,
            totalTrades:
              totalModerateTrades,
            totalNetProfit:
              totalModerateProfit,
            worstDrawdown,
            bestWindow:
              bestWindow
                ? `W${bestWindow.index + 1}`
                : '—',
            bestNetProfit:
              bestWindow?.result
                .netProfit ?? 0,
            worstWindow:
              worstWindow
                ? `W${worstWindow.index + 1}`
                : '—',
            worstNetProfit:
              worstWindow?.result
                .netProfit ?? 0,
          },
        });

        console.groupEnd();

        /*
         * DIAGNÓSTICO FINAL LIMPO
         *
         * O walk-forward acima continua sendo executado normalmente,
         * mas limpamos o console antes da execução final para evitar
         * dezenas de diagnósticos repetidos.
         *
         * Em seguida rodamos UMA vez todo o histórico real do WIN 15m
         * com custos MODERADOS. O backtestV2Runner imprime os diagnósticos
         * BUY (score/confidence, indicadores e momentum) somente desta
         * execução final.
         */
        console.clear();

        console.group(
          '[TradeVision] WIN15 REAL BUY DIAGNOSTIC FINAL',
        );

        console.log(
          '[TradeVision] IMPORTANTE — os diagnósticos BUY abaixo pertencem ao histórico real completo, cenário MODERADO.',
        );

        const fullHistoryModerate =
          await runBacktestV2({
            asset: 'WIN',
            timeframe: '15m',
            initialCapital: 10000,
            candles: realCandles,
            strategyMode: 'BUY_ONLY',
            executionCosts:
              costScenarios.MODERADO,
          });

        console.table({
          'WIN15 REAL — MODERADO': {
            candles:
              realCandles.length,
            trades:
              fullHistoryModerate.totalTrades,
            winRate:
              fullHistoryModerate.winRate,
            netProfit:
              fullHistoryModerate.netProfit,
            profitFactor:
              fullHistoryModerate.profitFactor,
            maxDrawdown:
              fullHistoryModerate.maxDrawdown,
          },
        });

        console.log(
          '[TradeVision] WALK-FORWARD MODERADO — RESUMO FINAL',
          {
            windows:
              moderateResults.length,
            positiveWindows:
              positiveModerate.length,
            negativeWindows:
              negativeModerate.length,
            flatWindows:
              flatModerate.length,
            positiveRate,
            totalTrades:
              totalModerateTrades,
            totalNetProfit:
              totalModerateProfit,
            worstDrawdown,
            bestWindow:
              bestWindow
                ? `W${bestWindow.index + 1}`
                : '—',
            bestNetProfit:
              bestWindow?.result
                .netProfit ?? 0,
            worstWindow:
              worstWindow
                ? `W${worstWindow.index + 1}`
                : '—',
            worstNetProfit:
              worstWindow?.result
                .netProfit ?? 0,
          },
        );

        console.log(
          '[TradeVision] FIM WIN15 REAL BUY DIAGNOSTIC FINAL',
        );

        console.groupEnd();

        /*
         * OUT-OF-SAMPLE 01 — teste cego.
         *
         * Dataset: somente candles posteriores à base usada
         * para descobrir o filtro.
         *
         * Regra congelada:
         * RSI-strength >= 54 + Momentum10 >= 0.5%.
         */
        const oosCandles =
          WIN_15M_OUT_OF_SAMPLE_CANDLES;

        const oosResult =
          await runBacktestV2({
            asset: 'WIN',
            timeframe: '15m',
            initialCapital: 10000,
            candles: oosCandles,
            strategyMode: 'BUY_ONLY',
            executionCosts:
              costScenarios.MODERADO,
            frozenBuyFilter:
              'RSI_STRENGTH_54_M10_05',
          });

        console.group(
          '[TradeVision] OUT-OF-SAMPLE 01 — RESULTADO CEGO',
        );

        console.table({
          'WIN15 OOS 01 — FILTRO CONGELADO': {
            candles:
              oosCandles.length,
            trades:
              oosResult.totalTrades,
            winRate:
              oosResult.winRate,
            netProfit:
              oosResult.netProfit,
            profitFactor:
              oosResult.profitFactor,
            maxDrawdown:
              oosResult.maxDrawdown,
          },
        });

        console.log(
          '[TradeVision] OUT-OF-SAMPLE 01 — REGRA',
          'RSI-strength >= 54 + Momentum10 >= 0.5%',
        );

        console.log(
          '[TradeVision] OUT-OF-SAMPLE 01 — OBSERVAÇÃO',
          'Amostra curta: 206 candles. Resultado não deve ser usado isoladamente para aprovar/reprovar a estratégia.',
        );

        console.groupEnd();

        const oosMonitorSnapshot =
          buildOosMonitorSnapshot({
            candles:
              oosCandles.length,
            result:
              oosResult,
          });

        printOosMonitor(
          oosMonitorSnapshot,
        );

        /*
         * O painel mostra o resultado do teste cego OOS 01.
         */
        setBacktestResult(
          oosResult,
        );
      } finally {
        setBacktestLoading(false);
      }

      return;
    }

    /*
     * WDO 5M BASE V1
     *
     * Estratégia totalmente congelada: nenhum filtro do WDO 15m é aplicado.
     * Usa os candles já carregados pelo provider para o timeframe de 5 minutos.
     * Objetivo: medir a base BUY x SELL com uma amostra maior e walk-forward.
     */
    const isWdo5mBaseV1 =
      asset === 'WDO' &&
      timeframe === '5m';

    if (isWdo5mBaseV1) {
      /*
       * O provider já solicita até 30.000 candles em run().
       * Limitamos o laboratório aos 12.000 candles mais recentes para
       * manter o teste leve no navegador sem perder uma amostra ampla.
       */
      const MAX_WDO5_CANDLES = 12000;
      const testCandles =
        candles.length > MAX_WDO5_CANDLES
          ? candles.slice(-MAX_WDO5_CANDLES)
          : candles;

      const windowSize = 2000;
      const minimumWindowCandles = 1200;

      if (testCandles.length < windowSize * 3) {
        console.warn(
          `[TradeVision] WDO 5m BASE V1 requer pelo menos ${
            windowSize * 3
          } candles. Recebidos: ${testCandles.length}. Rode/atualize a análise do WDO 5m primeiro.`,
        );
        return;
      }

      setBacktestLoading(true);

      try {
        const windows: Candle[][] = [];

        for (
          let startIndex = 0;
          startIndex < testCandles.length;
          startIndex += windowSize
        ) {
          const windowCandles =
            testCandles.slice(
              startIndex,
              Math.min(
                startIndex + windowSize,
                testCandles.length,
              ),
            );

          if (
            windowCandles.length >=
            minimumWindowCandles
          ) {
            windows.push(windowCandles);
          }
        }

        const moderateCosts =
          costScenarios.MODERADO;

        /*
         * WDO 5M BUY_ONLY LAB V2 — DIAGNÓSTICO DO FUNIL
         *
         * Não altera nenhuma regra da estratégia. Apenas mede onde os
         * candles do WDO 5m deixam de avançar no pipeline:
         * sinal -> decisão -> ordem -> risco.
         */
        const diagnosticWindowSize = 120;

        const buyDiagnostic = {
          windowsEvaluated: 0,
          finalSignalBuy: 0,
          finalSignalSell: 0,
          finalSignalWait: 0,
          decisionBuy: 0,
          decisionSell: 0,
          decisionWait: 0,
          buyOrdersReady: 0,
          sellOrdersReady: 0,
          ordersBlocked: 0,
          buyRiskApproved: 0,
          sellRiskApproved: 0,
          riskBlocked: 0,
          scoreMin: Number.POSITIVE_INFINITY,
          scoreMax: Number.NEGATIVE_INFINITY,
          scoreTotal: 0,
          confidenceMin: Number.POSITIVE_INFINITY,
          confidenceMax: Number.NEGATIVE_INFINITY,
          confidenceTotal: 0,
        };

        /*
         * WDO 5M BUY — DECISION ENGINE DIAGNOSTIC V3
         *
         * Congelado / observacional:
         * - não altera thresholds;
         * - não altera stop/target;
         * - não altera risco;
         * - mede somente os sinais BUY e o motivo pelo qual viram BUY ou WAIT.
         */
        const buyDecisionV3 = {
          buySignals: 0,
          approvedBuy: 0,
          rejectedBuy: 0,

          trendAlta: 0,
          trendLateral: 0,
          trendBaixa: 0,

          scoreBelow65: 0,
          scoreAtLeast65: 0,
          confidenceBelow65: 0,
          confidenceAtLeast65: 0,

          score60To64: 0,
          score55To59: 0,
          scoreBelow55: 0,

          confidence60To64: 0,
          confidence55To59: 0,
          confidenceBelow55: 0,

          trendOkScoreOkConfidenceOk: 0,
          trendFailOnly: 0,
          scoreFailOnly: 0,
          confidenceFailOnly: 0,
          multipleFails: 0,

          reasons: {} as Record<string, number>,

          rejectedScoreMin: Number.POSITIVE_INFINITY,
          rejectedScoreMax: Number.NEGATIVE_INFINITY,
          rejectedScoreTotal: 0,

          rejectedConfidenceMin: Number.POSITIVE_INFINITY,
          rejectedConfidenceMax: Number.NEGATIVE_INFINITY,
          rejectedConfidenceTotal: 0,
        };

        for (
          let diagnosticIndex = diagnosticWindowSize;
          diagnosticIndex < testCandles.length - 1;
          diagnosticIndex += 1
        ) {
          const historicalCandles = testCandles.slice(
            diagnosticIndex - diagnosticWindowSize,
            diagnosticIndex + 1,
          );

          const historicalAnalysis = buildHistoricalAnalysis(
            'WDO',
            '5m',
            historicalCandles,
          );

          const historicalDecision = evaluateAnalysis(
            historicalAnalysis,
          );

          buyDiagnostic.windowsEvaluated += 1;
          buyDiagnostic.scoreMin = Math.min(
            buyDiagnostic.scoreMin,
            historicalAnalysis.score,
          );
          buyDiagnostic.scoreMax = Math.max(
            buyDiagnostic.scoreMax,
            historicalAnalysis.score,
          );
          buyDiagnostic.scoreTotal += historicalAnalysis.score;
          buyDiagnostic.confidenceMin = Math.min(
            buyDiagnostic.confidenceMin,
            historicalDecision.confidence,
          );
          buyDiagnostic.confidenceMax = Math.max(
            buyDiagnostic.confidenceMax,
            historicalDecision.confidence,
          );
          buyDiagnostic.confidenceTotal +=
            historicalDecision.confidence;

          if (historicalAnalysis.finalSignal === 'BUY') {
            buyDecisionV3.buySignals += 1;

            const trendOk =
              historicalAnalysis.trend === 'ALTA';
            const scoreOk =
              historicalAnalysis.score >= 65;
            const confidenceOk =
              historicalDecision.confidence >= 65;

            if (historicalAnalysis.trend === 'ALTA') {
              buyDecisionV3.trendAlta += 1;
            } else if (
              historicalAnalysis.trend === 'BAIXA'
            ) {
              buyDecisionV3.trendBaixa += 1;
            } else {
              buyDecisionV3.trendLateral += 1;
            }

            if (scoreOk) {
              buyDecisionV3.scoreAtLeast65 += 1;
            } else {
              buyDecisionV3.scoreBelow65 += 1;

              if (historicalAnalysis.score >= 60) {
                buyDecisionV3.score60To64 += 1;
              } else if (
                historicalAnalysis.score >= 55
              ) {
                buyDecisionV3.score55To59 += 1;
              } else {
                buyDecisionV3.scoreBelow55 += 1;
              }
            }

            if (confidenceOk) {
              buyDecisionV3.confidenceAtLeast65 += 1;
            } else {
              buyDecisionV3.confidenceBelow65 += 1;

              if (
                historicalDecision.confidence >= 60
              ) {
                buyDecisionV3.confidence60To64 += 1;
              } else if (
                historicalDecision.confidence >= 55
              ) {
                buyDecisionV3.confidence55To59 += 1;
              } else {
                buyDecisionV3.confidenceBelow55 += 1;
              }
            }

            if (
              trendOk &&
              scoreOk &&
              confidenceOk
            ) {
              buyDecisionV3
                .trendOkScoreOkConfidenceOk += 1;
            } else {
              const failedCriteria =
                Number(!trendOk) +
                Number(!scoreOk) +
                Number(!confidenceOk);

              if (failedCriteria > 1) {
                buyDecisionV3.multipleFails += 1;
              } else if (!trendOk) {
                buyDecisionV3.trendFailOnly += 1;
              } else if (!scoreOk) {
                buyDecisionV3.scoreFailOnly += 1;
              } else if (!confidenceOk) {
                buyDecisionV3.confidenceFailOnly += 1;
              }
            }

            if (historicalDecision.action === 'BUY') {
              buyDecisionV3.approvedBuy += 1;
            } else {
              buyDecisionV3.rejectedBuy += 1;

              buyDecisionV3.reasons[
                historicalDecision.reason
              ] =
                (buyDecisionV3.reasons[
                  historicalDecision.reason
                ] ?? 0) + 1;

              buyDecisionV3.rejectedScoreMin =
                Math.min(
                  buyDecisionV3.rejectedScoreMin,
                  historicalAnalysis.score,
                );

              buyDecisionV3.rejectedScoreMax =
                Math.max(
                  buyDecisionV3.rejectedScoreMax,
                  historicalAnalysis.score,
                );

              buyDecisionV3.rejectedScoreTotal +=
                historicalAnalysis.score;

              buyDecisionV3.rejectedConfidenceMin =
                Math.min(
                  buyDecisionV3.rejectedConfidenceMin,
                  historicalDecision.confidence,
                );

              buyDecisionV3.rejectedConfidenceMax =
                Math.max(
                  buyDecisionV3.rejectedConfidenceMax,
                  historicalDecision.confidence,
                );

              buyDecisionV3.rejectedConfidenceTotal +=
                historicalDecision.confidence;
            }
          }

          if (historicalAnalysis.finalSignal === 'BUY') {
            buyDiagnostic.finalSignalBuy += 1;
          } else if (historicalAnalysis.finalSignal === 'SELL') {
            buyDiagnostic.finalSignalSell += 1;
          } else {
            buyDiagnostic.finalSignalWait += 1;
          }

          if (historicalDecision.action === 'BUY') {
            buyDiagnostic.decisionBuy += 1;
          } else if (historicalDecision.action === 'SELL') {
            buyDiagnostic.decisionSell += 1;
          } else {
            buyDiagnostic.decisionWait += 1;
          }

          const diagnosticOrder = prepareOrder(
            historicalAnalysis,
            historicalDecision,
          );

          if (
            diagnosticOrder.status !== 'READY' ||
            !diagnosticOrder.side
          ) {
            buyDiagnostic.ordersBlocked += 1;
            continue;
          }

          if (diagnosticOrder.side === 'BUY') {
            buyDiagnostic.buyOrdersReady += 1;
          } else {
            buyDiagnostic.sellOrdersReady += 1;
          }

          const diagnosticRisk = evaluateOrderRisk(
            diagnosticOrder,
            DEFAULT_RISK_RULES,
            { dailyPnl: 0, openPositions: 0 },
          );

          if (
            diagnosticRisk.decision !== 'APPROVED' ||
            diagnosticRisk.quantity < 1
          ) {
            buyDiagnostic.riskBlocked += 1;
            continue;
          }

          if (diagnosticOrder.side === 'BUY') {
            buyDiagnostic.buyRiskApproved += 1;
          } else {
            buyDiagnostic.sellRiskApproved += 1;
          }
        }

        const diagnosticDivisor =
          buyDiagnostic.windowsEvaluated > 0
            ? buyDiagnostic.windowsEvaluated
            : 1;

        const buyFunnelSummary = {
          candlesTestados: testCandles.length,
          windowsEvaluated: buyDiagnostic.windowsEvaluated,
          finalSignalBuy: buyDiagnostic.finalSignalBuy,
          decisionBuy: buyDiagnostic.decisionBuy,
          buyOrdersReady: buyDiagnostic.buyOrdersReady,
          buyRiskApproved: buyDiagnostic.buyRiskApproved,
          backtestBuyTrades: 0,
          signalToDecisionRetentionPct:
            buyDiagnostic.finalSignalBuy > 0
              ? (buyDiagnostic.decisionBuy /
                  buyDiagnostic.finalSignalBuy) *
                100
              : 0,
          decisionToOrderRetentionPct:
            buyDiagnostic.decisionBuy > 0
              ? (buyDiagnostic.buyOrdersReady /
                  buyDiagnostic.decisionBuy) *
                100
              : 0,
          orderToRiskRetentionPct:
            buyDiagnostic.buyOrdersReady > 0
              ? (buyDiagnostic.buyRiskApproved /
                  buyDiagnostic.buyOrdersReady) *
                100
              : 0,
          minScore: Number.isFinite(buyDiagnostic.scoreMin)
            ? buyDiagnostic.scoreMin
            : 0,
          avgScore:
            buyDiagnostic.scoreTotal / diagnosticDivisor,
          maxScore: Number.isFinite(buyDiagnostic.scoreMax)
            ? buyDiagnostic.scoreMax
            : 0,
          minConfidence: Number.isFinite(
            buyDiagnostic.confidenceMin,
          )
            ? buyDiagnostic.confidenceMin
            : 0,
          avgConfidence:
            buyDiagnostic.confidenceTotal / diagnosticDivisor,
          maxConfidence: Number.isFinite(
            buyDiagnostic.confidenceMax,
          )
            ? buyDiagnostic.confidenceMax
            : 0,
        };

        const [
          buyFull,
          buyScore60Full,
          sellFull,
        ] = await Promise.all([
          runBacktestV2({
            asset: 'WDO',
            timeframe: '5m',
            initialCapital: 10000,
            candles: testCandles,
            strategyMode: 'BUY_ONLY',
            executionCosts: moderateCosts,
          }),
          runBacktestV2({
            asset: 'WDO',
            timeframe: '5m',
            initialCapital: 10000,
            candles: testCandles,
            strategyMode: 'BUY_ONLY',
            executionCosts: moderateCosts,
            buyScoreThreshold: 60,
          }),
          runBacktestV2({
            asset: 'WDO',
            timeframe: '5m',
            initialCapital: 10000,
            candles: testCandles,
            strategyMode: 'SELL_ONLY',
            executionCosts: moderateCosts,
          }),
        ]);

        const row = (
          result: BacktestResult,
        ) => ({
          trades: result.totalTrades,
          winRate: result.winRate,
          netProfit: result.netProfit,
          profitFactor: result.profitFactor,
          maxDrawdown: result.maxDrawdown,
        });

        const buyWindows: BacktestResult[] = [];
        const buyScore60Windows: BacktestResult[] = [];
        const sellWindows: BacktestResult[] = [];

        for (const windowCandles of windows) {
          const [
            buy,
            buyScore60,
            sell,
          ] = await Promise.all([
            runBacktestV2({
              asset: 'WDO',
              timeframe: '5m',
              initialCapital: 10000,
              candles: windowCandles,
              strategyMode: 'BUY_ONLY',
              executionCosts: moderateCosts,
            }),
            runBacktestV2({
              asset: 'WDO',
              timeframe: '5m',
              initialCapital: 10000,
              candles: windowCandles,
              strategyMode: 'BUY_ONLY',
              executionCosts: moderateCosts,
              buyScoreThreshold: 60,
            }),
            runBacktestV2({
              asset: 'WDO',
              timeframe: '5m',
              initialCapital: 10000,
              candles: windowCandles,
              strategyMode: 'SELL_ONLY',
              executionCosts: moderateCosts,
            }),
          ]);

          buyWindows.push(buy);
          buyScore60Windows.push(buyScore60);
          sellWindows.push(sell);
        }

        const summarize = (
          results: BacktestResult[],
        ) => {
          const positiveWindows =
            results.filter(
              (result) => result.netProfit > 0,
            ).length;

          const negativeWindows =
            results.filter(
              (result) => result.netProfit < 0,
            ).length;

          return {
            windows: results.length,
            positiveWindows,
            negativeWindows,
            positiveRate:
              results.length > 0
                ? (positiveWindows /
                    results.length) *
                  100
                : 0,
            totalTrades:
              results.reduce(
                (total, result) =>
                  total + result.totalTrades,
                0,
              ),
            totalNetProfit:
              results.reduce(
                (total, result) =>
                  total + result.netProfit,
                0,
              ),
            worstDrawdown:
              results.reduce(
                (max, result) =>
                  Math.max(
                    max,
                    result.maxDrawdown,
                  ),
                0,
              ),
          };
        };

        const buyWalkForward =
          summarize(buyWindows);
        const buyScore60WalkForward =
          summarize(buyScore60Windows);
        const sellWalkForward =
          summarize(sellWindows);

        /*
         * Critério congelado da BASE V1.
         * Não otimiza parâmetros; apenas decide se cada lado merece
         * avançar para um laboratório específico de 5m.
         */
        const minimumTrades = 50;
        const minimumProfitFactor = 1.05;
        const minimumPositiveWindowRate = 50;

        const evaluateBase = (
          full: BacktestResult,
          walkForward: ReturnType<
            typeof summarize
          >,
        ) => {
          const enoughTrades =
            full.totalTrades >= minimumTrades;
          const profitable =
            full.netProfit > 0;
          const pfOk =
            full.profitFactor >=
            minimumProfitFactor;
          const walkForwardOk =
            walkForward.windows >= 3 &&
            walkForward.positiveRate >=
              minimumPositiveWindowRate;

          const approved =
            enoughTrades &&
            profitable &&
            pfOk &&
            walkForwardOk;

          return {
            trades: full.totalTrades,
            winRate: full.winRate,
            netProfit: full.netProfit,
            profitFactor:
              full.profitFactor,
            maxDrawdown:
              full.maxDrawdown,
            walkForwardWindows:
              walkForward.windows,
            walkForwardPositiveWindows:
              walkForward.positiveWindows,
            walkForwardPositiveRate:
              walkForward.positiveRate,
            walkForwardTotalTrades:
              walkForward.totalTrades,
            enoughTrades,
            profitable,
            pfOk,
            walkForwardOk,
            approved,
          };
        };

        const buyVerdict =
          evaluateBase(
            buyFull,
            buyWalkForward,
          );

        const buyScore60Verdict =
          evaluateBase(
            buyScore60Full,
            buyScore60WalkForward,
          );

        buyFunnelSummary.backtestBuyTrades =
          buyFull.totalTrades;
        const sellVerdict =
          evaluateBase(
            sellFull,
            sellWalkForward,
          );

        const finalDecision =
          buyVerdict.approved &&
          sellVerdict.approved
            ? 'BUY E SELL — BASE PROMISSORA PARA LAB 5M'
            : buyVerdict.approved
              ? 'BUY — BASE PROMISSORA PARA LAB 5M'
              : sellVerdict.approved
                ? 'SELL — BASE PROMISSORA PARA LAB 5M'
                : 'BASE NÃO APROVADA — NÃO OTIMIZAR AINDA';

        console.clear();
        console.group(
          '[TradeVision] WDO 5M BASE V1 — BUY × SELL',
        );

        console.log(
          '[TradeVision] WDO 5M BASE V1 — FONTE',
          {
            asset: 'WDO',
            timeframe: '5m',
            source:
              'Market Data Provider — candles carregados na tela',
            candlesDisponiveis:
              candles.length,
            candlesTestados:
              testCandles.length,
            executionCosts:
              'MODERADO',
            strategy:
              'CONGELADA — sem filtros experimentais do 15m',
            windowSize,
            validWindows:
              windows.length,
          },
        );

        console.table({
          'WDO5 BUY_ONLY — BASE':
            row(buyFull),
          'WDO5 SELL_ONLY — BASE':
            row(sellFull),
        });

        console.log(
          '[TradeVision] WDO5 WALK-FORWARD BUY',
          buyWalkForward,
        );

        console.log(
          '[TradeVision] WDO5 WALK-FORWARD SELL',
          sellWalkForward,
        );

        console.table(
          Object.fromEntries(
            windows.flatMap(
              (_, index) => [
                [
                  `W${index + 1} — BUY`,
                  row(buyWindows[index]),
                ],
                [
                  `W${index + 1} — SELL`,
                  row(sellWindows[index]),
                ],
              ],
            ),
          ),
        );

        console.log(
          '[TradeVision] WDO 5M BUY_ONLY LAB V2 — FUNIL',
          buyFunnelSummary,
        );

        console.table({
          'WDO5 BUY — FUNIL': {
            sinaisBuy: buyDiagnostic.finalSignalBuy,
            decisoesBuy: buyDiagnostic.decisionBuy,
            ordensBuyReady: buyDiagnostic.buyOrdersReady,
            riscoBuyAprovado: buyDiagnostic.buyRiskApproved,
            tradesExecutados: buyFull.totalTrades,
          },
        });

        console.log(
          '[TradeVision] WDO 5M BUY_ONLY LAB V2 — CONTEXTO GERAL',
          {
            finalSignalWait: buyDiagnostic.finalSignalWait,
            finalSignalSell: buyDiagnostic.finalSignalSell,
            decisionWait: buyDiagnostic.decisionWait,
            decisionSell: buyDiagnostic.decisionSell,
            ordersBlocked: buyDiagnostic.ordersBlocked,
            riskBlocked: buyDiagnostic.riskBlocked,
          },
        );

        const rejectedBuyDivisor =
          buyDecisionV3.rejectedBuy > 0
            ? buyDecisionV3.rejectedBuy
            : 1;

        const buyDecisionV3Summary = {
          sinaisBuy: buyDecisionV3.buySignals,
          aprovadosBuy: buyDecisionV3.approvedBuy,
          rejeitadosBuy: buyDecisionV3.rejectedBuy,
          taxaAprovacaoPct:
            buyDecisionV3.buySignals > 0
              ? (buyDecisionV3.approvedBuy /
                  buyDecisionV3.buySignals) *
                100
              : 0,

          tendenciaAlta: buyDecisionV3.trendAlta,
          tendenciaLateral:
            buyDecisionV3.trendLateral,
          tendenciaBaixa: buyDecisionV3.trendBaixa,

          scoreAbaixo65:
            buyDecisionV3.scoreBelow65,
          scorePeloMenos65:
            buyDecisionV3.scoreAtLeast65,
          confidenceAbaixo65:
            buyDecisionV3.confidenceBelow65,
          confidencePeloMenos65:
            buyDecisionV3.confidenceAtLeast65,

          score60a64: buyDecisionV3.score60To64,
          score55a59: buyDecisionV3.score55To59,
          scoreAbaixo55:
            buyDecisionV3.scoreBelow55,

          confidence60a64:
            buyDecisionV3.confidence60To64,
          confidence55a59:
            buyDecisionV3.confidence55To59,
          confidenceAbaixo55:
            buyDecisionV3.confidenceBelow55,

          todosCriteriosOk:
            buyDecisionV3
              .trendOkScoreOkConfidenceOk,
          falhouSoTendencia:
            buyDecisionV3.trendFailOnly,
          falhouSoScore:
            buyDecisionV3.scoreFailOnly,
          falhouSoConfidence:
            buyDecisionV3.confidenceFailOnly,
          falhouMultiplos:
            buyDecisionV3.multipleFails,

          rejeitadosScoreMin:
            Number.isFinite(
              buyDecisionV3.rejectedScoreMin,
            )
              ? buyDecisionV3.rejectedScoreMin
              : 0,
          rejeitadosScoreMedio:
            buyDecisionV3.rejectedScoreTotal /
            rejectedBuyDivisor,
          rejeitadosScoreMax:
            Number.isFinite(
              buyDecisionV3.rejectedScoreMax,
            )
              ? buyDecisionV3.rejectedScoreMax
              : 0,

          rejeitadosConfidenceMin:
            Number.isFinite(
              buyDecisionV3.rejectedConfidenceMin,
            )
              ? buyDecisionV3.rejectedConfidenceMin
              : 0,
          rejeitadosConfidenceMedia:
            buyDecisionV3
              .rejectedConfidenceTotal /
            rejectedBuyDivisor,
          rejeitadosConfidenceMax:
            Number.isFinite(
              buyDecisionV3.rejectedConfidenceMax,
            )
              ? buyDecisionV3.rejectedConfidenceMax
              : 0,
        };

        console.log(
          '[TradeVision] WDO 5M BUY — DECISION ENGINE V3 — RESUMO',
          buyDecisionV3Summary,
        );

        console.log(
          '[TradeVision] WDO 5M BUY — DECISION ENGINE V3 — MOTIVOS DE REJEIÇÃO',
          buyDecisionV3.reasons,
        );

        console.table(
          Object.fromEntries(
            Object.entries(
              buyDecisionV3.reasons,
            )
              .sort(([, a], [, b]) => b - a)
              .map(([reason, count]) => [
                reason,
                {
                  count,
                  pct:
                    buyDecisionV3.rejectedBuy > 0
                      ? (count /
                          buyDecisionV3.rejectedBuy) *
                        100
                      : 0,
                },
              ]),
          ),
        );

        console.log(
          '[TradeVision] WDO 5M BUY — DECISION ENGINE V3 — NEAR THRESHOLD',
          {
            score60a64:
              buyDecisionV3.score60To64,
            score55a59:
              buyDecisionV3.score55To59,
            confidence60a64:
              buyDecisionV3.confidence60To64,
            confidence55a59:
              buyDecisionV3.confidence55To59,
            observacao:
              'Somente diagnóstico. Thresholds permanecem congelados em score >= 65, confidence >= 65 e tendência ALTA.',
          },
        );

        console.log(
          '[TradeVision] WDO 5M BUY_ONLY LAB V2 — LEITURA',
          'Diagnóstico somente: não reduzimos thresholds e não alteramos stop/target. O objetivo é localizar o gargalo antes de criar qualquer hipótese nova.',
        );

        const v4NetDelta =
          buyScore60Full.netProfit -
          buyFull.netProfit;

        const v4PfDelta =
          buyScore60Full.profitFactor -
          buyFull.profitFactor;

        const v4TradeDelta =
          buyScore60Full.totalTrades -
          buyFull.totalTrades;

        const v4Decision =
          buyScore60Full.totalTrades >= 20 &&
          buyScore60Full.netProfit > 0 &&
          buyScore60Full.profitFactor >= 1.05 &&
          buyScore60WalkForward.positiveRate >= 50
            ? 'SCORE 60 PROMISSOR — AVANÇAR PARA ROBUSTEZ V5'
            : 'SCORE 60 NÃO APROVADO — MANTER SCORE 65 COMO BASE';

        console.log(
          '[TradeVision] WDO 5M BUY — SCORE 65 VS 60 — V4',
        );

        console.table({
          'BASE SCORE >= 65': {
            trades: buyFull.totalTrades,
            winRate: buyFull.winRate,
            netProfit: buyFull.netProfit,
            profitFactor: buyFull.profitFactor,
            maxDrawdown: buyFull.maxDrawdown,
            walkForwardWindows:
              buyWalkForward.windows,
            positiveWindows:
              buyWalkForward.positiveWindows,
            positiveRate:
              buyWalkForward.positiveRate,
            walkForwardTrades:
              buyWalkForward.totalTrades,
          },
          'CANDIDATO SCORE >= 60': {
            trades: buyScore60Full.totalTrades,
            winRate: buyScore60Full.winRate,
            netProfit: buyScore60Full.netProfit,
            profitFactor:
              buyScore60Full.profitFactor,
            maxDrawdown:
              buyScore60Full.maxDrawdown,
            walkForwardWindows:
              buyScore60WalkForward.windows,
            positiveWindows:
              buyScore60WalkForward
                .positiveWindows,
            positiveRate:
              buyScore60WalkForward
                .positiveRate,
            walkForwardTrades:
              buyScore60WalkForward.totalTrades,
          },
        });

        console.log(
          '[TradeVision] WDO 5M BUY — V4 — DELTAS',
          {
            tradeDelta: v4TradeDelta,
            netProfitDelta: v4NetDelta,
            profitFactorDelta: v4PfDelta,
            baseTrades: buyFull.totalTrades,
            candidateTrades:
              buyScore60Full.totalTrades,
            basePositiveRate:
              buyWalkForward.positiveRate,
            candidatePositiveRate:
              buyScore60WalkForward
                .positiveRate,
          },
        );

        console.log(
          '[TradeVision] WDO 5M BUY — V4 — BASE 65 — VEREDITO',
          buyVerdict,
        );

        console.log(
          '[TradeVision] WDO 5M BUY — V4 — CANDIDATO 60 — VEREDITO',
          buyScore60Verdict,
        );

        console.log(
          '[TradeVision] WDO 5M BUY — V4 — DECISÃO:',
          v4Decision,
        );

        console.log(
          '[TradeVision] WDO 5M BUY — V4 — OBSERVAÇÃO',
          'Validação somente. O threshold global do Decision Engine continua em 65.',
        );

        console.log(
          '[TradeVision] WDO 5M BASE V1 — CRITÉRIOS',
          {
            minimumTrades,
            minimumProfitFactor,
            minimumPositiveWindowRate,
          },
        );

        console.log(
          '[TradeVision] WDO 5M BASE V1 — BUY — VEREDITO',
          buyVerdict,
        );

        console.log(
          '[TradeVision] WDO 5M BASE V1 — SELL — VEREDITO',
          sellVerdict,
        );

        console.log(
          '[TradeVision] WDO 5M BASE V1 — DECISÃO:',
          finalDecision,
        );

        console.log(
          '[TradeVision] WDO 5M BASE V1 — FIM',
          'Validação de base somente. Nenhuma regra foi aplicada à estratégia.',
        );

        console.groupEnd();

        setBacktestResult(
          buyFull.netProfit >=
          sellFull.netProfit
            ? buyFull
            : sellFull,
        );
      } finally {
        setBacktestLoading(false);
      }

      return;
    }

    const isRealWdo15m =
      asset === 'WDO' &&
      timeframe === '15m';

    if (isRealWdo15m) {
      const realCandles =
        WDO_15M_REAL_CANDLES;

      const windowSize = 400;

      if (realCandles.length < windowSize * 3) {
        console.warn(
          `[TradeVision] WDO 15m LAB requer pelo menos ${
            windowSize * 3
          } candles. Recebidos: ${realCandles.length}.`,
        );
        return;
      }

      setBacktestLoading(true);

      try {
        const windows: Candle[][] = [];

        for (
          let startIndex = 0;
          startIndex < realCandles.length;
          startIndex += windowSize
        ) {
          const windowCandles =
            realCandles.slice(
              startIndex,
              Math.min(
                startIndex + windowSize,
                realCandles.length,
              ),
            );

          if (windowCandles.length >= 300) {
            windows.push(windowCandles);
          }
        }

        const moderateCosts =
          costScenarios.MODERADO;

        /*
         * WDO FUNNEL DIAGNOSTIC
         *
         * Diagnóstico explícito e independente do resultado final do backtest.
         * Replica o funil principal para descobrir exatamente onde o WDO
         * deixa de produzir operações: sinal -> decisão -> ordem -> risco.
         *
         * Não altera estratégia, thresholds, stop, target ou custos.
         */
        const diagnosticWindowSize = 120;

        const wdoDiagnostic = {
          windowsEvaluated: 0,

          finalSignalBuy: 0,
          finalSignalSell: 0,
          finalSignalWait: 0,

          decisionBuy: 0,
          decisionSell: 0,
          decisionWait: 0,

          ordersReady: 0,
          ordersBlocked: 0,

          buyOrdersReady: 0,
          sellOrdersReady: 0,

          riskApproved: 0,
          riskBlocked: 0,

          buyRiskApproved: 0,
          sellRiskApproved: 0,

          scoreMin: Number.POSITIVE_INFINITY,
          scoreMax: Number.NEGATIVE_INFINITY,
          scoreTotal: 0,

          confidenceMin: Number.POSITIVE_INFINITY,
          confidenceMax: Number.NEGATIVE_INFINITY,
          confidenceTotal: 0,
        };

        for (
          let diagnosticIndex = diagnosticWindowSize;
          diagnosticIndex < realCandles.length - 1;
          diagnosticIndex += 1
        ) {
          const historicalCandles =
            realCandles.slice(
              diagnosticIndex - diagnosticWindowSize,
              diagnosticIndex + 1,
            );

          const historicalAnalysis =
            buildHistoricalAnalysis(
              'WDO',
              '15m',
              historicalCandles,
            );

          const historicalDecision =
            evaluateAnalysis(
              historicalAnalysis,
            );

          wdoDiagnostic.windowsEvaluated += 1;

          wdoDiagnostic.scoreMin =
            Math.min(
              wdoDiagnostic.scoreMin,
              historicalAnalysis.score,
            );

          wdoDiagnostic.scoreMax =
            Math.max(
              wdoDiagnostic.scoreMax,
              historicalAnalysis.score,
            );

          wdoDiagnostic.scoreTotal +=
            historicalAnalysis.score;

          wdoDiagnostic.confidenceMin =
            Math.min(
              wdoDiagnostic.confidenceMin,
              historicalDecision.confidence,
            );

          wdoDiagnostic.confidenceMax =
            Math.max(
              wdoDiagnostic.confidenceMax,
              historicalDecision.confidence,
            );

          wdoDiagnostic.confidenceTotal +=
            historicalDecision.confidence;

          if (
            historicalAnalysis.finalSignal === 'BUY'
          ) {
            wdoDiagnostic.finalSignalBuy += 1;
          } else if (
            historicalAnalysis.finalSignal === 'SELL'
          ) {
            wdoDiagnostic.finalSignalSell += 1;
          } else {
            wdoDiagnostic.finalSignalWait += 1;
          }

          if (
            historicalDecision.action === 'BUY'
          ) {
            wdoDiagnostic.decisionBuy += 1;
          } else if (
            historicalDecision.action === 'SELL'
          ) {
            wdoDiagnostic.decisionSell += 1;
          } else {
            wdoDiagnostic.decisionWait += 1;
          }

          const diagnosticOrder =
            prepareOrder(
              historicalAnalysis,
              historicalDecision,
            );

          if (
            diagnosticOrder.status !== 'READY' ||
            !diagnosticOrder.side
          ) {
            wdoDiagnostic.ordersBlocked += 1;
            continue;
          }

          wdoDiagnostic.ordersReady += 1;

          if (diagnosticOrder.side === 'BUY') {
            wdoDiagnostic.buyOrdersReady += 1;
          } else {
            wdoDiagnostic.sellOrdersReady += 1;
          }

          const diagnosticRisk =
            evaluateOrderRisk(
              diagnosticOrder,
              DEFAULT_RISK_RULES,
              {
                dailyPnl: 0,
                openPositions: 0,
              },
            );

          if (
            diagnosticRisk.decision !== 'APPROVED' ||
            diagnosticRisk.quantity < 1
          ) {
            wdoDiagnostic.riskBlocked += 1;
            continue;
          }

          wdoDiagnostic.riskApproved += 1;

          if (diagnosticOrder.side === 'BUY') {
            wdoDiagnostic.buyRiskApproved += 1;
          } else {
            wdoDiagnostic.sellRiskApproved += 1;
          }
        }

        const diagnosticDivisor =
          wdoDiagnostic.windowsEvaluated > 0
            ? wdoDiagnostic.windowsEvaluated
            : 1;

        const wdoDiagnosticSummary = {
          windowsEvaluated:
            wdoDiagnostic.windowsEvaluated,

          finalSignalBuy:
            wdoDiagnostic.finalSignalBuy,
          finalSignalSell:
            wdoDiagnostic.finalSignalSell,
          finalSignalWait:
            wdoDiagnostic.finalSignalWait,

          decisionBuy:
            wdoDiagnostic.decisionBuy,
          decisionSell:
            wdoDiagnostic.decisionSell,
          decisionWait:
            wdoDiagnostic.decisionWait,

          ordersReady:
            wdoDiagnostic.ordersReady,
          ordersBlocked:
            wdoDiagnostic.ordersBlocked,

          buyOrdersReady:
            wdoDiagnostic.buyOrdersReady,
          sellOrdersReady:
            wdoDiagnostic.sellOrdersReady,

          riskApproved:
            wdoDiagnostic.riskApproved,
          riskBlocked:
            wdoDiagnostic.riskBlocked,

          buyRiskApproved:
            wdoDiagnostic.buyRiskApproved,
          sellRiskApproved:
            wdoDiagnostic.sellRiskApproved,

          minScore:
            Number.isFinite(wdoDiagnostic.scoreMin)
              ? wdoDiagnostic.scoreMin
              : 0,
          avgScore:
            wdoDiagnostic.scoreTotal /
            diagnosticDivisor,
          maxScore:
            Number.isFinite(wdoDiagnostic.scoreMax)
              ? wdoDiagnostic.scoreMax
              : 0,

          minConfidence:
            Number.isFinite(
              wdoDiagnostic.confidenceMin,
            )
              ? wdoDiagnostic.confidenceMin
              : 0,
          avgConfidence:
            wdoDiagnostic.confidenceTotal /
            diagnosticDivisor,
          maxConfidence:
            Number.isFinite(
              wdoDiagnostic.confidenceMax,
            )
              ? wdoDiagnostic.confidenceMax
              : 0,
        };

        const [buyFull, sellFull] =
          await Promise.all([
            runBacktestV2({
              asset: 'WDO',
              timeframe: '15m',
              initialCapital: 10000,
              candles: realCandles,
              strategyMode: 'BUY_ONLY',
              executionCosts: moderateCosts,
            }),
            runBacktestV2({
              asset: 'WDO',
              timeframe: '15m',
              initialCapital: 10000,
              candles: realCandles,
              strategyMode: 'SELL_ONLY',
              executionCosts: moderateCosts,
            }),
          ]);

        const row = (
          result: BacktestResult,
        ) => ({
          trades: result.totalTrades,
          winRate: result.winRate,
          netProfit: result.netProfit,
          profitFactor: result.profitFactor,
          maxDrawdown: result.maxDrawdown,
        });

        const buyWindows: BacktestResult[] = [];
        const sellWindows: BacktestResult[] = [];

        for (const windowCandles of windows) {
          const [buy, sell] =
            await Promise.all([
              runBacktestV2({
                asset: 'WDO',
                timeframe: '15m',
                initialCapital: 10000,
                candles: windowCandles,
                strategyMode: 'BUY_ONLY',
                executionCosts: moderateCosts,
              }),
              runBacktestV2({
                asset: 'WDO',
                timeframe: '15m',
                initialCapital: 10000,
                candles: windowCandles,
                strategyMode: 'SELL_ONLY',
                executionCosts: moderateCosts,
              }),
            ]);

          buyWindows.push(buy);
          sellWindows.push(sell);
        }

        const summarize = (
          results: BacktestResult[],
        ) => {
          const positiveWindows =
            results.filter(
              (result) => result.netProfit > 0,
            ).length;

          return {
            windows: results.length,
            positiveWindows,
            negativeWindows:
              results.filter(
                (result) => result.netProfit < 0,
              ).length,
            positiveRate:
              results.length > 0
                ? (positiveWindows / results.length) * 100
                : 0,
            totalTrades:
              results.reduce(
                (total, result) =>
                  total + result.totalTrades,
                0,
              ),
            totalNetProfit:
              results.reduce(
                (total, result) =>
                  total + result.netProfit,
                0,
              ),
            worstDrawdown:
              results.reduce(
                (max, result) =>
                  Math.max(max, result.maxDrawdown),
                0,
              ),
          };
        };

        console.clear();
        console.group(
          '[TradeVision] WDO 15M REAL — LAB V1 BUY × SELL',
        );

        console.log(
          '[TradeVision] Fonte',
          {
            asset: 'WDO',
            timeframe: '15m',
            source: 'Toro Trader — OHLC real',
            totalCandles: realCandles.length,
            executionCosts: 'MODERADO',
            windowSize,
            validWindows: windows.length,
            volume:
              'INDISPONÍVEL — mantido neutro, sem dados inventados',
          },
        );

        console.log(
          '[TradeVision] WDO15 FUNIL — DIAGNÓSTICO EXPLÍCITO',
        );

        console.table({
          'WDO15 FUNIL — TOTAL': {
            windowsEvaluated:
              wdoDiagnosticSummary.windowsEvaluated,

            finalSignalBuy:
              wdoDiagnosticSummary.finalSignalBuy,
            finalSignalSell:
              wdoDiagnosticSummary.finalSignalSell,
            finalSignalWait:
              wdoDiagnosticSummary.finalSignalWait,

            decisionBuy:
              wdoDiagnosticSummary.decisionBuy,
            decisionSell:
              wdoDiagnosticSummary.decisionSell,
            decisionWait:
              wdoDiagnosticSummary.decisionWait,

            ordersReady:
              wdoDiagnosticSummary.ordersReady,
            ordersBlocked:
              wdoDiagnosticSummary.ordersBlocked,

            riskApproved:
              wdoDiagnosticSummary.riskApproved,
            riskBlocked:
              wdoDiagnosticSummary.riskBlocked,

            minScore:
              wdoDiagnosticSummary.minScore,
            avgScore:
              wdoDiagnosticSummary.avgScore,
            maxScore:
              wdoDiagnosticSummary.maxScore,

            minConfidence:
              wdoDiagnosticSummary.minConfidence,
            avgConfidence:
              wdoDiagnosticSummary.avgConfidence,
            maxConfidence:
              wdoDiagnosticSummary.maxConfidence,
          },
        });

        console.table({
          'WDO15 BUY — FUNIL': {
            finalSignals:
              wdoDiagnosticSummary.finalSignalBuy,
            decisions:
              wdoDiagnosticSummary.decisionBuy,
            ordersReady:
              wdoDiagnosticSummary.buyOrdersReady,
            riskApproved:
              wdoDiagnosticSummary.buyRiskApproved,
          },

          'WDO15 SELL — FUNIL': {
            finalSignals:
              wdoDiagnosticSummary.finalSignalSell,
            decisions:
              wdoDiagnosticSummary.decisionSell,
            ordersReady:
              wdoDiagnosticSummary.sellOrdersReady,
            riskApproved:
              wdoDiagnosticSummary.sellRiskApproved,
          },
        });

        console.table({
          'WDO15 BUY_ONLY — MODERADO':
            row(buyFull),
          'WDO15 SELL_ONLY — MODERADO':
            row(sellFull),
        });

        console.log(
          '[TradeVision] WDO15 WALK-FORWARD BUY',
          summarize(buyWindows),
        );

        console.log(
          '[TradeVision] WDO15 WALK-FORWARD SELL',
          summarize(sellWindows),
        );

        console.table(
          Object.fromEntries(
            windows.flatMap((_, index) => [
              [
                `W${index + 1} — BUY`,
                row(buyWindows[index]),
              ],
              [
                `W${index + 1} — SELL`,
                row(sellWindows[index]),
              ],
            ]),
          ),
        );

        const buySummary = summarize(buyWindows);
        const sellSummary = summarize(sellWindows);

        const buyApproved =
          buyFull.netProfit > 0 &&
          buyFull.profitFactor > 1 &&
          buySummary.positiveRate >= 50 &&
          buySummary.totalTrades >= 8;

        const sellApproved =
          sellFull.netProfit > 0 &&
          sellFull.profitFactor > 1 &&
          sellSummary.positiveRate >= 50 &&
          sellSummary.totalTrades >= 8;

        const finalDecision =
          buyApproved && sellApproved
            ? 'BUY E SELL APROVADOS PARA A PRÓXIMA ETAPA'
            : buyApproved
              ? 'APENAS BUY APROVADO PARA A PRÓXIMA ETAPA'
              : sellApproved
                ? 'APENAS SELL APROVADO PARA A PRÓXIMA ETAPA'
                : 'NENHUM CANDIDATO APROVADO — MANTER COMO HIPÓTESE';

        console.log(
          '[TradeVision] ========================================',
        );
        console.log(
          '[TradeVision] WDO ROBUSTEZ V3 — RESUMO FINAL',
        );
        console.log('[TradeVision] BUY:', {
          trades: buyFull.totalTrades,
          winRate: buyFull.winRate,
          netProfit: buyFull.netProfit,
          profitFactor: buyFull.profitFactor,
          maxDrawdown: buyFull.maxDrawdown,
          walkForwardWindows: buySummary.windows,
          walkForwardPositiveWindows:
            buySummary.positiveWindows,
          walkForwardPositiveRate:
            buySummary.positiveRate,
          walkForwardTotalTrades:
            buySummary.totalTrades,
          aprovado: buyApproved,
        });
        console.log('[TradeVision] SELL:', {
          trades: sellFull.totalTrades,
          winRate: sellFull.winRate,
          netProfit: sellFull.netProfit,
          profitFactor: sellFull.profitFactor,
          maxDrawdown: sellFull.maxDrawdown,
          walkForwardWindows: sellSummary.windows,
          walkForwardPositiveWindows:
            sellSummary.positiveWindows,
          walkForwardPositiveRate:
            sellSummary.positiveRate,
          walkForwardTotalTrades:
            sellSummary.totalTrades,
          aprovado: sellApproved,
        });
        console.log(
          '[TradeVision] WDO ROBUSTEZ V3 — DECISÃO:',
          finalDecision,
        );
        console.log(
          '[TradeVision] WDO ROBUSTEZ V3 — FIM',
          'Validação somente. Nenhuma regra foi aplicada à estratégia.',
        );
        console.log(
          '[TradeVision] ========================================',
        );

        console.log(
          '[TradeVision] WDO 15M LAB V1 — FIM',
        );
        console.groupEnd();

        setBacktestResult(
          buyFull.netProfit >= sellFull.netProfit
            ? buyFull
            : sellFull,
        );
      } finally {
        setBacktestLoading(false);
      }

      return;
    }

    /*
     * Para os demais ativos/timeframes,
     * preservamos a validação sintética A/B/C/D/E/F.
     */
    const blockSize = 5000;
    const requiredCandles =
      blockSize * 6;

    if (candles.length < requiredCandles) {
      console.warn(
        `[TradeVision] Validação A/B/C/D/E/F requer ${
          requiredCandles
        } candles. Recebidos: ${candles.length}.`,
      );
      return;
    }

    setBacktestLoading(true);

    try {
      const blockA =
        candles.slice(
          candles.length - blockSize * 6,
          candles.length - blockSize * 5,
        );

      const blockB =
        candles.slice(
          candles.length - blockSize * 5,
          candles.length - blockSize * 4,
        );

      const blockC =
        candles.slice(
          candles.length - blockSize * 4,
          candles.length - blockSize * 3,
        );

      const blockD =
        candles.slice(
          candles.length - blockSize * 3,
          candles.length - blockSize * 2,
        );

      const blockE =
        candles.slice(
          candles.length - blockSize * 2,
          candles.length - blockSize,
        );

      const blockF =
        candles.slice(
          candles.length - blockSize,
        );

      console.group(
        '[TradeVision] BUY_ONLY — VALIDAÇÃO A/B/C/D/E/F + STRESS TEST DE CUSTOS',
      );

      console.log(
        '[TradeVision] Blocos',
        {
          A: {
            candles: blockA.length,
            from: blockA[0]?.time,
            to: blockA[blockA.length - 1]?.time,
          },
          B: {
            candles: blockB.length,
            from: blockB[0]?.time,
            to: blockB[blockB.length - 1]?.time,
          },
          C: {
            candles: blockC.length,
            from: blockC[0]?.time,
            to: blockC[blockC.length - 1]?.time,
          },
          D: {
            candles: blockD.length,
            from: blockD[0]?.time,
            to: blockD[blockD.length - 1]?.time,
          },
          E: {
            candles: blockE.length,
            from: blockE[0]?.time,
            to: blockE[blockE.length - 1]?.time,
          },
          F: {
            candles: blockF.length,
            from: blockF[0]?.time,
            to: blockF[blockF.length - 1]?.time,
          },
        },
      );

      console.log(
        '[TradeVision] Cenários',
        costScenarios,
      );

      async function runBlock(
        blockCandles: Candle[],
        executionCosts: (typeof costScenarios)[keyof typeof costScenarios],
      ) {
        return runBacktestV2({
          asset,
          timeframe,
          initialCapital: 10000,
          candles: blockCandles,
          strategyMode: 'BUY_ONLY',
          executionCosts,
        });
      }

      const [
        aZero,
        aLight,
        aModerate,
        bZero,
        bLight,
        bModerate,
        cZero,
        cLight,
        cModerate,
        dZero,
        dLight,
        dModerate,
        eZero,
        eLight,
        eModerate,
        fZero,
        fLight,
        fModerate,
      ] = await Promise.all([
        runBlock(blockA, costScenarios.ZERO),
        runBlock(blockA, costScenarios.LEVE),
        runBlock(blockA, costScenarios.MODERADO),

        runBlock(blockB, costScenarios.ZERO),
        runBlock(blockB, costScenarios.LEVE),
        runBlock(blockB, costScenarios.MODERADO),

        runBlock(blockC, costScenarios.ZERO),
        runBlock(blockC, costScenarios.LEVE),
        runBlock(blockC, costScenarios.MODERADO),

        runBlock(blockD, costScenarios.ZERO),
        runBlock(blockD, costScenarios.LEVE),
        runBlock(blockD, costScenarios.MODERADO),

        runBlock(blockE, costScenarios.ZERO),
        runBlock(blockE, costScenarios.LEVE),
        runBlock(blockE, costScenarios.MODERADO),

        runBlock(blockF, costScenarios.ZERO),
        runBlock(blockF, costScenarios.LEVE),
        runBlock(blockF, costScenarios.MODERADO),
      ]);

      const row = (
        result: BacktestResult,
      ) => ({
        trades: result.totalTrades,
        winRate: result.winRate,
        netProfit: result.netProfit,
        profitFactor: result.profitFactor,
        maxDrawdown: result.maxDrawdown,
      });

      console.table({
        'A — ZERO': row(aZero),
        'A — LEVE': row(aLight),
        'A — MODERADO': row(aModerate),

        'B — ZERO': row(bZero),
        'B — LEVE': row(bLight),
        'B — MODERADO': row(bModerate),

        'C — ZERO': row(cZero),
        'C — LEVE': row(cLight),
        'C — MODERADO': row(cModerate),

        'D — ZERO': row(dZero),
        'D — LEVE': row(dLight),
        'D — MODERADO': row(dModerate),

        'E — ZERO': row(eZero),
        'E — LEVE': row(eLight),
        'E — MODERADO': row(eModerate),

        'F — ZERO': row(fZero),
        'F — LEVE': row(fLight),
        'F — MODERADO': row(fModerate),
      });

      console.groupEnd();

      setBacktestResult(
        fModerate,
      );
    } finally {
      setBacktestLoading(false);
    }
  }

  function handleClearDemoHistory() {
    clearDemoOrderHistory();
    setDemoOrderHistory([]);
  }

  useEffect(() => {
    void run();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset, timeframe]);

  useEffect(() => {
    void runMultiTimeframe();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [asset]);

  useEffect(() => {
    if (!result || candles.length === 0) {
      setInstitutionalAnalysis(null);
      return;
    }

    setInstitutionalAnalysis(
      analyzeInstitutionalAI({
        result,
        candles,
        multiTimeframe,
      }),
    );
  }, [result, candles, multiTimeframe]);

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">
          Análise
        </h2>

        <p className="text-xs text-slate-500">
          Gráfico, indicadores técnicos e sinal final
        </p>
      </section>

      <section className="animate-fade-up space-y-4">
        <AssetSelector
          asset={asset}
          onChange={setAsset}
        />

        <TimeframeSelector
          timeframe={timeframe}
          onChange={setTimeframe}
        />
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

          <SmartMoneyPanel
            asset={asset}
            candles={candles}
          />

          {fibonacciAnalysis && (
            <FibonacciPanel
              direction={
                fibonacciAnalysis.direction
              }
              nearestLevel={
                fibonacciAnalysis
                  .nearestLevel?.label ?? '—'
              }
              nearestPrice={
                fibonacciAnalysis.nearestLevel
                  ? formatPrice(
                      asset,
                      fibonacciAnalysis
                        .nearestLevel.price,
                    )
                  : '—'
              }
              amplitude={formatPrice(
                asset,
                fibonacciAnalysis.range,
              )}
            />
          )}

          <MultiTimeframePanel
            analysis={multiTimeframe}
            loading={multiTimeframeLoading}
            error={multiTimeframeError}
            onRefresh={() =>
              void runMultiTimeframe()
            }
          />

          {institutionalAnalysis &&
            institutionalNarrative && (
              <InstitutionalPanel
                analysis={institutionalAnalysis}
                narrative={institutionalNarrative}
              />
            )}

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
                    value={result.confidence}
                    tone="accent"
                  />
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <MiniStat
                    label="Tendência"
                    value={result.trend}
                    tone={
                      result.trend === 'ALTA'
                        ? 'bull'
                        : result.trend === 'BAIXA'
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

          <IndicatorCards
            result={result}
            loading={loading}
            onRefresh={() => void run()}
          />

          {decision && preparedOrder && (
            <DecisionEnginePanel
              asset={asset}
              decision={decision}
              preparedOrder={preparedOrder}
            />
          )}

          {riskEvaluation && (
            <RiskManagerPanel
              evaluation={riskEvaluation}
              rules={DEFAULT_RISK_RULES}
            />
          )}

          <BacktestPanel
            result={backtestResult}
            loading={backtestLoading}
            onRun={handleRunBacktest}
          />

          {preparedOrder && (
            <BrokerPanel
              preparedOrder={preparedOrder}
              brokerStatus={brokerStatus}
              brokerAccount={brokerAccount}
              brokerActionState={brokerActionState}
              brokerFeedback={brokerFeedback}
              lastBrokerOrder={lastBrokerOrder}
              riskApproved={
                riskEvaluation?.decision === 'APPROVED'
              }
              onConnect={handleConnectBroker}
              onValidate={handleValidateOrder}
              onSend={handleSendDemoOrder}
            />
          )}

          <DemoOrderHistoryPanel
            history={demoOrderHistory}
            onClear={handleClearDemoHistory}
          />

          <SignalPanel
            asset={asset}
            result={result}
            onGoToAI={onGoToAI}
            onGoToEngine={onGoToEngine}
          />
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
        className={`mt-0.5 truncate font-mono text-xs font-bold tabular ${
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