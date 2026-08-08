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
            10000,
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
    const blockSize = 5000;

    if (candles.length < blockSize * 2) {
      console.warn(
        `[TradeVision] Validação fora da amostra requer ${
          blockSize * 2
        } candles. Recebidos: ${candles.length}.`,
      );
      return;
    }

    setBacktestLoading(true);

    try {
      /*
       * IMPORTANTE:
       * - developmentCandles = bloco mais antigo
       * - validationCandles = bloco mais recente
       *
       * Os períodos não se sobrepõem.
       * Nenhuma regra da estratégia é alterada aqui.
       */
      const developmentCandles =
        candles.slice(
          candles.length - blockSize * 2,
          candles.length - blockSize,
        );

      const validationCandles =
        candles.slice(
          candles.length - blockSize,
        );

      console.group(
        '[TradeVision] OUT-OF-SAMPLE — BLOCO A / DESENVOLVIMENTO',
      );

      console.log({
        candles:
          developmentCandles.length,
        from:
          developmentCandles[0]?.time,
        to:
          developmentCandles[
            developmentCandles.length - 1
          ]?.time,
      });

      const developmentResult =
        await runBacktestV2({
          asset,
          timeframe,
          initialCapital: 10000,
          candles:
            developmentCandles,
        });

      console.log(
        '[TradeVision] Resultado Bloco A',
        developmentResult,
      );

      console.groupEnd();

      console.group(
        '[TradeVision] OUT-OF-SAMPLE — BLOCO B / VALIDAÇÃO',
      );

      console.log({
        candles:
          validationCandles.length,
        from:
          validationCandles[0]?.time,
        to:
          validationCandles[
            validationCandles.length - 1
          ]?.time,
      });

      const validationResult =
        await runBacktestV2({
          asset,
          timeframe,
          initialCapital: 10000,
          candles:
            validationCandles,
        });

      console.log(
        '[TradeVision] Resultado Bloco B',
        validationResult,
      );

      console.groupEnd();

      /*
       * O painel mostra o resultado fora da amostra (Bloco B).
       * O Console mantém os dois blocos separados para comparação.
       */
      setBacktestResult(
        validationResult,
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