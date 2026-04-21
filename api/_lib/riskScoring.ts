export const RISK_DIMENSIONS = {
  relation: {
    id: 'relation',
    name: '关联关系风险',
    weight: 0.4,
  },
  behavior: {
    id: 'behavior',
    name: '行为异动风险',
    weight: 0.4,
  },
  financial: {
    id: 'financial',
    name: '财务异常风险',
    weight: 0.2,
  }
} as const;

export type RiskDimension = keyof typeof RISK_DIMENSIONS;

export const RISK_THRESHOLDS = [
  { max: 30, label: '常规审计', color: 'text-green-500', bg: 'bg-green-500' },
  { max: 60, label: '扩大抽样', color: 'text-blue-500', bg: 'bg-blue-500' },
  { max: 80, label: '建议重点追踪', color: 'text-orange-500', bg: 'bg-orange-500' },
  { max: 100, label: '专项反舞弊核查', color: 'text-red-500', bg: 'bg-red-500' }
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
    relation: 0,
    behavior: 0,
    financial: 0
  };

  for (const hit of ruleHits) {
    if (dimensionScores[hit.dimension] !== undefined) {
      dimensionScores[hit.dimension] += hit.scoreImpact;
    }
  }

  // Cap each dimension at 100
  dimensionScores.relation = Math.min(100, dimensionScores.relation);
  dimensionScores.behavior = Math.min(100, dimensionScores.behavior);
  dimensionScores.financial = Math.min(100, dimensionScores.financial);

  const totalScore = Math.floor(
    dimensionScores.relation * RISK_DIMENSIONS.relation.weight +
    dimensionScores.behavior * RISK_DIMENSIONS.behavior.weight +
    dimensionScores.financial * RISK_DIMENSIONS.financial.weight
  );

  return {
    totalScore: Math.min(100, totalScore), // Cap overall score
    dimensionScores,
    level: getRiskLevel(totalScore)
  };
}
