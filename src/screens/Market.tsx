import { useEffect, useState } from 'react';
import type { Asset, Timeframe, Candle, Quote, EconomicEvent, NewsItem, EventImpact } from '@/types';
import { getMarketDataProvider } from '@/services/types';
import { getCalendarProvider, IMPACT_TONE, EVENT_TYPE_LABEL, todaysHighImpactEvents } from '@/lib/economicCalendar';
import { ASSET_LIST, TIMEFRAMES, formatPrice, formatTime, formatDate } from '@/lib/assets';
import { CandleChart } from '@/components/ui/CandleChart';
import { Sparkline } from '@/components/ui/Sparkline';
import { TrendingUp, DollarSign, RefreshCw, ArrowUp, ArrowDown, Calendar, Newspaper, AlertTriangle, Clock, Building2, Bell } from 'lucide-react';

const ASSET_ICON: Record<Asset, typeof TrendingUp> = { WIN: TrendingUp, WDO: DollarSign };

const EVENT_ICON: Record<string, typeof Calendar> = {
  NEWS: Newspaper,
  B3_EVENT: Building2,
  OPEN: Clock,
  CLOSE: Clock,
  EXPIRY: Calendar,
};

export default function Market() {
  const provider = getMarketDataProvider();
  const calendarProvider = getCalendarProvider();
  const [asset, setAsset] = useState<Asset>('WIN');
  const [timeframe, setTimeframe] = useState<Timeframe>('5m');
  const [candles, setCandles] = useState<Candle[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [impactFilter, setImpactFilter] = useState<EventImpact | 'ALL'>('ALL');

  useEffect(() => {
    let alive = true;
    setLoading(true);
    async function load() {
      const [c, q] = await Promise.all([provider.getCandles(asset, timeframe, 48), provider.getQuote(asset)]);
      if (!alive) return;
      setCandles(c);
      setQuote(q);
      setLoading(false);
    }
    void load();
    const unsub = provider.subscribeQuotes(asset, (q) => { if (alive) setQuote(q); });
    return () => { alive = false; unsub(); };
  }, [provider, asset, timeframe]);

  useEffect(() => {
    let alive = true;
    async function loadCalendar() {
      const [e, n] = await Promise.all([calendarProvider.getEvents(), calendarProvider.getNews()]);
      if (!alive) return;
      setEvents(e);
      setNews(n);
    }
    void loadCalendar();
    return () => { alive = false; };
  }, [calendarProvider]);

  const up = (quote?.changePct ?? 0) >= 0;
  const sparkPoints = candles.map((c, i) => ({ x: i, y: c.close }));
  const highImpactToday = todaysHighImpactEvents(events);
  const filteredEvents = impactFilter === 'ALL' ? events : events.filter((e) => e.impact === impactFilter);

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Mercado</h2>
        <p className="text-xs text-slate-500">Cotações, calendário econômico e notícias</p>
      </section>

      {/* Volatility alert */}
      {highImpactToday.length > 0 && (
        <section className="animate-fade-up rounded-2xl border border-bear-500/30 bg-bear-500/[0.06] p-4 ring-1 ring-bear-500/15">
          <div className="flex items-start gap-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-bear-500/15 text-bear-400">
              <AlertTriangle className="h-5 w-5" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-bold text-bear-400">Alerta de volatilidade</div>
              <p className="mt-0.5 text-xs text-slate-300">
                {highImpactToday.length} evento{highImpactToday.length > 1 ? 's' : ''} de alto impacto hoje pode aumentar a volatilidade:
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {highImpactToday.map((e: EconomicEvent) => (
                  <span key={e.id} className="rounded-md bg-bear-500/10 px-2 py-1 text-[10px] font-semibold text-bear-300">
                    {formatTime(e.date)} · {e.title}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Asset selector */}
      <section className="animate-fade-up grid grid-cols-2 gap-2">
        {ASSET_LIST.map((a) => {
          const Icon = ASSET_ICON[a.code];
          const isActive = asset === a.code;
          return (
            <button key={a.code} onClick={() => setAsset(a.code)} className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 transition-all ${isActive ? 'border-accent-500/60 bg-accent-500/10' : 'border-white/[0.06] bg-ink-850/60 hover:bg-ink-800'}`}>
              <Icon className={`h-4 w-4 ${isActive ? 'text-accent-300' : 'text-slate-500'}`} />
              <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{a.code}</span>
            </button>
          );
        })}
      </section>

      {/* Quote */}
      <section className="card animate-fade-up p-4">
        <div className="flex items-start justify-between">
          <div>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Cotação</span>
            <div className="font-mono text-3xl font-bold tabular text-white">{quote ? formatPrice(asset, quote.price) : '—'}</div>
          </div>
          {quote && (
            <span className={`flex items-center gap-1 rounded-md px-2 py-1 text-sm font-bold ${up ? 'bg-bull-500/10 text-bull-400' : 'bg-bear-500/10 text-bear-400'}`}>
              {up ? <ArrowUp className="h-4 w-4" /> : <ArrowDown className="h-4 w-4" />}
              {Math.abs(quote.changePct).toFixed(2)}%
            </span>
          )}
        </div>
        {quote && (
          <div className="mt-3 grid grid-cols-4 gap-2">
            <Mini label="Abertura" value={formatPrice(asset, quote.open)} />
            <Mini label="Máxima" value={formatPrice(asset, quote.high)} />
            <Mini label="Mínima" value={formatPrice(asset, quote.low)} />
            <Mini label="Spread" value={`${quote.spread}`} />
          </div>
        )}
        <p className="mt-2 text-right text-[10px] text-slate-600 tabular">{quote ? formatTime(quote.updatedAt) : ''} · atualização a cada 4s</p>
      </section>

      {/* Timeframe + Candles */}
      <section className="animate-fade-up grid grid-cols-4 gap-1.5 rounded-lg border border-white/[0.06] bg-ink-850/60 p-1.5">
        {TIMEFRAMES.map((tf) => (
          <button key={tf.value} onClick={() => setTimeframe(tf.value)} className={`rounded-md px-2 py-2 text-xs font-bold transition-all ${timeframe === tf.value ? 'bg-accent-500 text-white' : 'text-slate-400 hover:bg-ink-800'}`}>{tf.value}</button>
        ))}
      </section>

      <section className="card animate-fade-up p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Candles · {timeframe}</h3>
          {loading && <RefreshCw className="h-3.5 w-3.5 animate-spin-slow text-slate-500" />}
        </div>
        <div className="overflow-x-auto no-scrollbar">
          <CandleChart candles={candles} width={340} height={180} className="w-full" />
        </div>
      </section>

      {/* Volume + trend mini */}
      <section className="grid grid-cols-2 gap-3 animate-fade-up">
        <div className="card p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Volume (curva)</h3>
          <div className="mt-2">
            <Sparkline points={candles.map((c, i) => ({ x: i, y: c.volume }))} width={150} height={48} positive />
          </div>
        </div>
        <div className="card p-4">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">Fechamentos</h3>
          <div className="mt-2">
            <Sparkline points={sparkPoints} width={150} height={48} positive={up} />
          </div>
        </div>
      </section>

      {/* Economic Calendar */}
      <section className="animate-fade-up">
        <div className="mb-2 flex items-center gap-2">
          <Calendar className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-bold text-white">Calendário econômico</h3>
        </div>

        {/* Impact filter */}
        <div className="mb-3 flex gap-1.5">
          {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((imp) => (
            <button key={imp} onClick={() => setImpactFilter(imp)} className={`rounded-full px-3 py-1.5 text-[11px] font-bold transition-all ${impactFilter === imp ? 'bg-accent-500 text-white' : 'bg-ink-850 text-slate-400 hover:bg-ink-800'}`}>
              {imp === 'ALL' ? 'Todos' : IMPACT_TONE[imp as EventImpact].label}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          <ul className="divide-y divide-white/[0.04]">
            {filteredEvents.slice(0, 15).map((e) => {
              const EvIcon = EVENT_ICON[e.type] ?? Calendar;
              const tone = IMPACT_TONE[e.impact];
              return (
                <li key={e.id} className="flex items-start gap-3 px-4 py-3">
                  <span className="mt-0.5 flex flex-col items-center">
                    <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <EvIcon className="h-3.5 w-3.5 shrink-0 text-slate-500" />
                      <span className="truncate text-xs font-bold text-slate-200">{e.title}</span>
                    </div>
                    <p className="mt-0.5 truncate text-[11px] text-slate-500">{e.description}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-600">
                      <span className="tabular">{formatDate(e.date)} · {formatTime(e.date)}</span>
                      <span>·</span>
                      <span>{e.source}</span>
                      <span>·</span>
                      <span>{EVENT_TYPE_LABEL[e.type]}</span>
                    </div>
                  </div>
                  <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${tone.bg} ${tone.text}`}>
                    {tone.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* News */}
      <section className="animate-fade-up pb-2">
        <div className="mb-2 flex items-center gap-2">
          <Newspaper className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-bold text-white">Notícias importantes</h3>
        </div>
        <div className="space-y-2">
          {news.map((n) => {
            const tone = IMPACT_TONE[n.impact];
            return (
              <div key={n.id} className="card flex items-start gap-3 p-3.5">
                <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${tone.dot}`} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-slate-200">{n.headline}</span>
                    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold ${tone.bg} ${tone.text}`}>{tone.label}</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-500">{n.summary}</p>
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-slate-600">
                    <span>{n.source}</span>
                    <span>·</span>
                    <span className="tabular">{formatTime(n.date)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* API readiness note */}
      <section className="card animate-fade-up flex items-start gap-3 p-4">
        <Bell className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
        <p className="text-xs leading-relaxed text-slate-400">
          Calendário e notícias usam dados simulados. A estrutura já está pronta para integração com APIs reais de notícias e calendário econômico — basta conectar um provedor que implemente a mesma interface.
        </p>
      </section>
    </div>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-800/50 p-2 text-center">
      <div className="text-[9px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className="mt-0.5 font-mono text-[11px] font-semibold tabular text-slate-300">{value}</div>
    </div>
  );
}
