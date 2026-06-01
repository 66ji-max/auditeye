export const basicNeuralWeightTraining = (samples: any[], defaultWeights: any) => {
  if (!samples || samples.length < 20) {
    return {
      modelType: "basic-mlp",
      sampleCount: samples?.length || 0,
      fallback: true,
      trainingMethod: "basic neural network MLP",
      featureImportance: {
        x1a: 0, x1b: 0, x1c: 0,
        x2a: 0, x2b: 0, x2c: 0,
        x3a: 0, x3b: 0
      },
      derivedCategoryWeights: {
        W1: defaultWeights?.W1 ?? 2.2,
        W2: defaultWeights?.W2 ?? 3.5,
        W3: defaultWeights?.W3 ?? 0.5,
        b: defaultWeights?.b ?? -3.0
      },
      explanation: "样本数量不足 20 条，使用默认门类权重。"
    };
  }

  const lr = 0.03;
  const epochs = 100;
  const inputSize = 8;
  const hiddenSize = 6;
  const outputSize = 1;

  // Initialize weights
  const W1 = Array.from({ length: inputSize }, () =>
    Array.from({ length: hiddenSize }, () => Math.random() * 0.2 - 0.1)
  );
  const b1 = Array(hiddenSize).fill(0);
  const W2 = Array.from({ length: hiddenSize }, () =>
    Array.from({ length: outputSize }, () => Math.random() * 0.2 - 0.1)
  );
  const b2 = Array(outputSize).fill(0);

  const sigmoid = (x: number) => 1 / (1 + Math.exp(-x));
  const sigmoidDerivative = (x: number) => x * (1 - x);

  const features = ['x1a', 'x1b', 'x1c', 'x2a', 'x2b', 'x2c', 'x3a', 'x3b'];

  for (let epoch = 0; epoch < epochs; epoch++) {
    for (const sample of samples) {
      // Forward
      const x = features.map(f => sample[f] || 0);
      const h = Array(hiddenSize).fill(0);
      for (let j = 0; j < hiddenSize; j++) {
        for (let i = 0; i < inputSize; i++) {
          h[j] += x[i] * W1[i][j];
        }
        h[j] = sigmoid(h[j] + b1[j]);
      }

      const o = Array(outputSize).fill(0);
      for (let k = 0; k < outputSize; k++) {
        for (let j = 0; j < hiddenSize; j++) {
          o[k] += h[j] * W2[j][k];
        }
        o[k] = sigmoid(o[k] + b2[k]);
      }

      // Backward
      const label = sample.label || 0;
      const errorOutput = o[0] - label;
      const deltaOutput = errorOutput * sigmoidDerivative(o[0]);

      const errorHidden = Array(hiddenSize).fill(0);
      const deltaHidden = Array(hiddenSize).fill(0);
      for (let j = 0; j < hiddenSize; j++) {
        errorHidden[j] = deltaOutput * W2[j][0];
        deltaHidden[j] = errorHidden[j] * sigmoidDerivative(h[j]);
      }

      // Update Weights W2
      for (let j = 0; j < hiddenSize; j++) {
        W2[j][0] -= lr * deltaOutput * h[j];
      }
      b2[0] -= lr * deltaOutput;

      // Update Weights W1
      for (let i = 0; i < inputSize; i++) {
        for (let j = 0; j < hiddenSize; j++) {
          W1[i][j] -= lr * deltaHidden[j] * x[i];
        }
      }
      for (let j = 0; j < hiddenSize; j++) {
        b1[j] -= lr * deltaHidden[j];
      }
    }
  }

  // Calculate feature importance
  const featureImportanceMap: Record<string, number> = {};
  for (let i = 0; i < inputSize; i++) {
    let sumWeight = 0;
    for (let j = 0; j < hiddenSize; j++) {
      sumWeight += Math.abs(W1[i][j]);
    }
    featureImportanceMap[features[i]] = sumWeight;
  }

  // Aggregate importance
  const X1Importance = featureImportanceMap['x1a'] + featureImportanceMap['x1b'] + featureImportanceMap['x1c'];
  const X2Importance = featureImportanceMap['x2a'] + featureImportanceMap['x2b'] + featureImportanceMap['x2c'];
  const X3Importance = featureImportanceMap['x3a'] + featureImportanceMap['x3b'];

  const totalImportance = X1Importance + X2Importance + X3Importance || 1;

  // Scale relative to default total weight
  const defaultTotal = (defaultWeights?.W1 ?? 2.2) + (defaultWeights?.W2 ?? 3.5) + (defaultWeights?.W3 ?? 0.5);
  
  const factor = defaultTotal / totalImportance;

  return {
    modelType: "basic-mlp",
    sampleCount: samples.length,
    fallback: false,
    trainingMethod: "basic neural network MLP",
    featureImportance: featureImportanceMap,
    derivedCategoryWeights: {
      W1: parseFloat((X1Importance * factor).toFixed(3)),
      W2: parseFloat((X2Importance * factor).toFixed(3)),
      W3: parseFloat((X3Importance * factor).toFixed(3)),
      b: defaultWeights?.b ?? -3.0
    },
    explanation: "神经网络用于学习底层特征重要性，最终投影为可解释的 W1/W2/W3，从而兼顾模型学习能力与审计可解释性。"
  };
};
