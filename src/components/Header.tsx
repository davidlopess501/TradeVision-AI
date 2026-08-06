import { useState } from 'react';

import {
  TrendingUp,
  Activity,
  Wifi,
  WifiOff,
  Database,
  FlaskConical,
  Radio,
  ChevronDown,
} from 'lucide-react';

import {
  getMarketDataMode,
  getMarketDataStatus,
  hasRealMarketDataProvider,
  setMarketDataMode,
  type MarketDataMode,
} from '@/services/types';

interface HeaderProps {
  online: boolean;
}

function LiveBadge({
  online,
}: HeaderProps) {
  return (
    <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-ink-800/80 px-3 py-1.5">
      <span className="relative flex h-2 w-2">
        {online && (
          <span className="absolute inline-flex h-full w-full animate-pulse-ring rounded-full bg-bull-500" />
        )}

        <span
          className={`relative inline-flex h-2 w-2 rounded-full ${
            online
              ? 'bg-bull-400'
              : 'bg-wait-500'
          }`}
        />
      </span>

      <span className="text-[11px] font-semibold tracking-wide text-slate-300">
        {online
          ? 'MERCADO ABERTO'
          : 'OFFLINE'}
      </span>
    </div>
  );
}

function ModeSelector() {
  const [mode, setMode] =
    useState<MarketDataMode>(
      getMarketDataMode(),
    );

  const [open, setOpen] =
    useState(false);

  const [message, setMessage] =
    useState<string | null>(null);

  const status =
    getMarketDataStatus();

  const realAvailable =
    hasRealMarketDataProvider();

  const modeConfig = {
    SIMULATED: {
      label: 'SIMULADO',
      description:
        'Dados gerados pelo aplicativo',
      text: 'text-accent-400',
      dot: 'bg-accent-400',
      bg: 'bg-accent-500/10',
      Icon: Database,
    },

    DEMO: {
      label: 'DEMO',
      description:
        'Treinamento sem ordens reais',
      text: 'text-yellow-400',
      dot: 'bg-yellow-400',
      bg: 'bg-yellow-500/10',
      Icon: FlaskConical,
    },

    REAL: {
      label: 'REAL',
      description:
        realAvailable
          ? 'Provedor real conectado'
          : 'Provedor ainda não configurado',
      text: 'text-bull-400',
      dot: 'bg-bull-400',
      bg: 'bg-bull-500/10',
      Icon: Radio,
    },
  } satisfies Record<
    MarketDataMode,
    {
      label: string;
      description: string;
      text: string;
      dot: string;
      bg: string;
      Icon: typeof Database;
    }
  >;

  const activeConfig =
    modeConfig[mode];

  function selectMode(
    nextMode: MarketDataMode,
  ) {
    setMessage(null);

    try {
      setMarketDataMode(nextMode);
      setMode(nextMode);
      setOpen(false);

      /*
       * Recarrega a interface para que todas
       * as telas passem a usar o provedor
       * correspondente ao novo modo.
       */
      window.location.reload();
    } catch (caughtError) {
      setMessage(
        caughtError instanceof Error
          ? caughtError.message
          : 'Não foi possível alterar o modo.',
      );
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() =>
          setOpen((current) => !current)
        }
        className={`flex items-center gap-2 rounded-full border border-white/[0.06] px-3 py-1.5 transition-colors hover:border-white/[0.12] ${activeConfig.bg}`}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span
          className={`h-2 w-2 rounded-full ${activeConfig.dot}`}
        />

        <activeConfig.Icon
          className={`h-3.5 w-3.5 ${activeConfig.text}`}
        />

        <span
          className={`text-[11px] font-bold ${activeConfig.text}`}
        >
          {activeConfig.label}
        </span>

        <ChevronDown
          className={`h-3.5 w-3.5 text-slate-500 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Fechar seletor"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />

          <div
            role="menu"
            className="absolute right-0 top-full z-50 mt-2 w-72 overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900 p-2 shadow-2xl shadow-black/40"
          >
            <div className="px-2 pb-2 pt-1">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                Fonte de dados
              </div>

              <p className="mt-1 text-[10px] leading-relaxed text-slate-600">
                Escolha como o TradeVision
                receberá os dados de mercado.
              </p>
            </div>

            {(
              [
                'SIMULATED',
                'DEMO',
                'REAL',
              ] as MarketDataMode[]
            ).map((itemMode) => {
              const config =
                modeConfig[itemMode];

              const Icon =
                config.Icon;

              const selected =
                mode === itemMode;

              const disabled =
                itemMode === 'REAL' &&
                !realAvailable;

              return (
                <button
                  key={itemMode}
                  type="button"
                  role="menuitem"
                  disabled={disabled}
                  onClick={() =>
                    selectMode(itemMode)
                  }
                  className={`flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left transition-colors ${
                    selected
                      ? 'bg-white/[0.06]'
                      : 'hover:bg-white/[0.04]'
                  } ${
                    disabled
                      ? 'cursor-not-allowed opacity-40'
                      : ''
                  }`}
                >
                  <span
                    className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${config.bg}`}
                  >
                    <Icon
                      className={`h-4 w-4 ${config.text}`}
                    />
                  </span>

                  <span className="min-w-0 flex-1">
                    <span
                      className={`block text-xs font-bold ${config.text}`}
                    >
                      {config.label}
                    </span>

                    <span className="mt-0.5 block text-[10px] leading-relaxed text-slate-500">
                      {config.description}
                    </span>
                  </span>

                  {selected && (
                    <span
                      className={`h-2 w-2 rounded-full ${config.dot}`}
                    />
                  )}
                </button>
              );
            })}

            <div className="mt-2 border-t border-white/[0.06] px-3 py-2">
              <div className="text-[9px] uppercase tracking-wider text-slate-600">
                Provedor ativo
              </div>

              <div className="mt-0.5 truncate text-[10px] font-semibold text-slate-400">
                {status.providerName}
              </div>
            </div>

            {message && (
              <div className="mx-2 mb-2 rounded-lg border border-bear-500/20 bg-bear-500/10 p-2 text-[10px] leading-relaxed text-bear-300">
                {message}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function Header({
  online,
}: HeaderProps) {
  return (
    <header className="glass-strong sticky top-0 z-30 border-b border-white/[0.06]">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="relative grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-accent-500 to-accent-600 shadow-lg shadow-accent-500/20">
            <TrendingUp
              className="h-5 w-5 text-white"
              strokeWidth={2.5}
            />
          </div>

          <div className="leading-tight">
            <h1 className="text-base font-extrabold tracking-tight text-white sm:text-lg">
              TradeVision{' '}
              <span className="text-accent-400">
                AI
              </span>
            </h1>

            <p className="hidden text-[11px] font-medium text-slate-500 sm:block">
              Inteligência de mercado para
              mini contratos
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="hidden items-center gap-1.5 rounded-full border border-white/[0.06] bg-ink-800/80 px-3 py-1.5 sm:flex">
            <Activity className="h-3.5 w-3.5 text-accent-400" />

            <span className="text-[11px] font-semibold text-slate-400 tabular">
              B3 · BMF
            </span>
          </div>

          <ModeSelector />

          <div className="hidden md:block">
            <LiveBadge
              online={online}
            />
          </div>

          <div className="md:hidden">
            {online ? (
              <Wifi className="h-4 w-4 text-bull-400" />
            ) : (
              <WifiOff className="h-4 w-4 text-wait-500" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
}