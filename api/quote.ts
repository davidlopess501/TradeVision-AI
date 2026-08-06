interface FinnhubQuote {
  c: number;
  d: number;
  dp: number;
  h: number;
  l: number;
  o: number;
  pc: number;
  t: number;
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'GET') {
      return Response.json(
        {
          error: 'Método não permitido.',
        },
        {
          status: 405,
          headers: {
            Allow: 'GET',
          },
        },
      );
    }

    const apiKey =
      process.env.FINNHUB_API_KEY;

    if (!apiKey) {
      return Response.json(
        {
          error:
            'A variável FINNHUB_API_KEY não foi configurada na Vercel.',
        },
        {
          status: 500,
        },
      );
    }

    const url = new URL(request.url);

    const symbol =
      url.searchParams
        .get('symbol')
        ?.trim()
        .toUpperCase() || 'AAPL';

    try {
      const response = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(
          symbol,
        )}`,
        {
          headers: {
            Accept: 'application/json',
            'X-Finnhub-Token': apiKey,
          },
        },
      );

      if (!response.ok) {
        return Response.json(
          {
            error:
              'A Finnhub recusou a consulta.',
            status: response.status,
          },
          {
            status: 502,
          },
        );
      }

      const quote =
        (await response.json()) as FinnhubQuote;

      if (
        typeof quote.c !== 'number' ||
        quote.c <= 0
      ) {
        return Response.json(
          {
            error:
              'A Finnhub não retornou uma cotação válida para esse símbolo.',
            symbol,
          },
          {
            status: 404,
          },
        );
      }

      return Response.json({
        provider: 'Finnhub',
        symbol,
        price: quote.c,
        change: quote.d,
        changePct: quote.dp,
        high: quote.h,
        low: quote.l,
        open: quote.o,
        previousClose: quote.pc,
        updatedAt: quote.t * 1000,
      });
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : 'Erro inesperado ao consultar a Finnhub.',
        },
        {
          status: 500,
        },
      );
    }
  },
};