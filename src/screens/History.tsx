import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Activity,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Target,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';

import {
  getRealSignalHistory,
  resolvePendingRealSignals,
  summarizeRealSignals,
  type RealSignalJournalRow,
} from '@/services/realSignalJournal';

type AssetFilter =
  | 'ALL'
  | 'WDO'
  | 'WIN';

type ResultFilter =
  | 'ALL'
  | 'OPEN'
  | 'WIN'
  | 'LOSS';

function money(
  value: number,
): string {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      style: 'currency',
      currency: 'BRL',
      maximumFractionDigits: 2,
    },
  ).format(value);
}

function number(
  value: number,
  digits = 1,
): string {
  return new Intl.NumberFormat(
    'pt-BR',
    {
      minimumFractionDigits:
        digits,
      maximumFractionDigits:
        digits,
    },
  ).format(value);
}

function formatTime(
  value: string,
): string {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return date.toLocaleString(
    'pt-BR',
    {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    },
  );
}

function resultClass(
  result:
    RealSignalJournalRow['result'],
): string {
  if (result === 'WIN') {
    return 'text-emerald-400';
  }

  if (result === 'LOSS') {
    return 'text-red-400';
  }

  if (result === 'OPEN') {
    return 'text-amber-400';
  }

  return 'text-slate-500';
}

function signalClass(
  signal: string,
): string {
  if (signal === 'BUY') {
    return 'text-emerald-400';
  }

  if (signal === 'SELL') {
    return 'text-red-400';
  }

  return 'text-slate-400';
}

