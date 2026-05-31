
export const trainCategoryWeights = (samples: any[]) => {
    if (!samples || samples.length < 5) {
        return { fallback: true };
    }
    
    let W1 = Math.random(), W2 = Math.random(), W3 = Math.random(), b = Math.random() - 2;
    const lr = 0.05;
    const epochs = 100;
    
    for (let e=0; e<epochs; e++) {
        for (let s of samples) {
            const z = W1 * s.X1 + W2 * s.X2 + W3 * s.X3 + b;
            const p = 1 / (1 + Math.exp(-z));
            const err = p - s.label;
            W1 -= lr * err * s.X1;
            W2 -= lr * err * s.X2;
            W3 -= lr * err * s.X3;
            b -= lr * err;
        }
    }
    return {
        W1: parseFloat(W1.toFixed(3)),
        W2: parseFloat(W2.toFixed(3)),
        W3: parseFloat(W3.toFixed(3)),
        b: parseFloat(b.toFixed(3)),
        fallback: false
    };
};
