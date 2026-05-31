
export const mapFeaturesToIndices = (suggestedRawFeatures: any) => {
    const f = suggestedRawFeatures || {};
    
    const getVal = (key: string) => (f[key] !== undefined ? Number(f[key]) : 0);

    const x1a = getVal('x1a');
    const x1b = getVal('x1b');
    const x1c = getVal('x1c');
    
    const x2a = getVal('x2a');
    const x2b = getVal('x2b');
    const x2c = getVal('x2c');
    
    const x3a = getVal('x3a');
    const x3b = getVal('x3b');

    const X1 = 0.45 * x1a + 0.45 * x1b + 0.10 * x1c;
    const X2 = 0.40 * x2a + 0.40 * x2b + 0.20 * x2c;
    const X3 = 0.50 * x3a + 0.50 * x3b;

    return { X1, X2, X3 };
};
