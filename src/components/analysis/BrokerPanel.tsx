import {
  CheckCircle2,
  Link2,
  Loader2,
  Send,
  ShieldCheck,
  WalletCards,
  XCircle,
} from 'lucide-react';

import type {
  BrokerAccount,
  BrokerOrderResponse,
  BrokerStatus,
} from '@/services/brokerConnector';

import type {
  PreparedOrder,
} from '@/services/orderManager';

import { formatMoney } from '@/lib/assets';

export type BrokerActionState =
  | 'IDLE'
  | 'CONNECTING'
  | 'VALIDATING'
  | 'SENDING';

export interface BrokerFeedback {
  tone: 'neutral' | 'success' | 'error';
  message: string;
}

interface BrokerPanelProps {
  preparedOrder: PreparedOrder;
  brokerStatus: BrokerStatus;
  brokerAccount: BrokerAccount | null;
  brokerActionState: BrokerActionState;
  brokerFeedback: BrokerFeedback;
  lastBrokerOrder: BrokerOrderResponse | null;
  riskApproved: boolean;
  onConnect: () => void | Promise<void>;
  onValidate: () => void | Promise<void>;
  onSend: () => void | Promise<void>;
}

export function BrokerPanel({
  preparedOrder,
  brokerStatus,
  brokerAccount,
  brokerActionState,
  brokerFeedback,
  lastBrokerOrder,
  riskApproved,
  onConnect,
  onValidate,
  onSend,
}: BrokerPanelProps) {
  const connected =
    brokerStatus.connectionStatus ===
    'CONNECTED';

  const orderReady =
    preparedOrder.status === 'READY';

  return (
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
            connected
              ? 'bg-bull-500/10 text-bull-400'
              : 'bg-wait-500/10 text-wait-400'
          }`}
        >
          {connected
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
            void onConnect()
          }
          disabled={
            brokerActionState !== 'IDLE' ||
            connected
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-accent-500 px-3 py-2.5 text-xs font-bold text-white transition-colors hover:bg-accent-400 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {brokerActionState ===
          'CONNECTING' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Link2 className="h-4 w-4" />
          )}

          Conectar demo
        </button>

        <button
          type="button"
          onClick={() =>
            void onValidate()
          }
          disabled={
            brokerActionState !== 'IDLE' ||
            !connected
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-ink-800 px-3 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-ink-750 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {brokerActionState ===
          'VALIDATING' ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <ShieldCheck className="h-4 w-4" />
          )}

          Validar ordem
        </button>

        <button
          type="button"
          onClick={() =>
            void onSend()
          }
          disabled={
            brokerActionState !== 'IDLE' ||
            !connected ||
            !orderReady ||
            !riskApproved
          }
          className="flex items-center justify-center gap-2 rounded-lg bg-bull-500/15 px-3 py-2.5 text-xs font-bold text-bull-400 transition-colors hover:bg-bull-500/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {brokerActionState ===
          'SENDING' ? (
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
        {brokerFeedback.tone ===
        'success' ? (
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-bull-400" />
        ) : brokerFeedback.tone ===
          'error' ? (
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