import type { Asset, RiskSettings, RiskCalculation } from '@/types';
import { ASSETS } from '@/lib/assets';

/**
 * Position sizing & risk calculation.
 *
 * For futures mini-contracts the math is:
 *   riskValue = capital * riskPct%
 *   riskPerContract = stopPoints * pointValue
 *   contracts = floor(riskValue / riskPerContract)  (min 1)
 *
 * A 1:2 reward/risk is used for the suggested target by default, but the
 * suggested target here is expressed in points from entry, matching the
 * stop distance the user entered.
 */
export function calculateRisk(asset: Asset, settings: RiskSettings): RiskCalculation {
  const info = ASSETS[asset];
  const riskValue = settings.capital * (settings.riskPerTradePct / 100);
  const pointValue = info.tickValue / info.tick; // R$ per point per contract
  const riskPerContract = settings.stopPoints * pointValue;
  const contracts = riskPerContract > 0 ? Math.max(1, Math.floor(riskValue / riskPerContract)) : 0;
  const actualRisk = contracts * riskPerContract;
  const rewardRiskRatio = 2; // default 1:2
  const suggestedTarget = settings.stopPoints * rewardRiskRatio;
  return {
    contracts,
    riskValue: actualRisk,
    rewardRiskRatio,
    suggestedTarget,
  };
}

export function riskPerContractValue(asset: Asset, stopPoints: number): number {
  const info = ASSETS[asset];
  const pointValue = info.tickValue / info.tick;
  return stopPoints * pointValue;
}
