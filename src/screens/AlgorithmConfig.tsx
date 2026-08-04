import { useMemo } from 'react';
import type { AlgorithmWeights, WeightKey, AlgorithmProfile } from '@/types';
import { useStore } from '@/store';
import {
  WEIGHT_META,
  DEFAULT_WEIGHTS,
  PROFILES,
  PROFILE_LABELS,
  PROFILE_DESC,
  detectProfile,
  simulateScore,
} from '@/lib/algorithmConfig';
import { ScoreGauge } from '@/components/ui/ScoreGauge';
import { Sparkline } from '@/components/ui/Sparkline';
import { SlidersHorizontal, RotateCcw, Shield, Scale, Zap, Info, TrendingUp } from 'lucide-react';

const PROFILE_ICONS: Record<Exclude<AlgorithmProfile, 'CUSTOM'>, typeof Shield> = {
  CONSERVATIVE: Shield,
  MODERATE: Scale,
  AGGRESSIVE: Zap,
};

export default function AlgorithmConfig() {
  const { weights, setWeights, resetWeights } = useStore();

  const currentProfile = detectProfile(weights);
  const sim = useMemo(() => simulateScore(weights), [weights]);

  // Impact curve: score when each weight is doubled individually
  const impactCurve = useMemo(() => {
    return WEIGHT_META.map((meta) => {
      const modified: AlgorithmWeights = { ...weights };
      modified[meta.key] = weights[meta.key] * 2;
      return { x: 0, y: simulateScore(modified).totalScore };
    }).map((p, i) => ({ x: i, y: p.y }));
  }, [weights]);

  const impactPoints = [{ x: -0.5, y: sim.totalScore }, ...impactCurve];

  function applyProfile(profile: Exclude<AlgorithmProfile, 'CUSTOM'>) {
    setWeights({ ...PROFILES[profile] });
  }

  function updateWeight(key: WeightKey, value: number) {
    setWeights({ ...weights, [key]: value });
  }

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-5 w-5 text-accent-400" />
          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">Configuração do Algoritmo</h2>
            <p className="text-xs text-slate-500">Ajuste os pesos e veja o impacto no Score</p>
          </div>
        </div>
      </section>

      {/* Current profile badge */}
      <section className="animate-fade-up">
        <div className="card flex items-center justify-between p-4">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Perfil atual</div>
            <div className="mt-0.5 text-sm font-bold text-accent-300">{PROFILE_LABELS[currentProfile]}</div>
            <div className="text-[11px] text-slate-500">{PROFILE_DESC[currentProfile]}</div>
          </div>
          <button
            onClick={resetWeights}
            className="flex items-center gap-1.5 rounded-lg bg-ink-800 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:bg-ink-750"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Restaurar Padrão
          </button>
        </div>
      </section>

      {/* Profile presets */}
      <section className="animate-fade-up">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Perfis</h3>
        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PROFILES) as Exclude<AlgorithmProfile, 'CUSTOM'>[]).map((p) => {
            const Icon = PROFILE_ICONS[p];
            const isActive = currentProfile === p;
            return (
              <button
                key={p}
                onClick={() => applyProfile(p)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-all ${isActive ? 'border-accent-500/60 bg-accent-500/10' : 'border-white/[0.06] bg-ink-850/60 hover:bg-ink-800'}`}
              >
                <Icon className={`h-5 w-5 ${isActive ? 'text-accent-300' : 'text-slate-500'}`} />
                <span className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-400'}`}>{PROFILE_LABELS[p]}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Score + impact chart */}
      <section className="card animate-fade-up p-4 sm:p-5">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <ScoreGauge score={sim.totalScore} size={130} label="Score Final" />
          <div className="w-full flex-1">
            <div className="mb-2 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-accent-400" />
              <h3 className="text-xs font-bold text-white">Impacto no Score ao dobrar cada peso</h3>
            </div>
            <Sparkline points={impactPoints} width={300} height={80} positive className="w-full" />
            <p className="mt-1.5 text-[10px] text-slate-600">Linha base: Score atual. Cada ponto mostra o Score ao dobrar aquele peso individualmente.</p>
          </div>
        </div>
      </section>

      {/* Weight sliders */}
      <section className="animate-fade-up space-y-3">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Pesos dos critérios</h3>
        {WEIGHT_META.map((meta) => {
          const value = weights[meta.key];
          const contribution = sim.contributions.find((c) => c.key === meta.key);
          return (
            <div key={meta.key} className="card p-4">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-bold text-white">{meta.label}</span>
                  <span className="ml-2 text-[11px] text-slate-500">{meta.description}</span>
                </div>
                <div className="text-right">
                  <span className="font-mono text-base font-bold tabular text-accent-300">{value}</span>
                  <span className="text-[10px] text-slate-600"> · {contribution?.share}%</span>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-3">
                <input
                  type="range"
                  min={0}
                  max={30}
                  value={value}
                  onChange={(e) => updateWeight(meta.key, Number(e.target.value))}
                  className="slider-accent flex-1"
                />
                <div className="shrink-0 rounded-md bg-ink-800 px-2 py-1 text-[10px] font-bold tabular text-slate-400">
                  {contribution?.points ?? 0} pts
                </div>
              </div>
            </div>
          );
        })}
      </section>

      {/* Contribution breakdown */}
      <section className="card animate-fade-up p-4">
        <h3 className="mb-3 text-sm font-bold text-white">Contribuição por critério</h3>
        <div className="space-y-2">
          {sim.contributions.map((c) => (
            <div key={c.key} className="flex items-center gap-3">
              <span className="w-28 shrink-0 text-xs font-semibold text-slate-400">{c.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-ink-800">
                <div
                  className="h-full rounded-full bg-accent-500 transition-all duration-500"
                  style={{ width: `${(c.points / 100) * 100}%` }}
                />
              </div>
              <span className="w-10 shrink-0 text-right font-mono text-xs font-bold tabular text-slate-300">{c.points}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Readiness note */}
      <section className="card animate-fade-up flex items-start gap-3 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
        <p className="text-xs leading-relaxed text-slate-400">
          Estas configurações já são aplicadas no TradeVision Engine durante a geração do Score. Ao ajustar os pesos, o Engine recalcula automaticamente a pontuação de cada critério. O sistema está preparado para que, futuramente, o algoritmo utilize estas mesmas configurações durante a geração dos sinais em tempo real.
        </p>
      </section>
    </div>
  );
}
