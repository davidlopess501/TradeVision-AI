import type { AnalysisResult, Asset, Timeframe } from '@/types';
import { formatPrice } from '@/lib/assets';

interface AnalysisSummaryPanelProps {
  asset: Asset;
  timeframe: Timeframe;
  result: AnalysisResult;
}

export function AnalysisSummaryPanel({
  asset,
  timeframe,
  result,
}: AnalysisSummaryPanelProps) {
  const getIndicator = (key: string) =>
    result.indicators.find((indicator) => indicator.key === key);

  const ema9 = getIndicator('ema9');
  const ema21 = getIndicator('ema21');
  const rsi = getIndicator('rsi');
  const macd = getIndicator('macd');
  const volume = getIndicator('volume');
  const atr = getIndicator('atr');

  const signalLabel =
    result.finalSignal === 'BUY'
      ? 'COMPRA'
      : result.finalSignal === 'SELL'
        ? 'VENDA'
        : 'AGUARDAR';

  const signalTone =
    result.finalSignal === 'BUY'
      ? 'text-bull-400'
      : result.finalSignal === 'SELL'
        ? 'text-bear-400'
        : 'text-wait-400';

  const trendTone =
    result.trend === 'ALTA'
      ? 'text-bull-400'
      : result.trend === 'BAIXA'
        ? 'text-bear-400'
        : 'text-wait-400';

  const hasValidBuyPlan =
    result.finalSignal === 'BUY' &&
    result.stop < result.entry &&
    result.target > result.entry;

  const hasValidSellPlan =
    result.finalSignal === 'SELL' &&
    result.stop > result.entry &&
    result.target < result.entry;

  const hasActiveTrade =
    hasValidBuyPlan ||
    hasValidSellPlan;

  const hasInvalidDirectionalPlan =
    (
      result.finalSignal === 'BUY' ||
      result.finalSignal === 'SELL'
    ) &&
    !hasActiveTrade;

  return (
    <section className="card animate-fade-up overflow-hidden">
      <div className="border-b border-slate-800 px-4 py-4 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-extrabold tracking-tight text-white">
              Análise em tempo real
            </h3>

            <p className="mt-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              {asset} • {timeframe} • TradeVision AI
            </p>
          </div>

          <div
            className={`rounded-lg bg-ink-800 px-4 py-2 font-mono text-sm font-black ${signalTone}`}
          >
            {signalLabel}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-px bg-slate-800 sm:grid-cols-4">
        <Metric
          label="Score"
          value={`${result.score}/100`}
        />

        <Metric
          label="Confiança"
          value={`${result.confidence}%`}
        />

        <Metric
          label="Probabilidade"
          value={`${result.probability}%`}
        />

        <Metric
          label="Tendência"
          value={result.trend}
          valueClass={trendTone}
        />
      </div>

      <div className="p-4 sm:p-5">
        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Indicadores técnicos
            </h4>

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              <Indicator
                label="EMA 9"
                value={ema9?.value ?? '—'}
                signal={ema9?.signal}
              />

              <Indicator
                label="EMA 21"
                value={ema21?.value ?? '—'}
                signal={ema21?.signal}
              />

              <Indicator
                label="RSI"
                value={rsi?.value ?? '—'}
                signal={rsi?.signal}
              />

              <Indicator
                label="MACD"
                value={macd?.value ?? '—'}
                signal={macd?.signal}
              />

              <Indicator
                label="Volume"
                value={volume?.value ?? '—'}
                signal={volume?.signal}
              />

              <Indicator
                label="ATR"
                value={atr?.value ?? '—'}
                signal={atr?.signal}
              />
            </div>
          </div>

          <div>
            <h4 className="mb-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              Plano da operação
            </h4>

            <div className="overflow-hidden rounded-xl border border-slate-800">
              <PriceRow
                label="Preço atual"
                value={formatPrice(asset, result.price)}
              />

              {hasActiveTrade ? (
                <>
                  <PriceRow
                    label="Entrada"
                    value={formatPrice(asset, result.entry)}
                    tone="entry"
                  />

                  <PriceRow
                    label="Stop"
                    value={formatPrice(asset, result.stop)}
                    tone="stop"
                  />

                  <PriceRow
                    label="Alvo"
                    value={formatPrice(asset, result.target)}
                    tone="target"
                  />
                </>
              ) : (
                <div className="bg-ink-800/40 px-4 py-4 text-center">
                  <div
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      hasInvalidDirectionalPlan
                        ? 'text-bear-400'
                        : 'text-wait-400'
                    }`}
                  >
                    {hasInvalidDirectionalPlan
                      ? 'PLANO BLOQUEADO'
                      : 'SEM OPERAÇÃO'}
                  </div>

                  <div className="mt-1 text-[10px] leading-relaxed text-slate-500">
                    {hasInvalidDirectionalPlan
                      ? 'Entrada, stop e alvo não respeitam a direção do sinal.'
                      : 'Aguardando confirmação para liberar entrada, stop e alvo.'}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  valueClass = 'text-white',
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-ink-900 p-4 text-center">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-sm font-black tabular-nums ${valueClass}`}
      >
        {value}
      </div>
    </div>
  );
}

function Indicator({
  label,
  value,
  signal,
}: {
  label: string;
  value: string;
  signal?: 'BUY' | 'SELL' | 'WAIT';
}) {
  const tone =
    signal === 'BUY'
      ? 'text-bull-400'
      : signal === 'SELL'
        ? 'text-bear-400'
        : 'text-slate-200';

  return (
    <div className="rounded-xl border border-slate-800 bg-ink-800/50 p-3">
      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div
        className={`mt-1 truncate font-mono text-xs font-bold tabular-nums ${tone}`}
      >
        {value}
      </div>
    </div>
  );
}

function PriceRow({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'entry' | 'stop' | 'target';
}) {
  const toneClass =
    tone === 'entry'
      ? 'text-accent-400'
      : tone === 'stop'
        ? 'text-bear-400'
        : tone === 'target'
          ? 'text-bull-400'
          : 'text-white';

  return (
    <div className="flex items-center justify-between border-b border-slate-800 bg-ink-800/40 px-4 py-3 last:border-b-0">
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
        {label}
      </span>

      <span
        className={`font-mono text-sm font-black tabular-nums ${toneClass}`}
      >
        {value}
      </span>
    </div>
  );
}