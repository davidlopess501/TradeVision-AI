import {
  Clock3,
  History,
  Trash2,
} from 'lucide-react';

import type {
  DemoOrderHistoryItem,
} from '@/services/demoOrderHistory';

import {
  formatPrice,
} from '@/lib/assets';

interface DemoOrderHistoryPanelProps {
  history: DemoOrderHistoryItem[];
  onClear: () => void;
}

export function DemoOrderHistoryPanel({
  history,
  onClear,
}: DemoOrderHistoryPanelProps) {
  return (
    <section className="card animate-fade-up p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-accent-400" />

          <div>
            <h3 className="text-sm font-bold text-white">
              Histórico Demo
            </h3>

            <p className="mt-0.5 text-[11px] text-slate-600">
              Últimas ordens simuladas neste navegador
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onClear}
          disabled={history.length === 0}
          className="flex items-center gap-1.5 rounded-lg bg-bear-500/10 px-2.5 py-2 text-[10px] font-bold text-bear-400 transition-colors hover:bg-bear-500/20 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Limpar
        </button>
      </div>

      {history.length === 0 ? (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border border-white/[0.05] bg-ink-800/40 px-4 py-8 text-center">
          <Clock3 className="h-5 w-5 text-slate-600" />

          <p className="mt-2 text-xs font-semibold text-slate-400">
            Nenhuma ordem demo registrada
          </p>

          <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
            As ordens simuladas aceitas aparecerão aqui.
          </p>
        </div>
      ) : (
        <div className="mt-4 space-y-2">
          {history.map((item) => {
            const accepted =
              item.response.status === 'ACCEPTED';

            return (
              <article
                key={item.id}
                className="rounded-xl border border-white/[0.05] bg-ink-800/45 p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-ink-700 px-2 py-1 font-mono text-[10px] font-bold text-slate-200">
                        {item.request.asset}
                      </span>

                      <span
                        className={`text-[10px] font-bold ${
                          item.request.side === 'BUY'
                            ? 'text-bull-400'
                            : 'text-bear-400'
                        }`}
                      >
                        {item.request.side}
                      </span>
                    </div>

                    <p className="mt-2 text-[10px] text-slate-600">
                      {new Date(
                        item.createdAt,
                      ).toLocaleString('pt-BR')}
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                      accepted
                        ? 'bg-bull-500/10 text-bull-400'
                        : 'bg-bear-500/10 text-bear-400'
                    }`}
                  >
                    {accepted
                      ? 'ACEITA'
                      : item.response.status}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <MiniStat
                    label="Qtd."
                    value={`${item.request.quantity}`}
                  />

                  <MiniStat
                    label="Entrada"
                    value={formatPrice(
                      item.request.asset,
                      item.request.entry,
                    )}
                  />

                  <MiniStat
                    label="Stop"
                    value={formatPrice(
                      item.request.asset,
                      item.request.stop,
                    )}
                    tone="bear"
                  />

                  <MiniStat
                    label="Alvo"
                    value={formatPrice(
                      item.request.asset,
                      item.request.target,
                    )}
                    tone="bull"
                  />
                </div>

                <p className="mt-3 text-[10px] leading-relaxed text-slate-500">
                  {item.response.message}
                </p>

                {item.response.brokerOrderId && (
                  <p className="mt-1 truncate font-mono text-[9px] text-slate-700">
                    ID: {item.response.brokerOrderId}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      )}
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
  tone?: 'bull' | 'bear';
}) {
  return (
    <div className="rounded-lg bg-ink-900/45 p-2 text-center">
      <div className="text-[8px] font-semibold uppercase tracking-wider text-slate-700">
        {label}
      </div>

      <div
        className={`mt-0.5 truncate font-mono text-[10px] font-bold ${
          tone === 'bull'
            ? 'text-bull-400'
            : tone === 'bear'
              ? 'text-bear-400'
              : 'text-slate-300'
        }`}
      >
        {value}
      </div>
    </div>
  );
}