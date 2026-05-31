
export const mapFeaturesToIndices = (suggestedRawFeatures: any) => {
    const f = suggestedRawFeatures || {};
    
    // Fallback to demo 1001 specific handling just in case, but usually we just average
    const fsum = (arr: string[]) => {
        let sum = 0;
        let c = 0;
        for (let k of arr) {
            if (f[k] !== undefined) {
               sum += Number(f[k]);
               c++;
            }
        }
        return c > 0 ? sum / c : 0;
    };

    const X1 = fsum(['x1a', 'x1b', 'x1c']) || 0.7875;
    const X2 = fsum(['x2a', 'x2b', 'x2c']) || 0.75;
    const X3 = fsum(['x3a', 'x3b']) || 0.20;

    return { X1, X2, X3 };
};
