
import { getStoredModelWeights, saveModelWeights } from './neonTrainingStore.js';

const categoryWeights: Record<string, any> = {
    "IPO关联交易核查": { W1: 2.2, W2: 3.5, W3: 0.5, b: -3.0 },
    "收入真实性核查": { W1: 0.8, W2: 3.8, W3: 1.2, b: -2.6 },
    "供应商舞弊核查": { W1: 2.7, W2: 3.0, W3: 0.8, b: -2.9 },
    "存货异常核查": { W1: 0.4, W2: 2.2, W3: 2.6, b: -2.4 },
    "资金流水异常核查": { W1: 1.0, W2: 3.2, W3: 2.0, b: -2.8 }
};

export const getWeightsByProjectType = async (type: string) => {
    const stored = await getStoredModelWeights(type);
    if (stored && stored.weights) {
        return stored.weights;
    }
    return categoryWeights[type] || categoryWeights["IPO关联交易核查"];
};

export const saveOrCacheWeights = async (type: string, weights: any, meta?: any): Promise<boolean> => {
    categoryWeights[type] = weights; // Keep in memory cache
    
    return await saveModelWeights(type, {
        method: meta?.method || 'logistic',
        weights,
        sampleCount: meta?.sampleCount || 0,
        fallback: meta?.fallback || false,
        trainingMethod: meta?.trainingMethod || "weak-supervised logistic regression",
        featureImportance: meta?.featureImportance || null
    });
};
