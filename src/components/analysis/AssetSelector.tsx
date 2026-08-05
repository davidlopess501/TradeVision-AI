import type { Asset } from '@/types';
import { ASSET_LIST } from '@/lib/assets';
import {
  DollarSign,
  TrendingUp,
} from 'lucide-react';

interface AssetSelectorProps {
  asset: Asset;
  onChange: (asset: Asset) => void;
}

const ASSET_ICON: Record<
  Asset,
  typeof TrendingUp
> = {
  WIN: TrendingUp,
  WDO: DollarSign,
};

export function AssetSelector({
  asset,
  onChange,
}: AssetSelectorProps) {
  return (
    <div>
      <label className="mb-2 block text-[11px] font-bold uppercase tracking-wider text-slate-500">
        Ativo
      </label>

      <div className="grid grid-cols-2 gap-2">
        {ASSET_LIST.map((item) => {
          const Icon =
            ASSET_ICON[item.code];

          const isActive =
            asset === item.code;

          return (
            <button
              key={item.code}
              type="button"
              onClick={() =>
                onChange(item.code)
              }
              className={`group relative flex items-center gap-3 rounded-xl border px-3.5 py-3 text-left transition-all ${
                isActive
                  ? 'border-accent-500/60 bg-accent-500/10 shadow-lg shadow-accent-500/10'
                  : 'border-white/[0.06] bg-ink-850/60 hover:border-white/[0.12] hover:bg-ink-800'
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${
                  isActive
                    ? 'bg-accent-500/20 text-accent-300'
                    : 'bg-ink-800 text-slate-500'
                }`}
              >
                <Icon
                  className="h-4.5 w-4.5"
                  strokeWidth={2.2}
                />
              </span>

              <span className="min-w-0">
                <span
                  className={`block text-sm font-bold leading-tight ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-300'
                  }`}
                >
                  {item.code}
                </span>

                <span className="block truncate text-[11px] text-slate-500">
                  {item.name}
                </span>
              </span>

              {isActive && (
                <span className="absolute right-2.5 top-2.5 h-1.5 w-1.5 rounded-full bg-accent-400 shadow-[0_0_8px] shadow-accent-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}