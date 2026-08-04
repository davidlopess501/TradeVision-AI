import { useState } from 'react';
import { StoreProvider } from '@/store';
import Header from '@/components/Header';
import BottomNav, { type TabId } from '@/components/BottomNav';
import Dashboard from '@/screens/Dashboard';
import AnalysisScreen from '@/screens/Analysis';
import Backtest from '@/screens/Backtest';
import History from '@/screens/History';
import More from '@/screens/More';
import Operation from '@/screens/Operation';
import IA from '@/screens/IA';
import Market from '@/screens/Market';
import Alerts from '@/screens/Alerts';
import Settings from '@/screens/Settings';
import EngineScreen from '@/screens/Engine';
import Intelligence from '@/screens/Intelligence';
import SmartBacktest from '@/screens/SmartBacktest';
import Simulation from '@/screens/Simulation';
import ProPanel from '@/screens/ProPanel';
import Strategies from '@/screens/Strategies';
import AdaptiveAI from '@/screens/AdaptiveAI';
import Scanner from '@/screens/Scanner';
import OperationsManager from '@/screens/OperationsManager';
import AlgorithmConfig from '@/screens/AlgorithmConfig';
import type { Asset } from '@/types';

type SubScreen =
  | 'operation'
  | 'ai'
  | 'market'
  | 'alerts'
  | 'engine'
  | 'intelligence'
  | 'smartbacktest'
  | 'simulation'
  | 'propanel'
  | 'strategies'
  | 'adaptiveai'
  | 'scanner'
  | 'opsmanager'
  | 'algorithmconfig'
  | null;

function Shell() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [sub, setSub] = useState<SubScreen>(null);
  const [analysisAsset, setAnalysisAsset] = useState<Asset>('WIN');
  const [aiAsset, setAiAsset] = useState<Asset>('WIN');
  const [intelAsset, setIntelAsset] = useState<Asset>('WIN');

  function goTab(t: TabId) {
    setSub(null);
    setTab(t);
  }

  function openSub(s: SubScreen) {
    setSub(s);
  }

  function analyzeAsset(a: Asset) {
    setAnalysisAsset(a);
    setSub(null);
    setTab('analysis');
  }

  function goToAI(a: Asset) {
    setAiAsset(a);
    setSub('ai');
  }

  function goToIntelligence(a: Asset) {
    setIntelAsset(a);
    setSub('intelligence');
  }

  let content: React.ReactNode;
  if (sub === 'operation') content = <Operation />;
  else if (sub === 'ai') content = <IA initialAsset={aiAsset} />;
  else if (sub === 'market') content = <Market />;
  else if (sub === 'alerts') content = <Alerts />;
  else if (sub === 'engine') content = <EngineScreen onGoToIntelligence={goToIntelligence} />;
  else if (sub === 'intelligence') content = <Intelligence initialAsset={intelAsset} />;
  else if (sub === 'smartbacktest') content = <SmartBacktest />;
  else if (sub === 'simulation') content = <Simulation />;
  else if (sub === 'propanel') content = <ProPanel />;
  else if (sub === 'strategies') content = <Strategies />;
  else if (sub === 'adaptiveai') content = <AdaptiveAI initialAsset={aiAsset} />;
  else if (sub === 'scanner') content = <Scanner />;
  else if (sub === 'opsmanager') content = <OperationsManager />;
  else if (sub === 'algorithmconfig') content = <AlgorithmConfig />;
  else if (tab === 'dashboard') content = <Dashboard onNavigate={goTab} onOpenSub={openSub} onAnalyzeAsset={analyzeAsset} />;
  else if (tab === 'analysis') content = <AnalysisScreen initialAsset={analysisAsset} onGoToAI={goToAI} onGoToEngine={() => openSub('engine')} />;
  else if (tab === 'backtest') content = <Backtest />;
  else if (tab === 'history') content = <History />;
  else if (tab === 'more') content = <More onOpenSub={openSub} onNavigate={goTab} />;
  else content = <Dashboard onNavigate={goTab} onOpenSub={openSub} onAnalyzeAsset={analyzeAsset} />;

  return (
    <div className="min-h-screen bg-ink-950">
      <Header online />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-4 sm:px-6 sm:pb-28">{content}</main>
      <BottomNav active={sub ? 'more' : tab} onChange={(t) => goTab(t)} />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
