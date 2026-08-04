import { useStore } from '@/store';
import { ASSETS, formatMoney } from '@/lib/assets';
import { Settings as Cog, Trash2, Info, Code2, Database, Shield, RotateCcw } from 'lucide-react';
import type { TabId } from '@/components/BottomNav';

interface SettingsProps {
  onNavigate: (tab: TabId) => void;
  onOpenSub: (sub: 'operation' | 'ai' | 'alerts' | 'market') => void;
}

export default function Settings({ onNavigate, onOpenSub }: SettingsProps) {
  const { risk, stats, trades, journal, resetAll } = useStore();

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Configurações</h2>
        <p className="text-xs text-slate-500">Preferências e informações</p>
      </section>

      {/* Risk settings summary */}
      <section className="card animate-fade-up p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-bold text-white">Gestão de risco atual</h3>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-3">
          <Tile label="Capital" value={formatMoney(risk.capital)} />
          <Tile label="Risco/op." value={`${risk.riskPerTradePct}%`} />
          <Tile label="Stop" value={`${risk.stopPoints} pts`} />
        </div>
        <button onClick={() => onOpenSub('operation')} className="mt-3 w-full rounded-lg bg-ink-800 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-ink-750">
          Editar gestão de risco
        </button>
      </section>

      {/* Data summary */}
      <section className="card animate-fade-up p-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-bold text-white">Dados do aplicativo</h3>
        </div>
        <div className="mt-3 space-y-2">
          <Row label="Operações registradas" value={`${trades.length}`} />
          <Row label="Registros no diário" value={`${journal.length}`} />
          <Row label="Lucro acumulado" value={formatMoney(stats.cumulativePnl)} tone={stats.cumulativePnl >= 0 ? 'bull' : 'bear'} />
        </div>
        <button
          onClick={() => {
            if (confirm('Tem certeza? Isso restaura os dados simulados e apaga o diário.')) resetAll();
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-bear-500/10 py-2.5 text-xs font-bold text-bear-400 transition-colors hover:bg-bear-500/20"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Restaurar dados simulados
        </button>
      </section>

      {/* Assets */}
      <section className="card animate-fade-up p-4">
        <h3 className="text-sm font-bold text-white">Ativos monitorados</h3>
        <div className="mt-3 space-y-2">
          {Object.values(ASSETS).map((a) => (
            <div key={a.code} className="flex items-center justify-between rounded-lg bg-ink-800/50 px-3 py-2.5">
              <div>
                <div className="text-sm font-bold text-white">{a.code}</div>
                <div className="text-[11px] text-slate-500">{a.fullName}</div>
              </div>
              <div className="text-right text-[11px] tabular text-slate-500">
                <div>Tick {a.tick}</div>
                <div>R$ {a.tickValue}/tick</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section className="card animate-fade-up p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent-400" />
          <h3 className="text-sm font-bold text-white">Sobre</h3>
        </div>
        <div className="mt-2 space-y-1.5 text-xs text-slate-400">
          <p>TradeVision AI v1.0 — plataforma de análise técnica, gestão de risco e IA para mini contratos.</p>
          <p className="text-slate-600">Modo atual: dados simulados. Nenhuma API conectada.</p>
        </div>
      </section>

      <section className="card animate-fade-up flex items-start gap-3 p-4">
        <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
        <p className="text-xs leading-relaxed text-slate-400">
          O aplicativo usa uma camada de serviços de mercado (<span className="font-mono text-slate-300">Market Data</span>) com interfaces para cotações, candles, volume e indicadores. Para conectar uma API real, basta implementar a mesma interface e trocar o provedor — sem alterar a interface do app.
        </p>
      </section>
    </div>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-ink-800/50 p-2.5 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className="mt-0.5 font-mono text-sm font-bold tabular text-slate-200">{value}</div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-500">{label}</span>
      <span className={`font-mono font-bold tabular ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-slate-200'}`}>{value}</span>
    </div>
  );
}