export default function History() {
  const [
    rows,
    setRows,
  ] = useState<
    RealSignalJournalRow[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    resolving,
    setResolving,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState<
    string | null
  >(null);

  const [
    assetFilter,
    setAssetFilter,
  ] = useState<AssetFilter>(
    'ALL',
  );

  const [
    resultFilter,
    setResultFilter,
  ] = useState<ResultFilter>(
    'ALL',
  );

  const load =
    useCallback(
      async () => {
        setLoading(true);
        setError(null);

        try {
          const history =
            await getRealSignalHistory(
              500,
            );

          setRows(history);
        } catch (
          caughtError
        ) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Falha ao carregar histórico REAL.',
          );
        } finally {
          setLoading(false);
        }
      },
      [],
    );

  const resolve =
    useCallback(
      async () => {
        setResolving(true);
        setError(null);

        try {
          await resolvePendingRealSignals();
          await load();
        } catch (
          caughtError
        ) {
          setError(
            caughtError instanceof Error
              ? caughtError.message
              : 'Falha ao resolver sinais.',
          );
        } finally {
          setResolving(false);
        }
      },
      [load],
    );

  useEffect(() => {
    void resolve();

    const interval =
      window.setInterval(
        () => {
          void resolve();
        },
        60_000,
      );

    return () => {
      window.clearInterval(
        interval,
      );
    };
  }, [resolve]);

  const filteredRows =
    useMemo(
      () =>
        rows.filter(
          (row) => {
            if (
              assetFilter !==
                'ALL' &&
              row.asset !==
                assetFilter
            ) {
              return false;
            }

            if (
              resultFilter !==
                'ALL' &&
              row.result !==
                resultFilter
            ) {
              return false;
            }

            return true;
          },
        ),
      [
        rows,
        assetFilter,
        resultFilter,
      ],
    );

  const metrics =
    useMemo(
      () =>
        summarizeRealSignals(
          filteredRows,
        ),
      [filteredRows],
    );

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">
              Histórico REAL
            </h2>

            <p className="mt-1 text-xs text-slate-500">
              Journal de sinais, resultados e P&amp;L do WDO 5m e WIN 15m
            </p>
          </div>

          <button
            type="button"
            onClick={() => void resolve()}
            disabled={
              loading ||
              resolving
            }
            className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition hover:border-sky-500/50 hover:text-sky-300 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-4 w-4 ${
                resolving
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Atualizar
          </button>
        </div>
      </section>

      {error && (
        <section className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-300">
          {error}
        </section>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <MetricCard
          title="SINAIS"
          value={String(
            metrics.actionable,
          )}
          subtitle={`${metrics.total} análises`}
          icon={Activity}
        />

        <MetricCard
          title="TAXA DE ACERTO"
          value={`${number(
            metrics.winRate,
            1,
          )}%`}
          subtitle={`${metrics.wins} WIN • ${metrics.losses} LOSS`}
          icon={Target}
        />

        <MetricCard
          title="P&L REAL/PAPER"
          value={money(
            metrics.netPnlMoney,
          )}
          subtitle={`${metrics.open} abertas`}
          icon={
            metrics.netPnlMoney >=
            0
              ? TrendingUp
              : TrendingDown
          }
        />

        <MetricCard
          title="QUALIDADE MÉDIA"
          value={`${number(
            metrics.avgScore,
            0,
          )}/100`}
          subtitle={`${number(
            metrics.avgConfidence,
            0,
          )}% confiança`}
          icon={CheckCircle2}
        />
      </section>

      <section className="card space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          {(
            [
              'ALL',
              'WDO',
              'WIN',
            ] as AssetFilter[]
          ).map(
            (filter) => (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  setAssetFilter(
                    filter,
                  )
                }
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  assetFilter ===
                  filter
                    ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                    : 'border-slate-800 bg-slate-950 text-slate-500'
                }`}
              >
                {filter ===
                'ALL'
                  ? 'Todos ativos'
                  : filter}
              </button>
            ),
          )}

          <div className="hidden h-8 w-px bg-slate-800 sm:block" />

          {(
            [
              'ALL',
              'OPEN',
              'WIN',
              'LOSS',
            ] as ResultFilter[]
          ).map(
            (filter) => (
              <button
                key={filter}
                type="button"
                onClick={() =>
                  setResultFilter(
                    filter,
                  )
                }
                className={`rounded-lg border px-3 py-2 text-xs font-bold transition ${
                  resultFilter ===
                  filter
                    ? 'border-sky-500 bg-sky-500/10 text-sky-300'
                    : 'border-slate-800 bg-slate-950 text-slate-500'
                }`}
              >
                {filter ===
                'ALL'
                  ? 'Todos resultados'
                  : filter}
              </button>
            ),
          )}
        </div>

        <div className="grid grid-cols-3 gap-2 rounded-xl border border-slate-800 bg-slate-950/50 p-3 text-center sm:grid-cols-6">
          <MiniStat
            label="BUY"
            value={metrics.buys}
          />
          <MiniStat
            label="SELL"
            value={metrics.sells}
          />
          <MiniStat
            label="WAIT"
            value={metrics.waits}
          />
          <MiniStat
            label="ABERTAS"
            value={metrics.open}
          />
          <MiniStat
            label="WIN"
            value={metrics.wins}
          />
          <MiniStat
            label="LOSS"
            value={metrics.losses}
          />
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-800 px-4 py-3">
          <h3 className="text-sm font-extrabold text-white">
            Sinais registrados
          </h3>

          <p className="mt-1 text-xs text-slate-500">
            O resultado só é fechado quando um candle posterior toca alvo ou stop.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
            <RefreshCw className="h-4 w-4 animate-spin" />
            Carregando journal...
          </div>
        ) : filteredRows.length ===
          0 ? (
          <div className="py-16 text-center">
            <Clock3 className="mx-auto mb-3 h-6 w-6 text-slate-700" />

            <p className="text-sm font-bold text-slate-400">
              Nenhum sinal registrado ainda
            </p>

            <p className="mt-1 text-xs text-slate-600">
              Amanhã o modo REAL começa a alimentar este painel automaticamente.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] w-full text-left text-xs">
              <thead className="bg-slate-950/60 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-bold">
                    Data
                  </th>
                  <th className="px-3 py-3 font-bold">
                    Ativo
                  </th>
                  <th className="px-3 py-3 font-bold">
                    Sinal
                  </th>
                  <th className="px-3 py-3 font-bold">
                    Score
                  </th>
                  <th className="px-3 py-3 font-bold">
                    Conf.
                  </th>
                  <th className="px-3 py-3 font-bold">
                    Entrada
                  </th>
                  <th className="px-3 py-3 font-bold">
                    Stop
                  </th>
                  <th className="px-3 py-3 font-bold">
                    Alvo
                  </th>
                  <th className="px-3 py-3 font-bold">
                    Resultado
                  </th>
                  <th className="px-4 py-3 text-right font-bold">
                    P&amp;L
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map(
                  (row) => (
                    <tr
                      key={row.id}
                      className="border-t border-slate-800/70 text-slate-300"
                    >
                      <td className="whitespace-nowrap px-4 py-3 text-slate-500">
                        {formatTime(
                          row.candle_time,
                        )}
                      </td>

                      <td className="px-3 py-3 font-black text-white">
                        {row.asset}{' '}
                        <span className="font-medium text-slate-600">
                          {row.timeframe}
                        </span>
                      </td>

                      <td
                        className={`px-3 py-3 font-black ${signalClass(
                          row.signal,
                        )}`}
                      >
                        {row.signal}
                      </td>

                      <td className="px-3 py-3">
                        {number(
                          row.score,
                          0,
                        )}
                      </td>

                      <td className="px-3 py-3">
                        {number(
                          row.confidence,
                          0,
                        )}
                        %
                      </td>

                      <td className="px-3 py-3">
                        {row.entry > 0
                          ? number(
                              row.entry,
                              row.asset ===
                                'WDO'
                                ? 1
                                : 0,
                            )
                          : '—'}
                      </td>

                      <td className="px-3 py-3">
                        {row.stop > 0
                          ? number(
                              row.stop,
                              row.asset ===
                                'WDO'
                                ? 1
                                : 0,
                            )
                          : '—'}
                      </td>

                      <td className="px-3 py-3">
                        {row.target > 0
                          ? number(
                              row.target,
                              row.asset ===
                                'WDO'
                                ? 1
                                : 0,
                            )
                          : '—'}
                      </td>

                      <td
                        className={`px-3 py-3 font-black ${resultClass(
                          row.result,
                        )}`}
                      >
                        <span className="inline-flex items-center gap-1">
                          {row.result ===
                            'WIN' && (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}

                          {row.result ===
                            'LOSS' && (
                            <XCircle className="h-3.5 w-3.5" />
                          )}

                          {row.result ===
                            'OPEN' && (
                            <Clock3 className="h-3.5 w-3.5" />
                          )}

                          {row.result}
                        </span>
                      </td>

                      <td
                        className={`px-4 py-3 text-right font-black ${
                          (row.pnl_money ??
                            0) >=
                          0
                            ? 'text-emerald-400'
                            : 'text-red-400'
                        }`}
                      >
                        {row.pnl_money ===
                        null
                          ? '—'
                          : money(
                              row.pnl_money,
                            )}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({
  title,
  value,
  subtitle,
  icon: Icon,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: typeof Activity;
}) {
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-black tracking-widest text-slate-600">
            {title}
          </p>

          <p className="mt-2 text-xl font-black text-white">
            {value}
          </p>

          <p className="mt-1 text-[11px] text-slate-500">
            {subtitle}
          </p>
        </div>

        <div className="rounded-xl bg-sky-500/10 p-2 text-sky-400">
          <Icon className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div>
      <p className="text-[10px] font-bold text-slate-600">
        {label}
      </p>
      <p className="mt-1 text-sm font-black text-slate-300">
        {value}
      </p>
    </div>
  );
}
