import { BarChart3, LineChart, History, Settings, MoreHorizontal } from 'lucide-react';

export type TabId = 'dashboard' | 'analysis' | 'backtest' | 'history' | 'more';

export interface NavTab {
  id: TabId;
  label: string;
  icon: typeof BarChart3;
}

/**
 * Primary tabs live in the bottom bar. Secondary screens (Operação, IA,
 * Mercado, Alertas) are reached from the Dashboard / "Mais" hub.
 */
export const NAV_TABS: NavTab[] = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'analysis', label: 'Análise', icon: LineChart },
  { id: 'backtest', label: 'Backtest', icon: History },
  { id: 'history', label: 'Histórico', icon: History },
  { id: 'more', label: 'Mais', icon: MoreHorizontal },
];

interface BottomNavProps {
  active: TabId;
  onChange: (id: TabId) => void;
}

export default function BottomNav({ active, onChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 glass-strong border-t border-white/[0.06] pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto flex max-w-6xl items-stretch justify-around px-1 sm:px-2">
        {NAV_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = active === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onChange(tab.id)}
              className="group relative flex flex-1 flex-col items-center gap-1 py-2.5 transition-colors"
              aria-current={isActive ? 'page' : undefined}
            >
              {isActive && <span className="absolute -top-px h-0.5 w-10 rounded-full bg-accent-400" />}
              <Icon
                className={`h-5 w-5 transition-colors ${
                  isActive ? 'text-accent-400' : 'text-slate-500 group-hover:text-slate-300'
                }`}
                strokeWidth={isActive ? 2.5 : 2}
              />
              <span
                className={`text-[10px] font-semibold tracking-wide transition-colors ${
                  isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
