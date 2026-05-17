export const RISK_DIMENSIONS = {
  identity: {
    id: 'identity',
    name: '身份关联识别',
    weight: 0.6,
  },
  behavior: {
    id: 'behavior',
    name: '交易行为异常',
    weight: 0.3,
  },
  circumstantial: {
    id: 'circumstantial',
    name: '外围关联佐证',
    weight: 0.1,
  }
} as const;

export type RiskDimension = keyof typeof RISK_DIMENSIONS;

export const RISK_THRESHOLDS = [
  { max: 29, label: '低风险', color: 'text-green-500', bg: 'bg-green-500' },
  { max: 59, label: '中风险', color: 'text-blue-500', bg: 'bg-blue-500' },
  { max: 84, label: '中高风险', color: 'text-orange-500', bg: 'bg-orange-500' },
  { max: 100, label: '极高风险', color: 'text-red-500', bg: 'bg-red-500' }
];

export function getRiskLevel(score: number) {
  for (const threshold of RISK_THRESHOLDS) {
    if (score <= threshold.max) {
      return threshold;
    }
  }
  return RISK_THRESHOLDS[RISK_THRESHOLDS.length - 1]; // Fallback
}

export function calculateProjectRisk(ruleHits: Array<{ scoreImpact: number; dimension: RiskDimension }>) {
  let dimensionScores = {
    identity: 0,
    behavior: 0,
    circumstantial: 0
  };

  for (const hit of ruleHits) {
    if (dimensionScores[hit.dimension] !== undefined) {
      dimensionScores[hit.dimension] += hit.scoreImpact;
    }
  }

  // Cap each dimension at 100
  dimensionScores.identity = Math.min(100, dimensionScores.identity);
  dimensionScores.behavior = Math.min(100, dimensionScores.behavior);
  dimensionScores.circumstantial = Math.min(100, dimensionScores.circumstantial);

  const totalScore = Math.floor(
    dimensionScores.identity * RISK_DIMENSIONS.identity.weight +
    dimensionScores.behavior * RISK_DIMENSIONS.behavior.weight +
    dimensionScores.circumstantial * RISK_DIMENSIONS.circumstantial.weight
  );

  return {
    totalScore: Math.min(100, Math.max(0, totalScore)), // Cap overall score
    dimensionScores,
    level: getRiskLevel(totalScore)
  };
}
