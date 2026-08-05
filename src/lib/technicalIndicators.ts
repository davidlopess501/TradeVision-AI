/**
 * Calcula a Média Móvel Exponencial.
 */
export function calculateEMA(values: number[], period: number): number {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error('O período da EMA deve ser um número inteiro positivo.');
  }

  if (values.length < period) {
    throw new Error(
      `São necessários pelo menos ${period} valores para calcular a EMA.`,
    );
  }

  const initialValues = values.slice(0, period);

  let ema =
    initialValues.reduce((total, value) => total + value, 0) / period;

  const multiplier = 2 / (period + 1);

  for (let index = period; index < values.length; index += 1) {
    ema = (values[index] - ema) * multiplier + ema;
  }

  return ema;
}

/**
 * Calcula o RSI pelo método suavizado de Wilder.
 */
export function calculateRSI(
  values: number[],
  period = 14,
): number {
  if (!Number.isInteger(period) || period <= 0) {
    throw new Error('O período do RSI deve ser um número inteiro positivo.');
  }

  if (values.length <= period) {
    throw new Error(
      `São necessários pelo menos ${period + 1} valores para calcular o RSI.`,
    );
  }

  let gains = 0;
  let losses = 0;

  for (let index = 1; index <= period; index += 1) {
    const change = values[index] - values[index - 1];

    if (change >= 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  let averageGain = gains / period;
  let averageLoss = losses / period;

  for (let index = period + 1; index < values.length; index += 1) {
    const change = values[index] - values[index - 1];
    const gain = change > 0 ? change : 0;
    const loss = change < 0 ? Math.abs(change) : 0;

    averageGain =
      (averageGain * (period - 1) + gain) / period;

    averageLoss =
      (averageLoss * (period - 1) + loss) / period;
  }

  if (averageLoss === 0) {
    return 100;
  }

  const relativeStrength = averageGain / averageLoss;

  return 100 - 100 / (1 + relativeStrength);
}