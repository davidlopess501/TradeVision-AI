export interface BacktestExecutionCostConfig {
  /**
   * Slippage adverso, em pontos, aplicado em cada lado da operação:
   * entrada e saída.
   *
   * Exemplo:
   * 5 pontos por lado = 10 pontos de impacto total no round trip.
   */
  slippagePointsPerSide: number;

  /**
   * Custo financeiro fixo do round trip por contrato.
   *
   * Deve representar a soma dos custos que você quiser modelar
   * (corretagem, emolumentos, taxas etc.).
   */
  fixedCostPerContractRoundTrip: number;
}

export interface BacktestExecutionCostResult {
  grossPnl: number;
  slippageCost: number;
  fixedCost: number;
  totalCost: number;
  netPnl: number;
}

interface ApplyBacktestExecutionCostsParams {
  grossPnl: number;
  quantity: number;
  moneyPerPoint: number;
  config: BacktestExecutionCostConfig;
}

function nonNegative(
  value: number,
): number {
  return Math.max(0, value);
}

export function applyBacktestExecutionCosts({
  grossPnl,
  quantity,
  moneyPerPoint,
  config,
}: ApplyBacktestExecutionCostsParams): BacktestExecutionCostResult {
  const safeQuantity =
    Math.max(
      0,
      quantity,
    );

  const slippagePointsPerSide =
    nonNegative(
      config.slippagePointsPerSide,
    );

  const fixedCostPerContractRoundTrip =
    nonNegative(
      config.fixedCostPerContractRoundTrip,
    );

  const roundTripSlippagePoints =
    slippagePointsPerSide * 2;

  const slippageCost =
    roundTripSlippagePoints *
    moneyPerPoint *
    safeQuantity;

  const fixedCost =
    fixedCostPerContractRoundTrip *
    safeQuantity;

  const totalCost =
    slippageCost +
    fixedCost;

  return {
    grossPnl,
    slippageCost,
    fixedCost,
    totalCost,
    netPnl:
      grossPnl -
      totalCost,
  };
}