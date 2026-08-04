import { TrendingUp, Activity, Wifi, WifiOff } from 'lucide-react';

interface HeaderProps {
  online: boolean;
}

function LiveBadge({ online }: HeaderProps) {
  return (
    <div className="flex items-center gap-2 rounded-full bg-ink-800/80 px-3 py-1.5 border border-white/[0.06]">
      <span className="relative flex h-2 w-2">
        {online && <span className="absolute inline-flex h-full w-full rounded-full bg-bull-500 animate-pulse-ring" />}
        <span className={`relative inline-flex h-2 w-2 rounded-full ${online ? 'bg-bull-400' : 'bg-wait-500'}`} />
      </span>
      <span className="text-[11px] font-semibold tracking-wide text-slate-300">
        {online ? 'MERCADO ABERTO' : 'OFFLINE'}
      </span>
    </div>
  );
}

export default function Header({ online }: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 glass-strong border-b border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-500/20">
            <TrendingUp className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div className="leading-tight">
            <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
              TradeVision <span className="text-accent-400">AI</span>
            </h1>
            <p className="hidden text-[11px] font-medium text-slate-500 sm:block">
              Inteligência de mercado para mini contratos
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-full bg-ink-800/80 px-3 py-1.5 border border-white/[0.06] sm:flex">
            <Activity className="h-3.5 w-3.5 text-accent-400" />
            <span className="text-[11px] font-semibold text-slate-400 tabular">B3 · BMF</span>
          </div>
          <div className="hidden items-center gap-1.5 rounded-full bg-ink-800/80 px-3 py-1.5 border border-white/[0.06] md:flex">
            {online ? <Wifi className="h-3.5 w-3.5 text-bull-400" /> : <WifiOff className="h-3.5 w-3.5 text-wait-500" />}
            <span className="text-[11px] font-semibold text-slate-400">Dados simulados</span>
          </div>
          <LiveBadge online={online} />
        </div>
      </div>
    </header>
  );
}
