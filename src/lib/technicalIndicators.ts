/**
 * Calcula a Média Móvel Exponencial.
 *
 * O primeiro valor utiliza uma média simples do período inicial.
 * Os valores seguintes utilizam a fórmula exponencial.
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