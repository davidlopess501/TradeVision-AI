import { Bell, BellRing, ShieldCheck, Zap, Info } from 'lucide-react';
import { useState } from 'react';

export default function Alerts() {
  const [enabled, setEnabled] = useState(false);

  return (
    <div className="space-y-5">
      <section className="animate-fade-up">
        <h2 className="text-lg font-extrabold tracking-tight text-white">Alertas</h2>
        <p className="text-xs text-slate-500">Sinais em tempo real (em breve)</p>
      </section>

      {/* Status card */}
      <section className="card animate-fade-up p-5 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-accent-500/10">
          {enabled ? <BellRing className="h-7 w-7 text-accent-400" /> : <Bell className="h-7 w-7 text-slate-500" />}
        </div>
        <h3 className="mt-3 text-base font-bold text-white">{enabled ? 'Alertas ativados' : 'Alertas desativados'}</h3>
        <p className="mx-auto mt-1 max-w-xs text-xs text-slate-500">
          {enabled
            ? 'Você será notificado quando um novo sinal for gerado pela IA.'
            : 'Ative para receber sinais em tempo real assim que a integração com a API estiver disponível.'}
        </p>
        <button
          onClick={() => setEnabled((e) => !e)}
          className={`mt-4 inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold transition-colors ${
            enabled ? 'bg-bear-500/15 text-bear-400 hover:bg-bear-500/25' : 'bg-accent-500 text-white hover:bg-accent-600'
          }`}
        >
          {enabled ? 'Desativar' : 'Ativar alertas'}
        </button>
      </section>

      {/* Coming soon features */}
      <section className="animate-fade-up">
        <h3 className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">Recursos planejados</h3>
        <div className="space-y-2.5">
          <Feature icon={Zap} title="Sinais instantâneos" desc="Notificação ao detectar setup de compra ou venda." />
          <Feature icon={ShieldCheck} title="Alertas de stop" desc="Aviso quando o preço atinge seu stop ou alvo." />
          <Feature icon={BellRing} title="Resumo diário" desc="Relatório do dia com os principais sinais." />
        </div>
      </section>

      <section className="card animate-fade-up flex items-start gap-3 p-4">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
        <p className="text-xs leading-relaxed text-slate-400">
          Os alertas em tempo real exigem a conexão com o provedor de dados de mercado. Nenhum dado é enviado neste modo simulado — a estrutura da tela já está pronta para quando a API for integrada.
        </p>
      </section>
    </div>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: typeof Zap; title: string; desc: string }) {
  return (
    <div className="card flex items-center gap-3 p-3.5">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-800 text-accent-300">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-sm font-bold text-white">{title}</div>
        <div className="text-[11px] text-slate-500">{desc}</div>
      </div>
    </div>
  );
}
