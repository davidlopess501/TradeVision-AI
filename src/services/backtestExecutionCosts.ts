export interface BacktestExecutionCostConfig {
  /**
   * Slippage adverso, em ticks, aplicado em cada lado da operação:
   * entrada e saída.
   *
   * Exemplo:
   * 1 tick por lado = 2 ticks de impacto total no round trip.
   */
  slippageTicksPerSide: number;

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

  /**
   * Valor financeiro de 1 ponto do ativo, por contrato.
   */
  moneyPerPoint: number;

  /**
   * Tamanho mínimo de variação do ativo em pontos.
   *
   * WIN: 5
   * WDO: 0.5
   */
  tickSize: number;

  config: BacktestExecutionCostConfig;
}

function nonNegative(
  value: number,
): number {
  return Math.max(
    0,
    value,
  );
}

export function applyBacktestExecutionCosts({
  grossPnl,
  quantity,
  moneyPerPoint,
  tickSize,
  config,
}: ApplyBacktestExecutionCostsParams): BacktestExecutionCostResult {
  const safeQuantity =
    Math.max(
      0,
      quantity,
    );

  const safeTickSize =
    nonNegative(
      tickSize,
    );

  const slippageTicksPerSide =
    nonNegative(
      config.slippageTicksPerSide,
    );

  const fixedCostPerContractRoundTrip =
    nonNegative(
      config.fixedCostPerContractRoundTrip,
    );

  const slippagePointsPerSide =
    slippageTicksPerSide *
    safeTickSize;

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