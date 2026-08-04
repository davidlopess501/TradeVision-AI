import { useState } from 'react';
import type { Asset, RiskSettings } from '@/types';
import { useStore, makeId } from '@/store';
import { ASSET_LIST, formatMoney } from '@/lib/assets';
import { calculateRisk, riskPerContractValue } from '@/lib/risk';
import { Calculator, BookPlus, Trash2, Camera, TrendingUp, DollarSign, Target, Shield } from 'lucide-react';

const ASSET_ICON: Record<Asset, typeof TrendingUp> = { WIN: TrendingUp, WDO: DollarSign };
const EMOTIONS = ['Calmo', 'Confiante', 'Ansioso', 'Ganancioso', 'Medo', 'Impaciente', 'Focado', 'Cansado'];

export default function OperationScreen() {
  const { risk, setRisk, journal, addJournal, removeJournal, stats } = useStore();
  const [asset, setAsset] = useState<Asset>('WIN');
  const [form, setForm] = useState<RiskSettings>(risk);
  const [showJournal, setShowJournal] = useState(false);

  const calc = calculateRisk(asset, form);
  const perContract = riskPerContractValue(asset, form.stopPoints);

  function saveRisk() {
    setRisk(form);
  }

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Operação</h2>
        <p className="text-xs text-slate-500">Gestão de risco e diário de trading</p>
      </section>

      {/* Risk calculator */}
      <section className="card animate-fade-up p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2">
          <Calculator className="h-4.5 w-4.5 text-accent-400" />
          <h3 className="text-sm font-bold text-white">Calculadora de Risco</h3>
        </div>

        <div className="mb-4 grid grid-cols-2 gap-2">
          {ASSET_LIST.map((a) => {
            const Icon = ASSET_ICON[a.code];
            const isActive = asset === a.code;
            return (
              <button
                key={a.code}
                onClick={() => setAsset(a.code)}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left transition-all ${
                  isActive ? 'border-accent-500/60 bg-accent-500/10' : 'border-white/[0.06] bg-ink-800/60 hover:bg-ink-800'
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? 'text-accent-300' : 'text-slate-500'}`} />
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{a.code}</span>
              </button>
            );
          })}
        </div>

        <div className="space-y-3">
          <Field label="Capital disponível (R$)">
            <input
              type="number"
              value={form.capital}
              onChange={(e) => setForm({ ...form, capital: Math.max(0, Number(e.target.value)) })}
              className="input"
              placeholder="10000"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Risco por operação (%)">
              <input
                type="number"
                value={form.riskPerTradePct}
                onChange={(e) => setForm({ ...form, riskPerTradePct: Math.max(0, Number(e.target.value)) })}
                className="input"
                placeholder="1"
              />
            </Field>
            <Field label="Stop em pontos">
              <input
                type="number"
                value={form.stopPoints}
                onChange={(e) => setForm({ ...form, stopPoints: Math.max(0, Number(e.target.value)) })}
                className="input"
                placeholder="150"
              />
            </Field>
          </div>
        </div>

        <button onClick={saveRisk} className="mt-4 w-full rounded-xl bg-accent-500 py-3 text-sm font-bold text-white transition-colors hover:bg-accent-600">
          Calcular e salvar
        </button>

        {/* Results */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <ResultCard icon={Shield} label="Contratos" value={`${calc.contracts}`} />
          <ResultCard icon={DollarSign} label="Valor em risco" value={formatMoney(calc.riskValue)} tone="bear" />
          <ResultCard icon={Target} label="Risco x Retorno" value={`1:${calc.rewardRiskRatio}`} />
          <ResultCard icon={TrendingUp} label="Alvo sugerido" value={`${calc.suggestedTarget} pts`} tone="bull" />
        </div>
        <p className="mt-3 text-[11px] text-slate-600">
          Risco por contrato: {formatMoney(perContract)} · Cada contrato arrisca {formatMoney(perContract)} para o stop informado.
        </p>
      </section>

      {/* Journal */}
      <section className="card animate-fade-up p-4 sm:p-5">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookPlus className="h-4.5 w-4.5 text-accent-400" />
            <h3 className="text-sm font-bold text-white">Diário de Trading</h3>
          </div>
          <button onClick={() => setShowJournal((s) => !s)} className="rounded-lg bg-accent-500/10 px-3 py-1.5 text-xs font-bold text-accent-300 transition-colors hover:bg-accent-500/20">
            {showJournal ? 'Cancelar' : 'Novo registro'}
          </button>
        </div>

        {showJournal && <JournalForm asset={asset} onSubmit={(e) => { addJournal(e); setShowJournal(false); }} />}

        <div className="mt-3 space-y-2">
          {journal.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-600">Nenhum registro no diário ainda.</p>
          ) : (
            journal.map((j) => (
              <div key={j.id} className="rounded-lg border border-white/[0.05] bg-ink-800/50 p-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-800 text-[10px] font-bold text-accent-300">{j.asset}</span>
                    <div>
                      <div className="text-xs font-semibold text-slate-200">{j.emotionBefore} → {j.emotionAfter}</div>
                      <div className="text-[10px] text-slate-600 tabular">{new Date(j.createdAt).toLocaleString('pt-BR')}</div>
                    </div>
                  </div>
                  <button onClick={() => removeJournal(j.id)} className="text-slate-600 hover:text-bear-400">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                {j.notes && <p className="mt-2 text-xs text-slate-400">{j.notes}</p>}
                {j.hasScreenshot && (
                  <div className="mt-2 flex items-center gap-1.5 rounded-md bg-ink-850 px-2.5 py-1.5 text-[11px] text-slate-500">
                    <Camera className="h-3.5 w-3.5" /> Captura anexada (placeholder)
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </section>

      {/* Stats panel */}
      <section className="animate-fade-up">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Estatísticas</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <StatTile label="Melhor sequência de ganhos" value={`${stats.bestWinStreak}`} tone="bull" />
          <StatTile label="Maior sequência de perdas" value={`${stats.worstLossStreak}`} tone="bear" />
          <StatTile label="Profit Factor" value={stats.profitFactor.toFixed(2)} />
          <StatTile label="Lucro mensal" value={formatMoney(stats.monthlyPnl)} tone={stats.monthlyPnl >= 0 ? 'bull' : 'bear'} />
          <StatTile label="Lucro semanal" value={formatMoney(stats.weeklyPnl)} tone={stats.weeklyPnl >= 0 ? 'bull' : 'bear'} />
          <StatTile label="Expectativa matemática" value={formatMoney(stats.expectancy)} tone={stats.expectancy >= 0 ? 'bull' : 'bear'} />
        </div>
      </section>

      <style>{`
        .input { width:100%; border-radius:0.625rem; background:rgba(19,26,43,0.6); border:1px solid rgba(255,255,255,0.06); padding:0.625rem 0.75rem; font-size:0.875rem; color:#e2e8f0; font-variant-numeric:tabular-nums; outline:none; transition:border-color .15s; }
        .input:focus { border-color: rgba(14,165,233,0.6); }
        .input::placeholder { color:#475569; }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ResultCard({ icon: Icon, label, value, tone }: { icon: typeof Shield; label: string; value: string; tone?: 'bull' | 'bear' }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-ink-800/60 p-3.5">
      <div className="flex items-center gap-1.5 text-slate-500">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className={`mt-1.5 font-mono text-lg font-bold tabular ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function StatTile({ label, value, tone }: { label: string; value: string; tone?: 'bull' | 'bear' }) {
  return (
    <div className="card p-3">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">{label}</div>
      <div className={`mt-1 font-mono text-base font-bold tabular ${tone === 'bull' ? 'text-bull-400' : tone === 'bear' ? 'text-bear-400' : 'text-white'}`}>{value}</div>
    </div>
  );
}

function JournalForm({ asset, onSubmit }: { asset: Asset; onSubmit: (e: import('@/types').JournalEntry) => void }) {
  const [emotionBefore, setEmotionBefore] = useState('Calmo');
  const [emotionAfter, setEmotionAfter] = useState('Calmo');
  const [notes, setNotes] = useState('');
  const [hasScreenshot, setHasScreenshot] = useState(false);

  return (
    <div className="space-y-3 rounded-lg border border-white/[0.06] bg-ink-800/40 p-3">
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Emoção antes</span>
          <select value={emotionBefore} onChange={(e) => setEmotionBefore(e.target.value)} className="input">
            {EMOTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Emoção depois</span>
          <select value={emotionAfter} onChange={(e) => setEmotionAfter(e.target.value)} className="input">
            {EMOTIONS.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[10px] font-bold uppercase tracking-wider text-slate-500">Observações</span>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} className="input resize-none" placeholder="Como foi a operação?" />
      </label>
      <button onClick={() => setHasScreenshot((s) => !s)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors ${hasScreenshot ? 'border-accent-500/40 bg-accent-500/10 text-accent-300' : 'border-white/[0.06] bg-ink-850 text-slate-400'}`}>
        <Camera className="h-3.5 w-3.5" /> {hasScreenshot ? 'Captura marcada (placeholder)' : 'Marcar captura de tela'}
      </button>
      <button
        onClick={() => onSubmit({ id: makeId(), asset, emotionBefore, emotionAfter, notes, hasScreenshot, createdAt: Date.now() })}
        className="w-full rounded-lg bg-accent-500 py-2.5 text-xs font-bold text-white transition-colors hover:bg-accent-600"
      >
        Salvar registro
      </button>
    </div>
  );
}
