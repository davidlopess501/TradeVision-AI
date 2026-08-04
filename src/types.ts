// ----- Core domain types for TradeVision AI -----

export type Asset = 'WIN' | 'WDO';

export type Timeframe = '1m' | '5m' | '15m' | '60m';

export type Signal = 'BUY' | 'SELL' | 'WAIT';

export type IndicatorKey = 'ema9' | 'ema21' | 'rsi' | 'macd' | 'volume' | 'atr';

export interface IndicatorResult {
  key: IndicatorKey;
  signal: Signal;
  value: string;
  detail: string;
  strength: number; // 0..100 (50 = neutral)
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Quote {
  asset: Asset;
  price: number;
  changePct: number;
  high: number;
  low: number;
  open: number;
  spread: number;
  updatedAt: number;
}

export interface AnalysisResult {
  id: string;
  asset: Asset;
  timeframe: Timeframe;
  indicators: IndicatorResult[];
  score: number; // 0..100
  confidence: number; // 0..100
  finalSignal: Signal;
  price: number;
  changePct: number;
  spread: number;
  high: number;
  low: number;
  open: number;
  entry: number;
  stop: number;
  target: number;
  trend: 'ALTA' | 'BAIXA' | 'LATERAL';
  probability: number;
  aiScore: number;
  createdAt: number;
}

export interface Trade {
  id: string;
  asset: Asset;
  direction: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  exit: number;
  result: 'WIN' | 'LOSS' | 'BE';
  points: number;
  pnl: number;
  createdAt: number;
}

export interface JournalEntry {
  id: string;
  tradeId?: string;
  asset: Asset;
  emotionBefore: string;
  emotionAfter: string;
  notes: string;
  hasScreenshot: boolean;
  createdAt: number;
}

export interface RiskSettings {
  capital: number;
  riskPerTradePct: number;
  stopPoints: number;
}

export interface RiskCalculation {
  contracts: number;
  riskValue: number;
  rewardRiskRatio: number;
  suggestedTarget: number;
}

export interface AssetInfo {
  code: Asset;
  name: string;
  fullName: string;
  basePrice: number;
  tick: number;
  tickValue: number; // R$ per tick per contract
  decimals: number;
}

export interface BacktestSummary {
  winRate: number;
  totalTrades: number;
  wins: number;
  losses: number;
  cumulativePnl: number;
  maxDrawdown: number;
  rewardRiskRatio: number;
  profitFactor: number;
  bestWinStreak: number;
  worstLossStreak: number;
  monthlyPnl: number;
  weeklyPnl: number;
  expectancy: number;
}

export interface AIExplanation {
  score: number;
  reasoning: string;
  contributingIndicators: { key: IndicatorKey; weight: number; note: string }[];
  confidence: number;
}

// ----- TradeVision Engine: weighted intelligent score -----

export type EngineCriterionKey =
  | 'trend'
  | 'volume'
  | 'momentum'
  | 'volatility'
  | 'movingAverages'
  | 'rsi'
  | 'macd'
  | 'supportResistance';

export interface EngineCriterion {
  key: EngineCriterionKey;
  label: string;
  description: string;
  maxPoints: number;
  points: number; // 0..maxPoints
  signal: Signal;
  detail: string;
}

export interface EngineResult {
  asset: Asset;
  timeframe: Timeframe;
  criteria: EngineCriterion[];
  score: number; // 0..100
  classification: EngineClassification;
  confidence: number;
  finalSignal: Signal;
  price: number;
  createdAt: number;
}

export type EngineClassification = 'AVOID' | 'RISKY' | 'GOOD' | 'HIGH';

// ----- Central de Inteligência: signal explanations -----

export interface SignalConfirmation {
  id: string;
  label: string;
  description: string;
  confirmed: boolean;
  score: number; // 0..100 visual score for this confirmation
}

export interface SignalExplanation {
  id: string;
  asset: Asset;
  timeframe: Timeframe;
  signal: Signal;
  title: string;
  confidence: number;
  confirmations: SignalConfirmation[];
  confirmedCount: number;
  totalCount: number;
  summary: string;
  price: number;
  score: number;
  createdAt: number;
}

/**
 * Interface for the signal explainer. Today a simulated implementation
 * generates explanations; in the future an AI model can implement this
 * to explain each signal automatically — the screen stays the same.
 */
export interface ISignalExplainer {
  readonly name: string;
  explain(analysis: AnalysisResult): SignalExplanation;
}

// ----- Backtest Inteligente -----

export type BacktestPeriod = '30d' | '90d' | '1y' | 'custom';

export interface BacktestResult {
  asset: Asset;
  period: BacktestPeriod;
  totalTrades: number;
  wins: number;
  losses: number;
  winRate: number;
  netProfit: number;
  maxDrawdown: number;
  profitFactor: number;
  expectancy: number;
  returnOnRisk: number; // retorno sobre risco
  equityCurve: { x: number; y: number }[];
  trades: Trade[];
  startedAt: number;
}

// ----- Modo Simulação -----

export interface SimOperation {
  id: string;
  asset: Asset;
  direction: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  exit: number;
  result: 'WIN' | 'LOSS' | 'BE';
  pnl: number;
  points: number;
  openTime: number;
  closeTime: number;
  durationMin: number;
  closeReason: string;
}

export interface SimSession {
  operations: SimOperation[];
  daysSimulated: number;
  totalPnl: number;
  wins: number;
  losses: number;
}

// ----- Painel Profissional -----

export type MarketQuality = 'EXCELLENT' | 'GOOD' | 'NEUTRAL' | 'RISKY' | 'VERY_RISKY';

export interface DayResult {
  date: number; // timestamp at midnight
  pnl: number;
  trades: number;
  win: boolean;
}

export interface ProPanelData {
  capital: number;
  dayPnl: number;
  weekPnl: number;
  monthPnl: number;
  totalTrades: number;
  winRate: number;
  profitFactor: number;
  maxDrawdown: number;
  marketQualityScore: number;
  marketQuality: MarketQuality;
  calendar: DayResult[];
  equityCurve: { x: number; y: number }[];
  weeklyCurve: { x: number; y: number }[];
  aiSummary: string;
}

// ----- Central de Estratégias -----

export type RiskLevel = 'BAIXO' | 'MÉDIO' | 'ALTO';

export type StrategyKey = 'scalper' | 'trend' | 'breakout' | 'pullback' | 'reversal';

export interface Strategy {
  key: StrategyKey;
  name: string;
  description: string;
  riskLevel: RiskLevel;
  bestTime: string;
  bestTimeframe: Timeframe;
  bestAsset: Asset;
  winRate: number; // simulated
  profitFactor: number;
  totalTrades: number;
  icon: string;
}

export interface StrategyTestResult {
  strategy: StrategyKey;
  asset: Asset;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netProfit: number;
  maxDrawdown: number;
  profitFactor: number;
  equityCurve: { x: number; y: number }[];
}

// ----- IA Adaptativa -----

export type SignalQuality = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK' | 'POOR';

export interface AdaptiveEvaluation {
  id: string;
  asset: Asset;
  signal: Signal;
  quality: SignalQuality;
  qualityScore: number; // 0..100
  confidence: number; // 0..100
  detailedExplanation: string;
  indicatorsUsed: { name: string; contribution: number; direction: Signal }[];
  positivePoints: string[];
  negativePoints: string[];
  createdAt: number;
}

/**
 * Interface for the adaptive AI. The simulated implementation evaluates
 * signals from indicator readings; a future ML-backed implementation can
 * learn from historical trade outcomes by implementing the same interface.
 */
export interface IAdaptiveAI {
  readonly name: string;
  evaluate(analysis: AnalysisResult): AdaptiveEvaluation;
  learnFromHistory(trades: Trade[]): void;
}

// ----- Calendário Econômico -----

export type EventImpact = 'LOW' | 'MEDIUM' | 'HIGH';
export type EventType = 'NEWS' | 'B3_EVENT' | 'OPEN' | 'CLOSE' | 'EXPIRY';

export interface EconomicEvent {
  id: string;
  title: string;
  description: string;
  type: EventType;
  impact: EventImpact;
  date: number; // timestamp
  source: string;
  asset?: Asset;
}

export interface NewsItem {
  id: string;
  headline: string;
  summary: string;
  impact: EventImpact;
  date: number;
  source: string;
}

/**
 * Interface for a calendar/news provider. Today a simulated provider
 * generates events; a real news/calendar API can implement this and be
 * swapped in without changing the Market screen.
 */
export interface ICalendarProvider {
  readonly name: string;
  getEvents(): Promise<EconomicEvent[]>;
  getNews(): Promise<NewsItem[]>;
}

// ----- Scanner Inteligente -----

export interface ScanResult {
  asset: Asset;
  name: string;
  price: number;
  changePct: number;
  trend: 'ALTA' | 'BAIXA' | 'LATERAL';
  trendStrength: number; // 0..100
  volume: number;
  volumeRatio: number; // vs average
  score: number; // 0..100
  signal: Signal;
  updatedAt: number;
}

export type ScanFilter = 'ALL' | 'STRONG' | 'BUY' | 'SELL';

// ----- Gerenciador de Operações -----

export type OperationStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';

export interface ManagedOperation {
  id: string;
  asset: Asset;
  direction: 'BUY' | 'SELL';
  entry: number;
  stop: number;
  target: number;
  exit: number;
  pnl: number;
  points: number;
  status: OperationStatus;
  openTime: number;
  closeTime: number | null;
  durationMin: number;
  closeReason: string | null;
}

export type OperationPeriod = 'TODAY' | 'WEEK' | 'MONTH';

export interface OperationSummary {
  total: number;
  open: number;
  closed: number;
  cancelled: number;
  netPnl: number;
  grossWin: number;
  grossLoss: number;
  wins: number;
  losses: number;
  winRate: number;
}

// ----- Configuração do Algoritmo -----

export type WeightKey =
  | 'trend'
  | 'volume'
  | 'rsi'
  | 'macd'
  | 'movingAverages'
  | 'volatility'
  | 'momentum';

export type AlgorithmProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE' | 'CUSTOM';

export interface AlgorithmWeights {
  trend: number;
  volume: number;
  rsi: number;
  macd: number;
  movingAverages: number;
  volatility: number;
  momentum: number;
}

export interface WeightMeta {
  key: WeightKey;
  label: string;
  description: string;
  defaultWeight: number;
}
