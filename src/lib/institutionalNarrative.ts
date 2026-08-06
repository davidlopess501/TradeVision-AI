import type {
  Asset,
  AnalysisResult,
  Candle,
} from '@/types';

import type {
  InstitutionalAnalysis,
  InstitutionalFactor,
} from '@/lib/institutionalAI';

import type {
  MultiTimeframeAnalysis,
} from '@/lib/multiTimeframe';

import { formatPrice } from '@/lib/assets';

export interface InstitutionalNarrative {
  title: string;
  marketReading: string;
  operationalPlan: string;
  warnings: string[];
  confirmations: string[];
  entry: string;
  stop: string;
  target: string;
  riskReward: string;
  buyProbability: number;
  sellProbability: number;
}

interface InstitutionalNarrativeInput {
  asset: Asset;
  result: AnalysisResult;
  candles: Candle[];
  institutional: InstitutionalAnalysis;
  multiTimeframe: MultiTimeframeAnalysis | null;
}

function clamp(
  value: number,
  minimum: number,
  maximum: number,
): number {
  return Math.max(
    minimum,
    Math.min(maximum, value),
  );
}

function findFactor(
  factors: InstitutionalFactor[],
  key: string,
): InstitutionalFactor | undefined {
  return factors.find(
    (factor) => factor.key === key,
  );
}

function buildTitle(
  institutional: InstitutionalAnalysis,
): string {
  if (
    institutional.decision ===
    'STRONG_BUY'
  ) {
    return 'Compra institucional forte';
  }

  if (
    institutional.decision === 'BUY'
  ) {
    return 'Fluxo comprador em formação';
  }

  if (
    institutional.decision ===
    'STRONG_SELL'
  ) {
    return 'Venda institucional forte';
  }

  if (
    institutional.decision === 'SELL'
  ) {
    return 'Fluxo vendedor em formação';
  }

  return 'Mercado sem confirmação suficiente';
}

function buildReading(
  institutional: InstitutionalAnalysis,
  multiTimeframe:
    MultiTimeframeAnalysis | null,
): string {
  const structure = findFactor(
    institutional.factors,
    'marketStructure',
  );

  const orderBlock = findFactor(
    institutional.factors,
    'orderBlock',
  );

  const liquidity = findFactor(
    institutional.factors,
    'liquiditySweep',
  );

  const fibonacci = findFactor(
    institutional.factors,
    'fibonacci',
  );

  const parts: string[] = [];

  if (
    institutional.signal === 'BUY'
  ) {
    parts.push(
      'Os compradores apresentam vantagem no conjunto de fatores analisados.',
    );
  } else if (
    institutional.signal === 'SELL'
  ) {
    parts.push(
      'Os vendedores apresentam vantagem no conjunto de fatores analisados.',
    );
  } else {
    parts.push(
      'Compradores e vendedores ainda não apresentam domínio suficiente.',
    );
  }

  if (structure) {
    parts.push(structure.explanation);
  }

  if (
    orderBlock &&
    orderBlock.direction !== 'WAIT'
  ) {
    parts.push(orderBlock.explanation);
  }

  if (
    liquidity &&
    liquidity.direction !== 'WAIT'
  ) {
    parts.push(liquidity.explanation);
  }

  if (
    fibonacci &&
    fibonacci.direction !== 'WAIT'
  ) {
    parts.push(fibonacci.explanation);
  }

  if (multiTimeframe) {
    parts.push(
      `O alinhamento entre 1m, 5m, 15m e 60m está em ${multiTimeframe.alignment}%.`,
    );
  }

  return parts.join(' ');
}

function calculateRiskReward(
  result: AnalysisResult,
): string {
  const risk = Math.abs(
    result.entry - result.stop,
  );

  const reward = Math.abs(
    result.target - result.entry,
  );

  if (risk <= 0) {
    return '—';
  }

  const ratio = reward / risk;

  return `1:${ratio.toFixed(1)}`;
}

