export const RISK_DIMENSIONS = {
  identity: { id: 'identity', name: '身份关联识别', weight: 0.6, maxScore: 60 },
  behavior: { id: 'behavior', name: '交易行为异常', weight: 0.3, maxScore: 30 },
  circumstantial: { id: 'circumstantial', name: '外围关联佐证', weight: 0.1, maxScore: 10 }
} as const;

export type RiskDimension = keyof typeof RISK_DIMENSIONS;

export const RISK_THRESHOLDS = [
  { max: 29, label: '低风险', color: 'text-green-500', bg: 'bg-green-500' },
  { max: 59, label: '中风险', color: 'text-blue-500', bg: 'bg-blue-500' },
  { max: 74, label: '中高风险', color: 'text-orange-500', bg: 'bg-orange-500' },
  { max: 100, label: '极高风险', color: 'text-red-500', bg: 'bg-red-500' }
];

export function getRiskLevelLegacy(score: number) {
  for (const threshold of RISK_THRESHOLDS) {
    if (score <= threshold.max) {
      return threshold;
    }
  }
  return RISK_THRESHOLDS[RISK_THRESHOLDS.length - 1]; // Fallback
}

export function calculateProjectRisk(ruleHits: Array<{ scoreImpact: number; dimension: RiskDimension }>) {
  let dimensionScores = { identity: 0, behavior: 0, circumstantial: 0 };
  for (const hit of ruleHits) {
    if (dimensionScores[hit.dimension] !== undefined) {
      dimensionScores[hit.dimension] += hit.scoreImpact;
    }
  }
  dimensionScores.identity = Math.min(RISK_DIMENSIONS.identity.maxScore, dimensionScores.identity);
  dimensionScores.behavior = Math.min(RISK_DIMENSIONS.behavior.maxScore, dimensionScores.behavior);
  dimensionScores.circumstantial = Math.min(RISK_DIMENSIONS.circumstantial.maxScore, dimensionScores.circumstantial);
  const totalScore = dimensionScores.identity + dimensionScores.behavior + dimensionScores.circumstantial;
  return {
    totalScore: Math.min(100, Math.max(0, totalScore)),
    dimensionScores,
    level: getRiskLevelLegacy(totalScore)
  };
}

export const SUB_INDEX_WEIGHTS = {
  X1: { x1a: 0.45, x1b: 0.45, x1c: 0.10 },
  X2: { x2a: 0.40, x2b: 0.40, x2c: 0.20 },
  X3: { x3a: 0.50, x3b: 0.50 }
};

export const GLOBAL_RISK_WEIGHTS = {
  W1: 2.2,
  W2: 3.5,
  W3: 0.5,
  b: -3.0
};

export function calculateSubIndices(rawFeatures: any) {
  const x1a = rawFeatures.identityNetwork?.find((f: any) => f.id === 'x1a')?.value || 0;
  const x1b = rawFeatures.identityNetwork?.find((f: any) => f.id === 'x1b')?.value || 0;
  const x1c = rawFeatures.identityNetwork?.find((f: any) => f.id === 'x1c')?.value || 0;
  const X1 = SUB_INDEX_WEIGHTS.X1.x1a * x1a + SUB_INDEX_WEIGHTS.X1.x1b * x1b + SUB_INDEX_WEIGHTS.X1.x1c * x1c;

  const x2a = rawFeatures.transactionAbnormality?.find((f: any) => f.id === 'x2a')?.value || 0;
  const x2b = rawFeatures.transactionAbnormality?.find((f: any) => f.id === 'x2b')?.value || 0;
  const x2c = rawFeatures.transactionAbnormality?.find((f: any) => f.id === 'x2c')?.value || 0;
  const X2 = SUB_INDEX_WEIGHTS.X2.x2a * x2a + SUB_INDEX_WEIGHTS.X2.x2b * x2b + SUB_INDEX_WEIGHTS.X2.x2c * x2c;

  const x3a = rawFeatures.externalTrace?.find((f: any) => f.id === 'x3a')?.value || 0;
  const x3b = rawFeatures.externalTrace?.find((f: any) => f.id === 'x3b')?.value || 0;
  const X3 = SUB_INDEX_WEIGHTS.X3.x3a * x3a + SUB_INDEX_WEIGHTS.X3.x3b * x3b;

  return { X1, X2, X3 };
}

export function calculateZValue(subIndices: { X1: number, X2: number, X3: number }, overrideWeights?: { W1: number, W2: number, W3: number, b: number }) {
  const w = overrideWeights || GLOBAL_RISK_WEIGHTS; 
  return w.W1 * subIndices.X1 + w.W2 * subIndices.X2 + w.W3 * subIndices.X3 + w.b;
}

export function calculateRiskProbability(z: number) {
  return 1 / (1 + Math.exp(-z));
}

export function getRiskLevelByProbability(probability: number) {
  if (probability >= 0.75) return "极高风险";
  if (probability >= 0.50) return "中高风险";
  if (probability >= 0.30) return "中等风险";
  return "低风险";
}

export function formatProbability(probability: number) {
  return (probability * 100).toFixed(1) + '%';
}

export function validateRiskScoringData(project: any) {
  if (!project || !project.riskScoring) return false;
  const scoring = project.riskScoring;
  if (!scoring.rawFeatures) {
    console.warn("Validating risk scoring: missing rawFeatures");
    return false;
  }
  const allFeatures = [
    ...(scoring.rawFeatures.identityNetwork || []),
    ...(scoring.rawFeatures.transactionAbnormality || []),
    ...(scoring.rawFeatures.externalTrace || [])
  ];
  for (const f of allFeatures) {
    if (f.value < 0 || f.value > 1) {
      console.warn(`Validating risk scoring: feature ${f.id} value out of bounds: ${f.value}`);
      return false;
    }
  }
  if (scoring.subIndices === undefined || scoring.subIndices.X1 === undefined || scoring.subIndices.X2 === undefined || scoring.subIndices.X3 === undefined) {
    console.warn("Validating risk scoring: missing subIndices calculations");
    return false;
  }
  return true;
}
