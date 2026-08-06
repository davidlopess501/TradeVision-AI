import { useMemo, useState } from 'react';

import { useStore } from '@/store';

import {
  ASSETS,
  formatMoney,
  formatPrice,
  formatDateTime,
} from '@/lib/assets';

import {
  getMarketDataMode,
  getMarketDataStatus,
  hasRealMarketDataProvider,
  setMarketDataMode,
  type MarketDataMode,
} from '@/services/types';

import {
  testActiveProvider,
} from '@/services/marketGateway';

import {
  Settings as Cog,
  Info,
  Code2,
  Database,
  Shield,
  RotateCcw,
  Wifi,
  WifiOff,
  FlaskConical,
  Radio,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

import type {
  TabId,
} from '@/components/BottomNav';

interface SettingsProps {
  onNavigate: (tab: TabId) => void;
  onOpenSub: (
    sub:
      | 'operation'
      | 'ai'
      | 'alerts'
      | 'market'
  ) => void;
}

type ConnectionState =
  | 'IDLE'
  | 'TESTING'
  | 'SUCCESS'
  | 'ERROR';

interface ConnectionResult {
  state: ConnectionState;
  message: string;
  price?: string;
  updatedAt?: string;
}

const MODE_META: Record<
  MarketDataMode,
  {
    label: string;
    description: string;
    icon: typeof Database;
    text: string;
    bg: string;
    ring: string;
  }
> = {
  SIMULATED: {
    label: 'SIMULADO',
    description:
      'Dados gerados localmente para desenvolvimento.',
    icon: Database,
    text: 'text-accent-400',
    bg: 'bg-accent-500/10',
    ring: 'ring-accent-500/20',
  },
  DEMO: {
    label: 'DEMO',
    description:
      'Treinamento e testes sem qualquer ordem real.',
    icon: FlaskConical,
    text: 'text-yellow-400',
    bg: 'bg-yellow-500/10',
    ring: 'ring-yellow-500/20',
  },
  REAL: {
    label: 'REAL',
    description:
      'Dados recebidos de um provedor externo configurado.',
    icon: Radio,
    text: 'text-bull-400',
    bg: 'bg-bull-500/10',
    ring: 'ring-bull-500/20',
  },
};

export default function Settings({
  onNavigate: _onNavigate,
  onOpenSub,
}: SettingsProps) {
  const {
    risk,
    stats,
    trades,
    journal,
    resetAll,
  } = useStore();

  const [mode, setMode] =
    useState<MarketDataMode>(
      getMarketDataMode(),
    );

  const [
    connectionResult,
    setConnectionResult,
  ] = useState<ConnectionResult>({
    state: 'IDLE',
    message:
      'Nenhum teste realizado nesta sessão.',
  });

  const status = useMemo(
    () => getMarketDataStatus(),
    [mode],
  );

  const realAvailable =
    hasRealMarketDataProvider();

  function changeMode(
    nextMode: MarketDataMode,
  ) {
    try {
      setMarketDataMode(nextMode);
      setMode(nextMode);

      setConnectionResult({
        state: 'IDLE',
        message:
          'Modo alterado. Teste a conexão para validar o provedor.',
      });

      window.location.reload();
    } catch (error) {
      setConnectionResult({
        state: 'ERROR',
        message:
          error instanceof Error
            ? error.message
            : 'Não foi possível alterar o modo.',
      });
    }
  }

async function testConnection() {
  setConnectionResult({
    state: 'TESTING',
    message: 'Consultando o Market Gateway...',
  });

  try {
    const result = await testActiveProvider('WIN');

    if (!result.success || !result.quote) {
      throw new Error(result.message);
    }

    setConnectionResult({
      state: 'SUCCESS',
      message: result.message,
      price: formatPrice(
        'WIN',
        result.quote.price,
      ),
      updatedAt: formatDateTime(
        result.quote.updatedAt,
      ),
    });
  } catch (error) {
    setConnectionResult({
      state: 'ERROR',
      message:
        error instanceof Error
          ? error.message
          : 'Não foi possível consultar o Market Gateway.',
    });
  }
}
  

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <div className="flex items-center gap-2">
          <Cog className="h-5 w-5 text-accent-400" />

          <div>
            <h2 className="text-lg font-extrabold tracking-tight text-white">
              Configurações
            </h2>

            <p className="text-xs text-slate-500">
              Preferências, conexão e segurança
            </p>
          </div>
        </div>
      </section>

      <section className="card animate-fade-up p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Server className="h-4 w-4 text-accent-400" />

            <div>
              <h3 className="text-sm font-bold text-white">
                Fonte de dados
              </h3>

              <p className="mt-0.5 text-[11px] text-slate-600">
                Escolha o ambiente usado pelo TradeVision.
              </p>
            </div>
          </div>

          <span
            className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
              status.connected
                ? 'bg-bull-500/10 text-bull-400'
                : 'bg-bear-500/10 text-bear-400'
            }`}
          >
            {status.connected
              ? 'CONECTADO'
              : 'DESCONECTADO'}
          </span>
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          {(
            [
              'SIMULATED',
              'DEMO',
              'REAL',
            ] as MarketDataMode[]
          ).map((itemMode) => {
            const meta =
              MODE_META[itemMode];

            const Icon =
              meta.icon;

            const selected =
              mode === itemMode;

            const disabled =
              itemMode === 'REAL' &&
              !realAvailable;

            return (
              <button
                key={itemMode}
                type="button"
                disabled={disabled}
                onClick={() =>
                  changeMode(itemMode)
                }
                className={`rounded-xl p-3 text-left ring-1 transition-all ${
                  selected
                    ? `${meta.bg} ${meta.ring}`
                    : 'bg-ink-800/50 ring-white/[0.05] hover:bg-ink-800'
                } ${
                  disabled
                    ? 'cursor-not-allowed opacity-40'
                    : ''
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon
                    className={`h-4 w-4 ${meta.text}`}
                  />

                  <span
                    className={`text-xs font-bold ${meta.text}`}
                  >
                    {meta.label}
                  </span>
                </div>

                <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
                  {meta.description}
                </p>

                {itemMode === 'REAL' &&
                  !realAvailable && (
                    <p className="mt-2 text-[9px] font-semibold uppercase tracking-wider text-bear-400">
                      Provedor não configurado
                    </p>
                  )}
              </button>
            );
          })}
        </div>

        <div className="mt-4 rounded-xl bg-ink-800/50 p-3">
          <Row
            label="Modo atual"
            value={
              MODE_META[mode].label
            }
          />

          <Row
            label="Provedor"
            value={status.providerName}
          />

          <Row
            label="Ordens reais"
            value={
              status.realTradingEnabled
                ? 'Habilitadas'
                : 'Bloqueadas'
            }
            tone={
              status.realTradingEnabled
                ? 'bear'
                : 'bull'
            }
          />
        </div>

        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          {status.description}
        </p>
      </section>

      <section className="card animate-fade-up p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {connectionResult.state ===
            'SUCCESS' ? (
              <Wifi className="h-4 w-4 text-bull-400" />
            ) : connectionResult.state ===
              'ERROR' ? (
              <WifiOff className="h-4 w-4 text-bear-400" />
            ) : (
              <Database className="h-4 w-4 text-accent-400" />
            )}

            <div>
              <h3 className="text-sm font-bold text-white">
                Teste de conexão
              </h3>

              <p className="mt-0.5 text-[11px] text-slate-600">
                Consulta uma cotação pelo provedor ativo.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() =>
              void testConnection()
            }
            disabled={
              connectionResult.state ===
              'TESTING'
            }
            className="flex items-center gap-1.5 rounded-lg bg-accent-500 px-3 py-2 text-xs font-bold text-white transition-colors hover:bg-accent-400 disabled:opacity-50"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${
                connectionResult.state ===
                'TESTING'
                  ? 'animate-spin'
                  : ''
              }`}
            />

            Testar
          </button>
        </div>

        <div
          className={`mt-4 rounded-xl border p-3 ${
            connectionResult.state ===
            'SUCCESS'
              ? 'border-bull-500/20 bg-bull-500/5'
              : connectionResult.state ===
                  'ERROR'
                ? 'border-bear-500/20 bg-bear-500/5'
                : 'border-white/[0.06] bg-ink-800/50'
          }`}
        >
          <div className="flex items-start gap-2">
            {connectionResult.state ===
            'SUCCESS' ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-bull-400" />
            ) : connectionResult.state ===
              'ERROR' ? (
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-bear-400" />
            ) : (
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
            )}

            <div className="min-w-0">
              <p className="text-xs leading-relaxed text-slate-300">
                {connectionResult.message}
              </p>

              {connectionResult.price && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Tile
                    label="WIN"
                    value={
                      connectionResult.price
                    }
                  />

                  <Tile
                    label="Atualizado"
                    value={
                      connectionResult.updatedAt ??
                      '—'
                    }
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      <section className="card animate-fade-up p-4">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4 text-accent-400" />

          <h3 className="text-sm font-bold text-white">
            Gestão de risco atual
          </h3>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <Tile
            label="Capital"
            value={formatMoney(
              risk.capital,
            )}
          />

          <Tile
            label="Risco/op."
            value={`${risk.riskPerTradePct}%`}
          />

          <Tile
            label="Stop"
            value={`${risk.stopPoints} pts`}
          />
        </div>

        <button
          type="button"
          onClick={() =>
            onOpenSub('operation')
          }
          className="mt-3 w-full rounded-lg bg-ink-800 py-2.5 text-xs font-bold text-slate-200 transition-colors hover:bg-ink-750"
        >
          Editar gestão de risco
        </button>
      </section>

      <section className="card animate-fade-up p-4">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent-400" />

          <h3 className="text-sm font-bold text-white">
            Dados do aplicativo
          </h3>
        </div>

        <div className="mt-3 space-y-2">
          <Row
            label="Operações registradas"
            value={`${trades.length}`}
          />

          <Row
            label="Registros no diário"
            value={`${journal.length}`}
          />

          <Row
            label="Lucro acumulado"
            value={formatMoney(
              stats.cumulativePnl,
            )}
            tone={
              stats.cumulativePnl >= 0
                ? 'bull'
                : 'bear'
            }
          />
        </div>

        <button
          type="button"
          onClick={() => {
            if (
              confirm(
                'Tem certeza? Isso restaura os dados simulados e apaga o diário.',
              )
            ) {
              resetAll();
            }
          }}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-bear-500/10 py-2.5 text-xs font-bold text-bear-400 transition-colors hover:bg-bear-500/20"
        >
          <RotateCcw className="h-3.5 w-3.5" />

          Restaurar dados simulados
        </button>
      </section>

      <section className="card animate-fade-up p-4">
        <h3 className="text-sm font-bold text-white">
          Ativos monitorados
        </h3>

        <div className="mt-3 space-y-2">
          {Object.values(ASSETS).map(
            (asset) => (
              <div
                key={asset.code}
                className="flex items-center justify-between rounded-lg bg-ink-800/50 px-3 py-2.5"
              >
                <div>
                  <div className="text-sm font-bold text-white">
                    {asset.code}
                  </div>

                  <div className="text-[11px] text-slate-500">
                    {asset.fullName}
                  </div>
                </div>

                <div className="text-right text-[11px] tabular text-slate-500">
                  <div>
                    Tick {asset.tick}
                  </div>

                  <div>
                    R$ {asset.tickValue}
                    /tick
                  </div>
                </div>
              </div>
            ),
          )}
        </div>
      </section>

      <section className="card animate-fade-up p-4">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-accent-400" />

          <h3 className="text-sm font-bold text-white">
            Sobre
          </h3>
        </div>

        <div className="mt-2 space-y-1.5 text-xs text-slate-400">
          <p>
            TradeVision AI v1.0 — plataforma de análise técnica, gestão de risco e IA para mini contratos.
          </p>

          <p className="text-slate-600">
            O modo REAL exige um servidor intermediário ou provedor compatível. Chaves secretas não devem ficar no navegador.
          </p>
        </div>
      </section>

      <section className="card animate-fade-up flex items-start gap-3 p-4">
        <Code2 className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />

        <p className="text-xs leading-relaxed text-slate-400">
          O aplicativo usa uma camada de serviços de mercado com interfaces para cotações, candles, volume e indicadores. Um novo provedor pode ser conectado sem reescrever as telas.
        </p>
      </section>
    </div>
  );
}

function Tile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg bg-ink-800/50 p-2.5 text-center">
      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
        {label}
      </div>

      <div className="mt-0.5 font-mono text-sm font-bold tabular text-slate-200">
        {value}
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'bull' | 'bear';
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-xs">
      <span className="text-slate-500">
        {label}
      </span>

      <span
        className={`truncate font-mono font-bold tabular ${
          tone === 'bull'
            ? 'text-bull-400'
            : tone === 'bear'
              ? 'text-bear-400'
              : 'text-slate-200'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
