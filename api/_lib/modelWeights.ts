
const categoryWeights: Record<string, any> = {
    "IPO关联交易核查": { W1: 2.2, W2: 3.5, W3: 0.5, b: -3.0 },
    "收入真实性核查": { W1: 0.8, W2: 3.8, W3: 1.2, b: -2.6 },
    "供应商舞弊核查": { W1: 2.7, W2: 3.0, W3: 0.8, b: -2.9 },
    "存货异常核查": { W1: 0.4, W2: 2.2, W3: 2.6, b: -2.4 },
    "资金流水异常核查": { W1: 1.0, W2: 3.2, W3: 2.0, b: -2.8 }
};

export const getWeightsByProjectType = (type: string) => {
    return categoryWeights[type] || categoryWeights["IPO关联交易核查"];
};

export const saveOrCacheWeights = (type: string, weights: any) => {
    categoryWeights[type] = weights;
};
