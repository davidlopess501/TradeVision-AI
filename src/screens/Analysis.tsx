import { useEffect, useMemo, useState } from 'react';

import type {
  Asset,
  Timeframe,
  AnalysisResult,
  Candle,
} from '@/types';

import { getMarketDataProvider } from '@/services/types';
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

interface AnalysisScreenProps {
  initialAsset: Asset;
  onGoToAI: (asset: Asset) => void;
  onGoToEngine: (asset: Asset) => void;
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
