import { ShieldCheck, Brain, Activity, Bell, History as HistoryIcon, Settings as Cog, ChevronRight, TrendingUp, DollarSign, Cpu, Sparkles, FlaskConical, MonitorPlay, LayoutDashboard, Layers, Bot, Radar, ClipboardList, SlidersHorizontal } from 'lucide-react';
import type { TabId } from '@/components/BottomNav';

type Sub = 'operation' | 'ai' | 'market' | 'alerts' | 'engine' | 'intelligence' | 'smartbacktest' | 'simulation' | 'propanel' | 'strategies' | 'adaptiveai' | 'scanner' | 'opsmanager' | 'algorithmconfig';

interface MoreProps {
  onOpenSub: (sub: Sub) => void;
  onNavigate: (tab: TabId) => void;
}

const ITEMS: { id: Sub; icon: typeof ShieldCheck; label: string; desc: string }[] = [
  { id: 'propanel', icon: LayoutDashboard, label: 'Painel Profissional', desc: 'KPIs, velocímetro e calendário' },
  { id: 'scanner', icon: Radar, label: 'Scanner Inteligente', desc: 'Monitora WIN & WDO em tempo real' },
  { id: 'strategies', icon: Layers, label: 'Central de Estratégias', desc: '5 estratégias testáveis com comparador' },
  { id: 'adaptiveai', icon: Bot, label: 'IA Adaptativa', desc: 'Avaliação inteligente de cada sinal' },
  { id: 'opsmanager', icon: ClipboardList, label: 'Gerenciador de Operações', desc: 'Abertas, encerradas e canceladas' },
  { id: 'smartbacktest', icon: FlaskConical, label: 'Backtest Inteligente', desc: 'Teste estratégias com dados simulados' },
  { id: 'simulation', icon: MonitorPlay, label: 'Modo Simulação', desc: 'Treine sem operar dinheiro real' },
  { id: 'algorithmconfig', icon: SlidersHorizontal, label: 'Configuração do Algoritmo', desc: 'Ajuste pesos e perfis do Score' },
  { id: 'engine', icon: Cpu, label: 'TradeVision Engine', desc: 'Score inteligente por critérios ponderados' },
  { id: 'intelligence', icon: Sparkles, label: 'Central de Inteligência', desc: 'Sinais explicados com confirmações' },
  { id: 'operation', icon: ShieldCheck, label: 'Operação', desc: 'Gestão de risco e diário de trading' },
  { id: 'ai', icon: Brain, label: 'IA', desc: 'Score, explicação e histórico da IA' },
  { id: 'market', icon: Activity, label: 'Mercado', desc: 'Cotações, calendário econômico e notícias' },
  { id: 'alerts', icon: Bell, label: 'Alertas', desc: 'Sinais em tempo real (em breve)' },
];

export default function More({ onOpenSub, onNavigate }: MoreProps) {
  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Mais</h2>
        <p className="text-xs text-slate-500">Ferramentas e configurações</p>
      </section>

      {/* Tools */}
      <section className="animate-fade-up space-y-2.5">
        {ITEMS.map((it) => (
          <button
            key={it.id}
            onClick={() => onOpenSub(it.id)}
            className="group flex w-full items-center gap-3 rounded-xl border border-white/[0.06] bg-ink-850/70 p-4 text-left transition-all hover:border-white/[0.12] hover:bg-ink-800/80 active:scale-[0.99]"
          >
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-500/10 text-accent-300 transition-colors group-hover:bg-accent-500/20">
              <it.icon className="h-5 w-5" strokeWidth={2.2} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">{it.label}</span>
              <span className="block truncate text-[11px] text-slate-500">{it.desc}</span>
            </span>
            <ChevronRight className="h-4 w-4 text-slate-600 transition-transform group-hover:translate-x-0.5" />
          </button>
        ))}
      </section>

      {/* Quick links */}
      <section className="animate-fade-up">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Acesso rápido</h3>
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => onNavigate('history')} className="card flex items-center gap-3 p-3.5 transition-colors hover:bg-ink-800/60">
            <HistoryIcon className="h-4.5 w-4.5 text-accent-300" />
            <span className="text-sm font-bold text-white">Histórico</span>
          </button>
          <button onClick={() => onNavigate('backtest')} className="card flex items-center gap-3 p-3.5 transition-colors hover:bg-ink-800/60">
            <Cog className="h-4.5 w-4.5 text-accent-300" />
            <span className="text-sm font-bold text-white">Backtest</span>
          </button>
        </div>
      </section>

      {/* Assets banner */}
      <section className="card animate-fade-up flex items-center gap-3 p-4">
        <div className="flex -space-x-2">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-800 text-xs font-bold text-accent-300 ring-2 ring-ink-850">
            <TrendingUp className="h-4 w-4" />
          </span>
          <span className="grid h-9 w-9 place-items-center rounded-full bg-ink-800 text-xs font-bold text-accent-300 ring-2 ring-ink-850">
            <DollarSign className="h-4 w-4" />
          </span>
        </div>
        <div className="flex-1">
          <div className="text-sm font-bold text-white">WIN & WDO</div>
          <div className="text-[11px] text-slate-500">Mini Índice e Mini Dólar</div>
        </div>
        <button onClick={() => onNavigate('analysis')} className="rounded-lg bg-accent-500/10 px-3 py-1.5 text-xs font-bold text-accent-300">
          Analisar
        </button>
      </section>
    </div>
  );
}
