import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { Trade, JournalEntry, RiskSettings, AnalysisResult, Asset, AlgorithmWeights } from '@/types';
import { seedTrades } from '@/lib/seed';
import { computeStats, equityCurve } from '@/lib/stats';
import { DEFAULT_WEIGHTS } from '@/lib/algorithmConfig';

const KEYS = {
  trades: 'tv_trades',
  journal: 'tv_journal',
  risk: 'tv_risk',
  history: 'tv_history',
  weights: 'tv_weights',
};

const DEFAULT_RISK: RiskSettings = { capital: 10000, riskPerTradePct: 1, stopPoints: 150 };

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function save<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

interface StoreValue {
  trades: Trade[];
  journal: JournalEntry[];
  history: AnalysisResult[];
  risk: RiskSettings;
  weights: AlgorithmWeights;
  stats: ReturnType<typeof computeStats>;
  equity: { x: number; y: number }[];
  addTrade: (t: Trade) => void;
  removeTrade: (id: string) => void;
  addJournal: (j: JournalEntry) => void;
  removeJournal: (id: string) => void;
  setRisk: (r: RiskSettings) => void;
  setWeights: (w: AlgorithmWeights) => void;
  resetWeights: () => void;
  addHistory: (a: AnalysisResult) => void;
  clearHistory: () => void;
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useState<Trade[]>(() => load(KEYS.trades, seedTrades()));
  const [journal, setJournal] = useState<JournalEntry[]>(() => load(KEYS.journal, []));
  const [history, setHistory] = useState<AnalysisResult[]>(() => load(KEYS.history, []));
  const [risk, setRiskState] = useState<RiskSettings>(() => load(KEYS.risk, DEFAULT_RISK));
  const [weights, setWeightsState] = useState<AlgorithmWeights>(() => load(KEYS.weights, DEFAULT_WEIGHTS));

  useEffect(() => save(KEYS.trades, trades), [trades]);
  useEffect(() => save(KEYS.journal, journal), [journal]);
  useEffect(() => save(KEYS.history, history), [history]);
  useEffect(() => save(KEYS.risk, risk), [risk]);
  useEffect(() => save(KEYS.weights, weights), [weights]);

  const addTrade = useCallback((t: Trade) => setTrades((prev) => [t, ...prev]), []);
  const removeTrade = useCallback((id: string) => setTrades((prev) => prev.filter((t) => t.id !== id)), []);
  const addJournal = useCallback((j: JournalEntry) => setJournal((prev) => [j, ...prev]), []);
  const removeJournal = useCallback((id: string) => setJournal((prev) => prev.filter((j) => j.id !== id)), []);
  const setRisk = useCallback((r: RiskSettings) => setRiskState(r), []);
  const setWeights = useCallback((w: AlgorithmWeights) => setWeightsState(w), []);
  const resetWeights = useCallback(() => setWeightsState(DEFAULT_WEIGHTS), []);
  const addHistory = useCallback((a: AnalysisResult) => setHistory((prev) => [a, ...prev].slice(0, 50)), []);
  const clearHistory = useCallback(() => setHistory([]), []);
  const resetAll = useCallback(() => {
    setTrades(seedTrades());
    setJournal([]);
    setHistory([]);
    setRiskState(DEFAULT_RISK);
    setWeightsState(DEFAULT_WEIGHTS);
  }, []);

  const stats = useMemo(() => computeStats(trades), [trades]);
  const equity = useMemo(() => equityCurve(trades), [trades]);

  const value = useMemo<StoreValue>(
    () => ({
      trades,
      journal,
      history,
      risk,
      weights,
      stats,
      equity,
      addTrade,
      removeTrade,
      addJournal,
      removeJournal,
      setRisk,
      setWeights,
      resetWeights,
      addHistory,
      clearHistory,
      resetAll,
    }),
    [trades, journal, history, risk, weights, stats, equity, addTrade, removeTrade, addJournal, removeJournal, setRisk, setWeights, resetWeights, addHistory, clearHistory, resetAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore deve ser usado dentro de StoreProvider');
  return ctx;
}

export function makeId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}

export function newTrade(partial: Partial<Trade> & { asset: Asset; direction: 'BUY' | 'SELL' }): Trade {
  return {
    id: makeId(),
    entry: 0,
    stop: 0,
    target: 0,
    exit: 0,
    result: 'WIN',
    points: 0,
    pnl: 0,
    createdAt: Date.now(),
    ...partial,
  } as Trade;
}
