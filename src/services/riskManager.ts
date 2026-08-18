import type {
  Asset,
} from '@/types';

import type {
  PreparedOrder,
} from './orderManager';

import {
  ASSETS,
} from '@/lib/assets';

export type RiskDecision =
  | 'APPROVED'
  | 'BLOCKED';

export interface RiskRules {
  capital: number;
  riskPerTradePct: number;
  maxContracts: number;
  maxDailyLoss: number;
  minRiskReward: number;
  maxOpenPositions: number;
}

export interface RiskContext {
  dailyPnl: number;
  openPositions: number;
}

export interface RiskEvaluation {
  decision: RiskDecision;
  quantity: number;
  maxRiskAmount: number;
  estimatedRiskAmount: number;
  estimatedRewardAmount: number;
  riskRewardRatio: number;
  riskPoints: number;
  rewardPoints: number;
  reason: string;
  warnings: string[];
}

/*
 * Regras padrão.
 *
 * Continuam valendo para o WIN.
 */
export const DEFAULT_RISK_RULES: RiskRules = {
  capital: 10000,
  riskPerTradePct: 1,
  maxContracts: 5,
  maxDailyLoss: 300,
  minRiskReward: 1.5,
  maxOpenPositions: 1,
};

/*
 * WDO — PERFIL DE RISCO V1
 *
 * Capital de referência: R$ 10.000
 * Risco máximo por operação: 5% = R$ 500
 * Máximo de 1 contrato por operação.
 *
 * Com stop de 17,5 pontos:
 *
 * 17,5 × R$ 10 = R$ 175
 *
 * Portanto 1 contrato cabe dentro do limite.
 */
export const WDO_RISK_RULES: RiskRules = {
  capital: 10000,
  riskPerTradePct: 5,
  maxContracts: 1,
  maxDailyLoss: 500,
  minRiskReward: 1.5,
  maxOpenPositions: 1,
};

export function getRiskRulesForAsset(
  asset: Asset,
): RiskRules {
  if (asset === 'WDO') {
    return WDO_RISK_RULES;
  }

  return DEFAULT_RISK_RULES;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(
    minimum,
    Math.min(maximum, value),
  );
}

function finitePositive(
  value: number,
): boolean {
  return (
    Number.isFinite(value) &&
    value > 0
  );
}

function calculateMoneyPerPoint(
  asset: Asset,
): number {
  const assetInfo =
    ASSETS[asset];

  if (
    !finitePositive(assetInfo.tick) ||
    !finitePositive(assetInfo.tickValue)
  ) {
    throw new Error(
      `Configuração de tick inválida para ${asset}.`,
    );
  }

  return (
    assetInfo.tickValue /
    assetInfo.tick
  );
}

function validateOrderDirection(
  order: PreparedOrder,
): boolean {
  if (order.side === 'BUY') {
    return (
      order.stop < order.entry &&
      order.target > order.entry
    );
  }

  if (order.side === 'SELL') {
    return (
      order.stop > order.entry &&
      order.target < order.entry
    );
  }

  return false;
}

