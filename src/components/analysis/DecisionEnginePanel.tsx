import type { Asset } from '@/types';

import type {
  DecisionResult,
} from '@/services/decisionEngine';

import type {
  PreparedOrder,
} from '@/services/orderManager';

import { formatPrice } from '@/lib/assets';

interface DecisionEnginePanelProps {
  asset: Asset;
  decision: DecisionResult;
  preparedOrder: PreparedOrder;
}

export function DecisionEnginePanel({
  asset,
  decision,
  preparedOrder,
}: DecisionEnginePanelProps) {
  return (
    <div className="space-y-5">
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