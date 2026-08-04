import { useEffect, useState } from 'react';
import type { Asset, AnalysisResult } from '@/types';
import { getMarketDataProvider } from '@/services/types';
import { useStore } from '@/store';
import { ASSET_LIST, formatDateTime } from '@/lib/assets';
import AssetCard from '@/components/AssetCard';
import { Radar, Plus, ShieldCheck, Brain, Bell, ArrowRight, Activity } from 'lucide-react';
import type { TabId } from '@/components/BottomNav';

type SubScreen = 'operation' | 'ai' | 'alerts' | 'market';

interface DashboardProps {
  onNavigate: (tab: TabId) => void;
  onOpenSub: (sub: SubScreen) => void;
  onAnalyzeAsset: (asset: Asset) => void;
}

export default function Dashboard({ onNavigate, onOpenSub, onAnalyzeAsset }: DashboardProps) {
  const provider = getMarketDataProvider();
  const { history, stats } = useStore();
  const [results, setResults] = useState<Partial<Record<Asset, AnalysisResult | null>>>({ WIN: null, WDO: null });
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);

  async function analyzeAll() {
    setScanning(true);
    setLoading(true);
    try {
      const [win, wdo] = await Promise.all([provider.analyze('WIN', '5m'), provider.analyze('WDO', '5m')]);
      setResults({ WIN: win, WDO: wdo });
    } finally {
      setLoading(false);
      setScanning(false);
    }
  }

  useEffect(() => {
    void analyzeAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <div className="flex items-end justify-between">
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">Dashboard</h2>
            <p className="text-xs text-slate-500">Visão geral dos ativos monitorados</p>
          </div>
          <span className="text-[11px] text-slate-600 tabular">{formatDateTime(Date.now())}</span>
        </div>
      </section>

      {/* Asset cards */}
      <section className="grid gap-3 sm:grid-cols-2">
        {ASSET_LIST.map((a) => (
          <div key={a.code} className="animate-fade-up">
            <AssetCard
              asset={a.code}
              result={results[a.code] ?? null}
              loading={loading}
              onClick={() => onAnalyzeAsset(a.code)}
            />
          </div>
        ))}
      </section>

      {/* Primary CTA */}
      <section className="animate-fade-up">
        <button
          onClick={analyzeAll}
          disabled={scanning}
          className="group relative flex w-full items-center justify-center gap-2.5 overflow-hidden rounded-2xl bg-gradient-to-r from-accent-500 to-accent-600 px-5 py-4 text-white shadow-lg shadow-accent-500/20 transition-all active:scale-[0.99] disabled:opacity-70"
        >
          <div className="absolute inset-0 bg-white/0 transition-colors group-hover:bg-white/10" />
          <Radar className={`h-5 w-5 ${scanning ? 'animate-spin-slow' : ''}`} strokeWidth={2.5} />
          <span className="text-sm font-bold tracking-wide">
            {scanning ? 'Analisando mercado...' : 'Analisar Mercado'}
          </span>
        </button>
      </section>

      {/* Quick actions */}
      <section className="animate-fade-up">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Ferramentas</h3>
        <div className="grid grid-cols-2 gap-3">
          <ToolButton icon={ShieldCheck} label="Gestão de Risco" desc="Calcule contratos e alvo" onClick={() => onOpenSub('operation')} />
          <ToolButton icon={Brain} label="IA & Decisão" desc="Explicação do sinal" onClick={() => onOpenSub('ai')} />
          <ToolButton icon={Activity} label="Mercado" desc="Cotações e candles" onClick={() => onOpenSub('market')} />
          <ToolButton icon={Bell} label="Alertas" desc="Sinais em tempo real" onClick={() => onOpenSub('alerts')} />
        </div>
      </section>

      {/* Snapshot stats */}
      <section className="animate-fade-up">
        <div className="flex items-center justify-between">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Desempenho</h3>
          <button onClick={() => onNavigate('backtest')} className="flex items-center gap-1 text-[11px] font-semibold text-accent-400 hover:text-accent-300">
            Ver backtest <ArrowRight className="h-3 w-3" />
          </button>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label="Taxa de acerto" value={`${stats.winRate.toFixed(0)}%`} tone={stats.winRate >= 50 ? 'bull' : 'bear'} />
          <StatCard label="Operações" value={`${stats.totalTrades}`} />
          <StatCard
            label="Lucro acum."
            value={stats.cumulativePnl >= 0 ? `+${stats.cumulativePnl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` : stats.cumulativePnl.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            tone={stats.cumulativePnl >= 0 ? 'bull' : 'bear'}
          />
        </div>
      </section>

      {/* Signal history preview */}
      <section className="animate-fade-up pb-2">
        <div className="flex items-center justify-between">
          <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Histórico de Sinais</h3>
          {history.length > 0 && (
            <button onClick={() => onNavigate('history')} className="flex items-center gap-1 text-[11px] font-semibold text-accent-400 hover:text-accent-300">
              Ver tudo <ArrowRight className="h-3 w-3" />
            </button>
          )}
        </div>
        <div className="card overflow-hidden">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 px-4 py-10 text-center">
              <div className="grid h-11 w-11 place-items-center rounded-full bg-ink-800">
                <Plus className="h-5 w-5 text-slate-600" />
              </div>
              <p className="text-sm font-medium text-slate-400">Nenhum sinal registrado</p>
              <p className="text-xs text-slate-600">Realize uma análise para gerar o histórico</p>
            </div>
          ) : (
            <ul className="divide-y divide-white/[0.04]">
              {history.slice(0, 4).map((h) => (
                <li key={h.id} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-ink-800 text-[11px] font-bold text-accent-300">{h.asset}</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{h.finalSignal === 'BUY' ? 'COMPRA' : h.finalSignal === 'SELL' ? 'VENDA' : 'AGUARDAR'}</div>
                      <div className="text-[11px] text-slate-600 tabular">{formatDateTime(h.createdAt)}</div>
                    </div>
                  </div>
                  <span className="font-mono text-sm font-bold tabular text-white">{h.score}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function ToolButton({
  icon: Icon,
  label,
  desc,
  onClick,
}: {
  icon: typeof ShieldCheck;
  label: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="group flex items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-850/70 p-3.5 text-left transition-all hover:border-white/[0.12] hover:bg-ink-800/80 active:scale-[0.99]"
    >
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-500/10 text-accent-300 transition-colors group-hover:bg-accent-500/20">
        <Icon className="h-4.5 w-4.5" strokeWidth={2.2} />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-bold text-white">{label}</span>
        <span className="block truncate text-[11px] text-slate-500">{desc}</span>
      </span>
    </button>
  );
}

function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' }) {
  return (
    <div className="card p-3.5">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div
        className={`mt-1 font-mono text-lg font-bold tabular ${
          tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-white'
        }`}
      >
        {value}
      </div>
    </div>
  );
}
