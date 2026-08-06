import type {
  InstitutionalAnalysis,
  InstitutionalDecision,
  InstitutionalRisk,
} from '@/lib/institutionalAI';

import type {
  InstitutionalNarrative,
} from '@/lib/institutionalNarrative';

import {
  ArrowDownCircle,
  ArrowUpCircle,
  Brain,
  CircleDot,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  Target,
  AlertTriangle,
  CheckCircle2,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';

interface InstitutionalPanelProps {
  analysis: InstitutionalAnalysis;
  narrative: InstitutionalNarrative;
}

function decisionLabel(
  decision: InstitutionalDecision,
): string {
  if (decision === 'STRONG_BUY') {
    return 'COMPRA FORTE';
  }

  if (decision === 'BUY') {
    return 'COMPRA';
  }

  if (decision === 'STRONG_SELL') {
    return 'VENDA FORTE';
  }

  if (decision === 'SELL') {
    return 'VENDA';
  }

  return 'AGUARDAR';
}

function riskLabel(
  risk: InstitutionalRisk,
): string {
  if (risk === 'LOW') {
    return 'BAIXO';
  }

  if (risk === 'MEDIUM') {
    return 'MODERADO';
  }

  return 'ALTO';
}

export function InstitutionalPanel({
  analysis,
  narrative,
}: InstitutionalPanelProps) {
  const decisionConfig =
    analysis.signal === 'BUY'
      ? {
          text: 'text-bull-400',
          bg: 'bg-bull-500/10',
          ring: 'ring-bull-500/30',
          Icon: ArrowUpCircle,
        }
      : analysis.signal === 'SELL'
        ? {
            text: 'text-bear-400',
            bg: 'bg-bear-500/10',
            ring: 'ring-bear-500/30',
            Icon: ArrowDownCircle,
          }
        : {
            text: 'text-wait-400',
            bg: 'bg-wait-500/10',
            ring: 'ring-wait-500/20',
            Icon: CircleDot,
          };

  const riskConfig =
    analysis.risk === 'LOW'
      ? {
          text: 'text-bull-400',
          bg: 'bg-bull-500/10',
          Icon: ShieldCheck,
        }
      : analysis.risk === 'MEDIUM'
        ? {
            text: 'text-yellow-400',
            bg: 'bg-yellow-500/10',
            Icon: ShieldAlert,
          }
        : {
            text: 'text-bear-400',
            bg: 'bg-bear-500/10',
            Icon: ShieldX,
          };

  return (
    <section className="card animate-fade-up p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-500/10 text-accent-400">
            <Brain className="h-5 w-5" />
          </span>

          <div>
            <h3 className="text-sm font-bold text-white">
              Institutional AI
            </h3>

            <p className="text-[11px] text-slate-600">
              Confluência técnica e institucional
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="font-mono text-2xl font-extrabold text-white">
            {analysis.score}
          </div>

          <div className="text-[9px] uppercase tracking-wider text-slate-600">
            score
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat
          label="Confluência"
          value={`${analysis.confluence}%`}
        />

        <MiniStat
          label="Confiança"
          value={`${analysis.confidence}%`}
        />

        <div className={`rounded-lg p-2.5 text-center ${riskConfig.bg}`}>
          <riskConfig.Icon
            className={`mx-auto h-4 w-4 ${riskConfig.text}`}
          />

          <div className="mt-1 text-[9px] font-semibold uppercase tracking-wider text-slate-600">
            Risco
          </div>

          <div className={`font-bold ${riskConfig.text}`}>
            {riskLabel(analysis.risk)}
          </div>
        </div>
      </div>

      <div
        className={`mt-3 flex items-center justify-between rounded-xl px-4 py-3 ring-1 ${decisionConfig.bg} ${decisionConfig.ring}`}
      >
        <div className="flex items-center gap-2">
          <decisionConfig.Icon
            className={`h-6 w-6 ${decisionConfig.text}`}
          />

          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
              Decisão institucional
            </div>

            <div className={`text-lg font-extrabold ${decisionConfig.text}`}>
              {decisionLabel(analysis.decision)}
            </div>
          </div>
        </div>

        <div className="font-mono text-sm font-bold text-white">
          {analysis.confidence}%
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-ink-850/70 p-4">
        <div className="flex items-center gap-2">
          <Brain className="h-4 w-4 text-accent-400" />

          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Leitura institucional
          </h4>
        </div>

        <div className="mt-3 text-base font-extrabold text-white">
          {narrative.title}
        </div>

        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {narrative.marketReading}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <PlanCard
          label="Entrada"
          value={narrative.entry}
        />

        <PlanCard
          label="Stop"
          value={narrative.stop}
          tone="bear"
        />

        <PlanCard
          label="Alvo"
          value={narrative.target}
          tone="bull"
        />

        <PlanCard
          label="Risco/Retorno"
          value={narrative.riskReward}
        />
      </div>

      <div className="mt-4 rounded-xl bg-ink-800/50 p-4">
        <div className="flex items-center gap-2">
          <Target className="h-4 w-4 text-accent-400" />

          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Plano operacional
          </h4>
        </div>

        <p className="mt-2 text-sm leading-relaxed text-slate-300">
          {narrative.operationalPlan}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-bull-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-bull-400" />
              <span className="text-xs font-bold text-bull-400">
                Compra
              </span>
            </div>

            <span className="font-mono text-lg font-extrabold text-bull-400">
              {narrative.buyProbability}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-900">
            <div
              className="h-full rounded-full bg-bull-500 transition-all"
              style={{
                width: `${narrative.buyProbability}%`,
              }}
            />
          </div>
        </div>

        <div className="rounded-xl bg-bear-500/10 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingDown className="h-4 w-4 text-bear-400" />
              <span className="text-xs font-bold text-bear-400">
                Venda
              </span>
            </div>

            <span className="font-mono text-lg font-extrabold text-bear-400">
              {narrative.sellProbability}%
            </span>
          </div>

          <div className="mt-3 h-2 overflow-hidden rounded-full bg-ink-900">
            <div
              className="h-full rounded-full bg-bear-500 transition-all"
              style={{
                width: `${narrative.sellProbability}%`,
              }}
            />
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3 lg:grid-cols-2">
        <div className="rounded-xl border border-bull-500/15 bg-bull-500/5 p-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-bull-400" />

            <h4 className="text-xs font-bold uppercase tracking-wider text-bull-400">
              Confirmações
            </h4>
          </div>

          <div className="mt-3 space-y-2">
            {narrative.confirmations.length > 0 ? (
              narrative.confirmations.map((confirmation) => (
                <p
                  key={confirmation}
                  className="text-xs leading-relaxed text-slate-300"
                >
                  • {confirmation}
                </p>
              ))
            ) : (
              <p className="text-xs text-slate-500">
                Nenhuma confirmação dominante foi identificada.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-yellow-500/15 bg-yellow-500/5 p-4">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />

            <h4 className="text-xs font-bold uppercase tracking-wider text-yellow-400">
              Alertas
            </h4>
          </div>

          <div className="mt-3 space-y-2">
            {narrative.warnings.map((warning) => (
              <p
                key={warning}
                className="text-xs leading-relaxed text-slate-300"
              >
                • {warning}
              </p>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <MiniStat
          label="Positivos"
          value={`${analysis.positiveFactors}`}
          tone="bull"
        />

        <MiniStat
          label="Neutros"
          value={`${analysis.neutralFactors}`}
          tone="wait"
        />

        <MiniStat
          label="Negativos"
          value={`${analysis.negativeFactors}`}
          tone="bear"
        />
      </div>

      <div className="mt-4 space-y-2">
        {analysis.factors.map((factor) => {
          const factorConfig =
            factor.direction === 'BUY'
              ? {
                  text: 'text-bull-400',
                  label: 'COMPRA',
                }
              : factor.direction === 'SELL'
                ? {
                    text: 'text-bear-400',
                    label: 'VENDA',
                  }
                : {
                    text: 'text-wait-400',
                    label: 'NEUTRO',
                  };

          return (
            <div
              key={factor.key}
              className="rounded-lg bg-ink-800/50 px-3 py-2.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-semibold text-slate-300">
                  {factor.label}
                </span>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] text-slate-600">
                    peso {factor.weight}
                  </span>

                  <span
                    className={`text-[10px] font-bold ${factorConfig.text}`}
                  >
                    {factorConfig.label}
                  </span>
                </div>
              </div>

              <p className="mt-1 text-[10px] text-slate-600">
                {factor.explanation}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 rounded-lg border border-accent-500/10 bg-accent-500/5 p-3 text-xs leading-relaxed text-slate-300">
        {analysis.summary}
      </div>
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

function PlanCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'bull' | 'bear';
}) {
  return (
    <div className="rounded-xl bg-ink-800/60 p-3 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div
        className={`mt-1 font-mono text-sm font-bold ${
          tone === 'bull'
            ? 'text-bull-400'
            : tone === 'bear'
              ? 'text-bear-400'
              : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
