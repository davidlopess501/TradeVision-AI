/**
 * O provedor real ainda não é registrado automaticamente.
 *
 * A função segura da Finnhub já funciona em /api/quote,
 * mas ela será usada apenas para testar a conexão com AAPL.
 *
 * WIN e WDO continuam em modo Simulado/Demo até conectarmos
 * um provedor compatível com os contratos da B3.
 */
export function registerRealMarketDataProvider(): boolean {
  return false;
}