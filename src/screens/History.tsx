import { useState } from 'react';
import { useStore } from '@/store';
import { formatDateTime, formatPrice } from '@/lib/assets';
import { Trash2, Inbox, Filter } from 'lucide-react';
import type { Asset, AnalysisResult } from '@/types';

type Filter = 'all' | 'WIN' | 'WDO' | 'BUY' | 'SELL' | 'WAIT';

const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'WIN', label: 'WIN' },
  { value: 'WDO', label: 'WDO' },
  { value: 'BUY', label: 'Compra' },
  { value: 'SELL', label: 'Venda' },
  { value: 'WAIT', label: 'Aguardar' },
];

export default function History() {
  const { history, clearHistory } = useStore();
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = history.filter((h) => {
    if (filter === 'all') return true;
    if (filter === 'WIN' || filter === 'WDO') return h.asset === (filter as Asset);
    return h.finalSignal === filter;
  });

  return (
    <div className="space-y-5">
      <section className="animate-fade-up flex items-end justify-between">
        <div>
          <h2 className="text-lg font-extrabold tracking-tight text-white">Histórico</h2>
          <p className="text-xs text-slate-500">Sinais gerados pela análise</p>
        </div>
        {history.length > 0 && (
          <button onClick={clearHistory} className="flex items-center gap-1.5 rounded-lg bg-bear-500/10 px-3 py-1.5 text-xs font-bold text-bear-400 transition-colors hover:bg-bear-500/20">
            <Trash2 className="h-3.5 w-3.5" /> Limpar
          </button>
        )}
      </section>

      {/* Filters */}
      <section className="animate-fade-up flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <Filter className="h-3.5 w-3.5 shrink-0 text-slate-600" />
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-all ${filter === f.value ? 'bg-accent-500 text-white' : 'bg-ink-850 text-slate-400 hover:bg-ink-800'}`}
          >
            {f.label}
          </button>
        ))}
      </section>

      {/* List */}
      <section className="animate-fade-up pb-2">
        {filtered.length === 0 ? (
          <div className="card flex flex-col items-center justify-center gap-2 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-ink-800">
              <Inbox className="h-5 w-5 text-slate-600" />
            </div>
            <p className="text-sm font-medium text-slate-400">Nenhum sinal encontrado</p>
            <p className="text-xs text-slate-600">Realize análises na tela Análise para preencher o histórico</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {filtered.map((h) => (
              <HistoryRow key={h.id} item={h} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function HistoryRow({ item }: { item: AnalysisResult }) {
  const cfg =
    item.finalSignal === 'BUY'
      ? { text: 'text-bull-400', bg: 'bg-bull-500/10', label: 'COMPRA' }
      : item.finalSignal === 'SELL'
        ? { text: 'text-bear-400', bg: 'bg-bear-500/10', label: 'VENDA' }
        : { text: 'text-wait-400', bg: 'bg-wait-500/10', label: 'AGUARDAR' };

  return (
    <li className="card p-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-800 text-[11px] font-bold text-accent-300">{item.asset}</span>
          <div>
            <div className={`text-sm font-bold ${cfg.text}`}>{cfg.label}</div>
            <div className="text-[11px] text-slate-600 tabular">{formatDateTime(item.createdAt)} · {item.timeframe}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="font-mono text-lg font-bold tabular text-white">{item.score}</div>
          <div className="text-[9px] uppercase tracking-wider text-slate-600">score</div>
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between rounded-lg bg-ink-800/40 px-3 py-2">
        <span className={`rounded px-2 py-0.5 text-[10px] font-bold ${cfg.bg} ${cfg.text}`}>{item.trend}</span>
        <div className="flex items-center gap-3 text-[11px] tabular">
          <span className="text-slate-500">Conf. <span className="font-bold text-slate-300">{item.confidence}%</span></span>
          <span className="text-slate-500">Entrada <span className="font-bold text-slate-300">{formatPrice(item.asset, item.entry)}</span></span>
        </div>
      </div>
    </li>
  );
}
