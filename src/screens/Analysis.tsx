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

import { useStore } from '@/store';
import { formatMoney, formatPrice } from '@/lib/assets';
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

import {
  CheckCircle2,
  Link2,
  Loader2,
  RefreshCw,
  Send,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react';

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
            120,
          ),
        ]);

      setResult(nextResult);
      setCandles(nextCandles);
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

      const response =
        await sendBrokerOrder({
          clientOrderId:
            preparedOrder.id,
          asset:
            preparedOrder.asset,
          side:
            preparedOrder.side,
          quantity: 1,
          entry:
            preparedOrder.entry,
          stop:
            preparedOrder.stop,
          target:
            preparedOrder.target,
        });

      setLastBrokerOrder(response);
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

          {decision && (
            <section className="card animate-fade-up p-4">
              <h3 className="text-sm font-bold text-white">
                Decision Engine
              </h3>

              <div className="mt-3 grid grid-cols-3 gap-3">
                <MiniStat
                  label="Ação"
                  value={decision.action}
                  tone={
                    decision.action === 'BUY'
                      ? 'bull'
                      : decision.action === 'SELL'
                        ? 'bear'
                        : 'wait'
                  }
                />

                <MiniStat
                  label="Confiança"
                  value={`${decision.confidence}%`}
                />

                <MiniStat
                  label="Status"
                  value="Motor ativo"
                />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {decision.reason}
              </p>
            </section>
          )}

          {preparedOrder && (
            <section className="card animate-fade-up p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-white">
                    Order Manager
                  </h3>

                  <p className="mt-0.5 text-[11px] text-slate-600">
                    Preparação e validação da ordem
                  </p>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    preparedOrder.status === 'READY'
                      ? 'bg-bull-500/10 text-bull-400'
                      : 'bg-wait-500/10 text-wait-400'
                  }`}
                >
                  {preparedOrder.status === 'READY'
                    ? 'ORDEM PRONTA'
                    : 'ORDEM BLOQUEADA'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat
                  label="Lado"
                  value={
                    preparedOrder.side ??
                    'AGUARDAR'
                  }
                  tone={
                    preparedOrder.side === 'BUY'
                      ? 'bull'
                      : preparedOrder.side === 'SELL'
                        ? 'bear'
                        : 'wait'
                  }
                />

                <MiniStat
                  label="Entrada"
                  value={formatPrice(
                    asset,
                    preparedOrder.entry,
                  )}
                />

                <MiniStat
                  label="Stop"
                  value={formatPrice(
                    asset,
                    preparedOrder.stop,
                  )}
                  tone="bear"
                />

                <MiniStat
                  label="Alvo"
                  value={formatPrice(
                    asset,
                    preparedOrder.target,
                  )}
                  tone="bull"
                />
              </div>

              <div className="mt-3 grid grid-cols-2 gap-3">
                <MiniStat
                  label="Confiança"
                  value={`${preparedOrder.confidence}%`}
                />

                <MiniStat
                  label="Envio"
                  value="Não enviado"
                  tone="wait"
                />
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-400">
                {preparedOrder.reason}
              </p>
            </section>
          )}

          {preparedOrder && (
            <section className="card animate-fade-up p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2">
                  <WalletCards className="h-4 w-4 text-accent-400" />

                  <div>
                    <h3 className="text-sm font-bold text-white">
                      Conta Demo
                    </h3>

                    <p className="mt-0.5 text-[11px] text-slate-600">
                      Simulação segura do Broker Connector
                    </p>
                  </div>
                </div>

                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                    brokerStatus.connectionStatus === 'CONNECTED'
                      ? 'bg-bull-500/10 text-bull-400'
                      : 'bg-wait-500/10 text-wait-400'
                  }`}
                >
                  {brokerStatus.connectionStatus === 'CONNECTED'
                    ? 'CONECTADA'
                    : 'DESCONECTADA'}
                </span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MiniStat
                  label="Ambiente"
                  value={brokerStatus.environment}
                  tone="wait"
                />

                <MiniStat
                  label="Corretora"
                  value={brokerStatus.name}
                />

                <MiniStat
                  label="Saldo"
                  value={
                    brokerAccount
                      ? formatMoney(
                          brokerAccount.balance,
                        )
                      : '—'
                  }
                />

                <MiniStat
                  label="Margem"
                  value={
                    brokerAccount
                      ? formatMoney(
                          brokerAccount.availableMargin,
                        )
                      : '—'
                  }
                />
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <button
                  type="button"
                  onClick={() =>
                    void handleConnectBroker()
                  }
                  disabled={
                    brokerActionState !== 'IDLE' ||
                    brokerStatus.connectionStatus === 'CONNECTED'
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {brokerActionState === 'CONNECTING' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Link2 className="h-4 w-4" />
                  )}

                  Conectar demo
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleValidateOrder()
                  }
                  disabled={
                    brokerActionState !== 'IDLE' ||
                    brokerStatus.connectionStatus !== 'CONNECTED'
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-ink-800 px-3 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-ink-750 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {brokerActionState === 'VALIDATING' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4" />
                  )}

                  Validar ordem
                </button>

                <button
                  type="button"
                  onClick={() =>
                    void handleSendDemoOrder()
                  }
                  disabled={
                    brokerActionState !== 'IDLE' ||
                    brokerStatus.connectionStatus !== 'CONNECTED' ||
                    preparedOrder.status !== 'READY'
                  }
                  className="flex items-center justify-center gap-2 rounded-lg bg-bull-500/15 px-3 py-2.5 text-xs font-bold text-bull-400 transition-colors hover:bg-bull-500/25 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {brokerActionState === 'SENDING' ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}

                  Enviar ordem demo
                </button>
              </div>

              <div
                className={`mt-4 flex items-start gap-2 rounded-xl border p-3 ${
                  brokerFeedback.tone === 'success'
                    ? 'border-bull-500/20 bg-bull-500/5'
                    : brokerFeedback.tone === 'error'
                      ? 'border-bear-500/20 bg-bear-500/5'
                      : 'border-white/[0.06] bg-ink-800/50'
                }`}
              >
                {brokerFeedback.tone === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-bull-400" />
                ) : brokerFeedback.tone === 'error' ? (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-bear-400" />
                ) : (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
                )}

                <div>
                  <p className="text-xs leading-relaxed text-slate-300">
                    {brokerFeedback.message}
                  </p>

                  {lastBrokerOrder?.brokerOrderId && (
                    <p className="mt-1 font-mono text-[10px] text-slate-600">
                      ID demo: {lastBrokerOrder.brokerOrderId}
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-3 text-[10px] leading-relaxed text-slate-600">
                Este ambiente é exclusivamente demonstrativo. Nenhuma ordem é enviada a uma corretora real.
              </p>
            </section>
          )}

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
