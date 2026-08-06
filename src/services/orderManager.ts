import type {
  AnalysisResult,
  Asset,
} from '@/types';

import type {
  DecisionResult,
} from './decisionEngine';

export type OrderSide =
  | 'BUY'
  | 'SELL';

export type PreparedOrderStatus =
  | 'READY'
  | 'BLOCKED';

export interface PreparedOrder {
  id: string;
  asset: Asset;
  side: OrderSide | null;
  entry: number;
  stop: number;
  target: number;
  confidence: number;
  status: PreparedOrderStatus;
  reason: string;
  createdAt: number;
}

function uid(): string {
  return (
    crypto.randomUUID?.() ??
    `${Math.random()
      .toString(36)
      .slice(2)}-${Date.now()}`
  );
}

export function prepareOrder(
  analysis: AnalysisResult,
  decision: DecisionResult,
): PreparedOrder {
  if (decision.action === 'WAIT') {
    return {
      id: uid(),
      asset: analysis.asset,
      side: null,
      entry: analysis.entry,
      stop: analysis.stop,
      target: analysis.target,
      confidence: decision.confidence,
      status: 'BLOCKED',
      reason:
        'Nenhuma ordem preparada porque o Decision Engine recomendou aguardar.',
      createdAt: Date.now(),
    };
  }

  const hasValidLevels =
    Number.isFinite(analysis.entry) &&
    Number.isFinite(analysis.stop) &&
    Number.isFinite(analysis.target) &&
    analysis.entry > 0 &&
    analysis.stop > 0 &&
    analysis.target > 0;

  if (!hasValidLevels) {
    return {
      id: uid(),
      asset: analysis.asset,
      side: decision.action,
      entry: analysis.entry,
      stop: analysis.stop,
      target: analysis.target,
      confidence: decision.confidence,
      status: 'BLOCKED',
      reason:
        'A ordem foi bloqueada porque entrada, stop ou alvo são inválidos.',
      createdAt: Date.now(),
    };
  }

  const risk =
    Math.abs(
      analysis.entry -
        analysis.stop,
    );

  const reward =
    Math.abs(
      analysis.target -
        analysis.entry,
    );

  if (
    risk <= 0 ||
    reward <= 0
  ) {
    return {
      id: uid(),
      asset: analysis.asset,
      side: decision.action,
      entry: analysis.entry,
      stop: analysis.stop,
      target: analysis.target,
      confidence: decision.confidence,
      status: 'BLOCKED',
      reason:
        'A ordem foi bloqueada porque o risco ou o retorno calculado é inválido.',
      createdAt: Date.now(),
    };
  }

  return {
    id: uid(),
    asset: analysis.asset,
    side: decision.action,
    entry: analysis.entry,
    stop: analysis.stop,
    target: analysis.target,
    confidence: decision.confidence,
    status: 'READY',
    reason:
      'Ordem preparada para revisão manual. Nenhum envio à corretora foi realizado.',
    createdAt: Date.now(),
  };
}