export function evaluateOrderRisk(
  order: PreparedOrder,

  /*
   * Se nenhuma regra for informada explicitamente:
   *
   * WIN -> DEFAULT_RISK_RULES
   * WDO -> WDO_RISK_RULES
   */
  rules: RiskRules =
    getRiskRulesForAsset(
      order.asset,
    ),

  context: RiskContext = {
    dailyPnl: 0,
    openPositions: 0,
  },
): RiskEvaluation {
  const warnings: string[] = [];

  if (
    order.status !== 'READY' ||
    !order.side
  ) {
    return {
      decision: 'BLOCKED',
      quantity: 0,
      maxRiskAmount: 0,
      estimatedRiskAmount: 0,
      estimatedRewardAmount: 0,
      riskRewardRatio: 0,
      riskPoints: 0,
      rewardPoints: 0,
      reason:
        'A ordem não está pronta para avaliação de risco.',
      warnings,
    };
  }

  if (
    !finitePositive(rules.capital) ||
    !finitePositive(
      rules.riskPerTradePct,
    ) ||
    !finitePositive(
      rules.maxContracts,
    ) ||
    !finitePositive(
      rules.maxDailyLoss,
    ) ||
    !finitePositive(
      rules.minRiskReward,
    ) ||
    !finitePositive(
      rules.maxOpenPositions,
    )
  ) {
    return {
      decision: 'BLOCKED',
      quantity: 0,
      maxRiskAmount: 0,
      estimatedRiskAmount: 0,
      estimatedRewardAmount: 0,
      riskRewardRatio: 0,
      riskPoints: 0,
      rewardPoints: 0,
      reason:
        'As regras de risco possuem valores inválidos.',
      warnings,
    };
  }

  if (
    context.openPositions >=
    rules.maxOpenPositions
  ) {
    return {
      decision: 'BLOCKED',
      quantity: 0,
      maxRiskAmount: 0,
      estimatedRiskAmount: 0,
      estimatedRewardAmount: 0,
      riskRewardRatio: 0,
      riskPoints: 0,
      rewardPoints: 0,
      reason:
        'Limite máximo de posições abertas atingido.',
      warnings,
    };
  }

  if (
    context.dailyPnl <=
    -Math.abs(
      rules.maxDailyLoss,
    )
  ) {
    return {
      decision: 'BLOCKED',
      quantity: 0,
      maxRiskAmount: 0,
      estimatedRiskAmount: 0,
      estimatedRewardAmount: 0,
      riskRewardRatio: 0,
      riskPoints: 0,
      rewardPoints: 0,
      reason:
        'Limite diário de perda atingido.',
      warnings,
    };
  }

  if (
    !validateOrderDirection(
      order,
    )
  ) {
    return {
      decision: 'BLOCKED',
      quantity: 0,
      maxRiskAmount: 0,
      estimatedRiskAmount: 0,
      estimatedRewardAmount: 0,
      riskRewardRatio: 0,
      riskPoints: 0,
      rewardPoints: 0,
      reason:
        'Entrada, stop e alvo não respeitam a direção da ordem.',
      warnings,
    };
  }

  const riskPoints =
    Math.abs(
      order.entry -
      order.stop,
    );

  const rewardPoints =
    Math.abs(
      order.target -
      order.entry,
    );

  if (
    !finitePositive(
      riskPoints,
    ) ||
    !finitePositive(
      rewardPoints,
    )
  ) {
    return {
      decision: 'BLOCKED',
      quantity: 0,
      maxRiskAmount: 0,
      estimatedRiskAmount: 0,
      estimatedRewardAmount: 0,
      riskRewardRatio: 0,
      riskPoints,
      rewardPoints,
      reason:
        'A distância do stop ou do alvo é inválida.',
      warnings,
    };
  }

  const riskRewardRatio =
    rewardPoints /
    riskPoints;

  if (
    riskRewardRatio <
    rules.minRiskReward
  ) {
    return {
      decision: 'BLOCKED',
      quantity: 0,
      maxRiskAmount: 0,
      estimatedRiskAmount: 0,
      estimatedRewardAmount: 0,
      riskRewardRatio,
      riskPoints,
      rewardPoints,
      reason:
        `Relação risco/retorno abaixo do mínimo de ${rules.minRiskReward.toFixed(
          2,
        )}.`,
      warnings,
    };
  }

  const moneyPerPoint =
    calculateMoneyPerPoint(
      order.asset,
    );

  const riskPerContract =
    riskPoints *
    moneyPerPoint;

  const rewardPerContract =
    rewardPoints *
    moneyPerPoint;

  const maxRiskAmount =
    rules.capital *
    clamp(
      rules.riskPerTradePct,
      0,
      100,
    ) /
    100;

  const contractsByRisk =
    Math.floor(
      maxRiskAmount /
      riskPerContract,
    );

  const quantity =
    Math.min(
      Math.floor(
        rules.maxContracts,
      ),
      contractsByRisk,
    );

  if (quantity < 1) {
    return {
      decision: 'BLOCKED',
      quantity: 0,
      maxRiskAmount,
      estimatedRiskAmount:
        riskPerContract,
      estimatedRewardAmount:
        rewardPerContract,
      riskRewardRatio,
      riskPoints,
      rewardPoints,
      reason:
        'O risco de um único contrato ultrapassa o limite permitido.',
      warnings,
    };
  }

  const estimatedRiskAmount =
    riskPerContract *
    quantity;

  const estimatedRewardAmount =
    rewardPerContract *
    quantity;

  if (
    context.dailyPnl < 0 &&
    Math.abs(
      context.dailyPnl,
    ) >=
      rules.maxDailyLoss *
        0.8
  ) {
    warnings.push(
      'A perda diária já atingiu pelo menos 80% do limite.',
    );
  }

  if (
    quantity ===
    rules.maxContracts
  ) {
    warnings.push(
      'A quantidade foi limitada pelo máximo de contratos.',
    );
  }

  return {
    decision: 'APPROVED',
    quantity,
    maxRiskAmount,
    estimatedRiskAmount,
    estimatedRewardAmount,
    riskRewardRatio,
    riskPoints,
    rewardPoints,
    reason:
      'Ordem aprovada pelo Risk Manager para simulação.',
    warnings,
  };
}