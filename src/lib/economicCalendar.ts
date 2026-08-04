import type { EconomicEvent, NewsItem, EventType, EventImpact, ICalendarProvider } from '@/types';

/**
 * Calendário Econômico & Notícias
 *
 * Simulated provider that generates economic events, B3 events, market
 * hours, contract expiries, and news. The ICalendarProvider interface
 * is the contract the Market screen depends on — a real news/calendar
 * API can implement it and be swapped in via the factory without
 * changing the UI.
 */

function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const DAY = 24 * 60 * 60 * 1000;

function startOfDay(ts: number): number {
  const d = new Date(ts);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function uid(i: number): string {
  return `cal-${i}-${Math.floor(Math.random() * 1e6).toString(36)}`;
}

const EVENT_TEMPLATES: { title: string; description: string; type: EventType; impact: EventImpact; source: string; hour: number }[] = [
  { title: 'Abertura do pregão B3', description: 'Início das negociações no mercado a vista', type: 'OPEN', impact: 'LOW', source: 'B3', hour: 10 },
  { title: 'Índice IPCA', description: 'Divulgação da inflação oficial mensal pelo IBGE', type: 'NEWS', impact: 'HIGH', source: 'IBGE', hour: 9 },
  { title: 'Decisão Copom', description: 'Decisão sobre a taxa Selic pelo Banco Central', type: 'NEWS', impact: 'HIGH', source: 'Banco Central', hour: 18 },
  { title: 'NFP — Payroll dos EUA', description: 'Relatório de empregos não-agrícolas dos EUA', type: 'NEWS', impact: 'HIGH', source: 'Bureau of Labor', hour: 9 },
  { title: 'Fechamento do pregão B3', description: 'Encerramento das negociações do dia', type: 'CLOSE', impact: 'LOW', source: 'B3', hour: 17 },
  { title: 'Vencimento WIN', description: 'Vencimento dos contratos de Mini Índice', type: 'EXPIRY', impact: 'HIGH', source: 'B3', hour: 13 },
  { title: 'Vencimento WDO', description: 'Vencimento dos contratos de Mini Dólar', type: 'EXPIRY', impact: 'HIGH', source: 'B3', hour: 13 },
  { title: 'Leilão de câmbio', description: 'Leilão de dólares pelo Banco Central', type: 'B3_EVENT', impact: 'MEDIUM', source: 'Banco Central', hour: 10 },
  { title: 'Balança comercial', description: 'Dados de exportação e importação', type: 'NEWS', impact: 'MEDIUM', source: 'MDIC', hour: 8 },
  { title: 'Índice PMI', description: 'Índice de gerentes de compra — setor serviços', type: 'NEWS', impact: 'MEDIUM', source: 'IHS Markit', hour: 9 },
  { title: 'PIB mensal', description: 'Preview do Produto Interno Bruto mensal', type: 'NEWS', impact: 'MEDIUM', source: 'IBGE', hour: 9 },
  { title: 'Discurso Fed', description: 'Discurso de membro do Federal Reserve', type: 'NEWS', impact: 'MEDIUM', source: 'Federal Reserve', hour: 15 },
];

const NEWS_TEMPLATES: { headline: string; summary: string; impact: EventImpact; source: string }[] = [
  { headline: 'Dólar recua com fluxo externo positivo', summary: 'Moeda americana perde força após dados econômicos nos EUA', impact: 'MEDIUM', source: 'InfoMoney' },
  { headline: 'Ibovespa opera em alta no pregão', summary: 'Índice busca recuperar perdas da sessão anterior', impact: 'MEDIUM', source: 'Reuters' },
  { headline: 'Copom mantém Selic em 10,75%', summary: 'Decisão foi unânime e acompanha expectativas do mercado', impact: 'HIGH', source: 'Banco Central' },
  { headline: 'Dados de emprego nos EUA superam expectativas', summary: 'Payroll gera volatilidade em mini dólar e índice', impact: 'HIGH', source: 'Bloomberg' },
  { headline: 'Volume acima da média no mini índice', summary: 'Movimento institucional eleva liquidez no WIN', impact: 'LOW', source: 'B3' },
  { headline: 'Mercado aguarda dados de inflação', summary: 'Investidores posicionam antes do IPCA', impact: 'MEDIUM', source: 'Valor Econômico' },
  { headline: 'Tesouro Direto: taxas em queda', summary: 'Juros futuros recuam com cenário externo', impact: 'LOW', source: 'Tesouro Nacional' },
  { headline: 'Vencimento de derivativos impacta fluxo', summary: 'Rollover de posições gera aumento de volume', impact: 'HIGH', source: 'B3' },
];

export class SimulatedCalendarProvider implements ICalendarProvider {
  readonly name = 'Simulado';

  async getEvents(): Promise<EconomicEvent[]> {
    const rng = mulberry32(hashStr(`events-${Math.floor(Date.now() / 60000)}`));
    const today = startOfDay(Date.now());
    const events: EconomicEvent[] = [];

    for (let d = 0; d < 7; d++) {
      const count = 2 + Math.floor(rng() * 3);
      for (let i = 0; i < count; i++) {
        const tpl = EVENT_TEMPLATES[Math.floor(rng() * EVENT_TEMPLATES.length)];
        events.push({
          id: uid(d * 10 + i),
          title: tpl.title,
          description: tpl.description,
          type: tpl.type,
          impact: tpl.impact,
          date: today + d * DAY + tpl.hour * 3_600_000,
          source: tpl.source,
        });
      }
    }

    events.push({ id: uid(100), title: 'Abertura do pregão B3', description: 'Início das negociações', type: 'OPEN', impact: 'LOW', date: today + 10 * 3_600_000, source: 'B3' });
    events.push({ id: uid(101), title: 'Fechamento do pregão B3', description: 'Encerramento das negociações', type: 'CLOSE', impact: 'LOW', date: today + 17 * 3_600_000 + 30 * 60_000, source: 'B3' });

    return events.sort((a, b) => a.date - b.date);
  }

  async getNews(): Promise<NewsItem[]> {
    const rng = mulberry32(hashStr(`news-${Math.floor(Date.now() / 60000)}`));
    const now = Date.now();
    return NEWS_TEMPLATES.map((tpl, i) => ({
      id: `news-${i}`,
      headline: tpl.headline,
      summary: tpl.summary,
      impact: tpl.impact,
      date: now - Math.floor(rng() * 6 * 60) * 60_000,
      source: tpl.source,
    }));
  }
}

let _provider: ICalendarProvider = new SimulatedCalendarProvider();

export function getCalendarProvider(): ICalendarProvider {
  return _provider;
}

export function setCalendarProvider(provider: ICalendarProvider): void {
  _provider = provider;
}

export const IMPACT_TONE: Record<EventImpact, { text: string; bg: string; ring: string; dot: string; label: string }> = {
  LOW: { text: 'text-bull-400', bg: 'bg-bull-500/10', ring: 'ring-bull-500/20', dot: 'bg-bull-500', label: 'Baixo' },
  MEDIUM: { text: 'text-gold-400', bg: 'bg-gold-500/10', ring: 'ring-gold-500/20', dot: 'bg-gold-500', label: 'Médio' },
  HIGH: { text: 'text-bear-400', bg: 'bg-bear-500/10', ring: 'ring-bear-500/20', dot: 'bg-bear-500', label: 'Alto' },
};

export const EVENT_TYPE_LABEL: Record<EventType, string> = {
  NEWS: 'Notícia',
  B3_EVENT: 'Evento B3',
  OPEN: 'Abertura',
  CLOSE: 'Fechamento',
  EXPIRY: 'Vencimento',
};

export function todaysHighImpactEvents(events: EconomicEvent[]): EconomicEvent[] {
  const today = startOfDay(Date.now());
  const tomorrow = today + DAY;
  return events.filter((e) => e.date >= today && e.date < tomorrow && e.impact === 'HIGH');
}
