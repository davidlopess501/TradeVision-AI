import type {
  RiskEvaluation,
  RiskRules,
} from '@/services/riskManager';

import {
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';

import {
  formatMoney,
} from '@/lib/assets';

interface RiskManagerPanelProps {
  evaluation: RiskEvaluation;
  rules: RiskRules;
}

export function RiskManagerPanel({
  evaluation,
  rules,
}: RiskManagerPanelProps) {
  const approved =
    evaluation.decision === 'APPROVED';

  return (
    <section className="card animate-fade-up p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {approved ? (
            <ShieldCheck className="h-4 w-4 text-bull-400" />
          ) : (
            <ShieldAlert className="h-4 w-4 text-bear-400" />
          )}

          <div>
            <h3 className="text-sm font-bold text-white">
              Risk Manager
            </h3>

            <p className="mt-0.5 text-[11px] text-slate-600">
              Validação financeira e operacional
            </p>
          </div>
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
            approved
              ? 'bg-bull-500/10 text-bull-400'
              : 'bg-bear-500/10 text-bear-400'
          }`}
        >
          {approved
            ? 'APROVADA'
            : 'BLOQUEADA'}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Contratos"
          value={`${evaluation.quantity}`}
        />

        <MiniStat
          label="Risco máximo"
          value={formatMoney(
            evaluation.maxRiskAmount,
          )}
        />

        <MiniStat
          label="Risco estimado"
          value={formatMoney(
            evaluation.estimatedRiskAmount,
          )}
          tone="bear"
        />

        <MiniStat
          label="Retorno estimado"
          value={formatMoney(
            evaluation.estimatedRewardAmount,
          )}
          tone="bull"
        />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MiniStat
          label="Risco/Retorno"
          value={
            evaluation.riskRewardRatio > 0
              ? `${evaluation.riskRewardRatio.toFixed(2)}x`
              : '—'
          }
        />

        <MiniStat
          label="Risco/op."
          value={`${rules.riskPerTradePct}%`}
        />

        <MiniStat
          label="Máx. contratos"
          value={`${rules.maxContracts}`}
        />

        <MiniStat
          label="Perda diária"
          value={formatMoney(
            rules.maxDailyLoss,
          )}
          tone="bear"
        />
      </div>

      <p className="mt-3 text-xs leading-relaxed text-slate-400">
        {evaluation.reason}
      </p>

      {evaluation.warnings.length > 0 && (
        <div className="mt-3 space-y-2">
          {evaluation.warnings.map(
            (warning) => (
              <div
                key={warning}
                className="rounded-lg border border-wait-500/20 bg-wait-500/5 px-3 py-2 text-[10px] leading-relaxed text-wait-400"
              >
                {warning}
              </div>
            ),
          )}
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
    <div className="rounded-lg bg-ink-800/60 p-2.5 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div
        className={`mt-0.5 truncate font-mono text-xs font-bold ${
          tone === 'bull'
            ? 'text-bull-400'
            : tone === 'bear'
              ? 'text-bear-400'
              : 'text-slate-200'
        }`}
      >
        {value}
      </div>
    </div>
  );
}