function calculateProbabilities(
  institutional: InstitutionalAnalysis,
): {
  buyProbability: number;
  sellProbability: number;
} {
  const buyBase =
    institutional.signal === 'BUY'
      ? institutional.confidence
      : institutional.signal === 'SELL'
        ? 100 -
          institutional.confidence
        : 50;

  const confluenceAdjustment =
    (institutional.confluence - 50) *
    0.25;

  const buyProbability = Math.round(
    clamp(
      buyBase +
        (institutional.signal === 'BUY'
          ? confluenceAdjustment
          : -confluenceAdjustment),
      5,
      95,
    ),
  );

  return {
    buyProbability,
    sellProbability:
      100 - buyProbability,
  };
}

function buildWarnings(
  institutional: InstitutionalAnalysis,
  multiTimeframe:
    MultiTimeframeAnalysis | null,
): string[] {
  const warnings: string[] = [];

  if (
    institutional.risk === 'HIGH'
  ) {
    warnings.push(
      'Risco elevado: aguarde confirmação adicional antes de operar.',
    );
  }

  if (
    institutional.confluence < 60
  ) {
    warnings.push(
      'A confluência ainda está baixa entre os fatores analisados.',
    );
  }

  if (
    multiTimeframe &&
    multiTimeframe.alignment < 75
  ) {
    warnings.push(
      'Os timeframes ainda não estão suficientemente alinhados.',
    );
  }

  if (
    institutional.negativeFactors > 0 &&
    institutional.positiveFactors > 0
  ) {
    warnings.push(
      'Existem sinais conflitantes entre indicadores compradores e vendedores.',
    );
  }

  if (warnings.length === 0) {
    warnings.push(
      'Nenhum alerta crítico foi identificado neste momento.',
    );
  }

  return warnings;
}

function buildConfirmations(
  institutional: InstitutionalAnalysis,
): string[] {
  return institutional.factors
    .filter(
      (factor) =>
        factor.direction ===
        institutional.signal &&
        factor.direction !== 'WAIT',
    )
    .sort(
      (first, second) =>
        second.weight - first.weight,
    )
    .slice(0, 5)
    .map(
      (factor) =>
        `${factor.label}: ${factor.explanation}`,
    );
}

function buildOperationalPlan(
  institutional: InstitutionalAnalysis,
  result: AnalysisResult,
): string {
  if (
    institutional.signal === 'BUY'
  ) {
    return `O cenário favorece compras enquanto o preço permanecer acima do stop em ${result.stop}. Evite antecipar a entrada se a confirmação perder força.`;
  }

  if (
    institutional.signal === 'SELL'
  ) {
    return `O cenário favorece vendas enquanto o preço permanecer abaixo do stop em ${result.stop}. Evite antecipar a entrada se a pressão vendedora diminuir.`;
  }

  return 'O cenário atual recomenda aguardar uma confirmação mais clara antes de abrir uma operação.';
}

export function buildInstitutionalNarrative({
  asset,
  result,
  institutional,
  multiTimeframe,
}: InstitutionalNarrativeInput): InstitutionalNarrative {
  const probabilities =
    calculateProbabilities(
      institutional,
    );

  return {
    title: buildTitle(institutional),

    marketReading: buildReading(
      institutional,
      multiTimeframe,
    ),

    operationalPlan:
      buildOperationalPlan(
        institutional,
        result,
      ),

    warnings: buildWarnings(
      institutional,
      multiTimeframe,
    ),

    confirmations:
      buildConfirmations(
        institutional,
      ),

    entry: formatPrice(
      asset,
      result.entry,
    ),

    stop: formatPrice(
      asset,
      result.stop,
    ),

    target: formatPrice(
      asset,
      result.target,
    ),

    riskReward:
      calculateRiskReward(result),

    buyProbability:
      probabilities.buyProbability,

    sellProbability:
      probabilities.sellProbability,
  };
}