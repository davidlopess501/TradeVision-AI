import type { Signal } from '@/types';
import { ArrowUpCircle, ArrowDownCircle, CircleDot } from 'lucide-react';

const CONFIG: Record<Signal, { label: string; text: string; bg: string; ring: string; dot: string; Icon: typeof ArrowUpCircle }> = {
  BUY: {
    label: 'Compra',
    text: 'text-bull-400',
    bg: 'bg-bull-500/10',
    ring: 'ring-bull-500/30',
    dot: 'bg-bull-500',
    Icon: ArrowUpCircle,
  },
  SELL: {
    label: 'Venda',
    text: 'text-bear-400',
    bg: 'bg-bear-500/10',
    ring: 'ring-bear-500/30',
    dot: 'bg-bear-500',
    Icon: ArrowDownCircle,
  },
  WAIT: {
    label: 'Neutro',
    text: 'text-wait-400',
    bg: 'bg-wait-500/10',
    ring: 'ring-wait-500/20',
    dot: 'bg-wait-500',
    Icon: CircleDot,
  },
};

export const SIGNAL_CONFIG = CONFIG;

interface SignalBadgeProps {
  signal: Signal;
  size?: 'sm' | 'md';
}

export function SignalBadge({ signal, size = 'sm' }: SignalBadgeProps) {
  const cfg = CONFIG[signal];
  const Icon = cfg.Icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ring-1 ${cfg.bg} ${cfg.ring} ${
        size === 'sm' ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
      <Icon className={`${size === 'sm' ? 'h-3.5 w-3.5' : 'h-4 w-4'} ${cfg.text}`} strokeWidth={2.5} />
      <span className={`font-bold ${cfg.text}`}>{cfg.label}</span>
    </span>
  );
}
