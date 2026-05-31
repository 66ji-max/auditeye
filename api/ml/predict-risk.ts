
import { getWeightsByProjectType } from '../_lib/modelWeights.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { projectType = "IPO关联交易核查", X1 = 0, X2 = 0, X3 = 0 } = req.body || {};
        const w = getWeightsByProjectType(projectType);
        
        const z = w.W1 * X1 + w.W2 * X2 + w.W3 * X3 + w.b;
        const p = 1 / (1 + Math.exp(-z));
        
        res.status(200).json({
            projectType,
            weights: w,
            zValue: parseFloat(z.toFixed(4)),
            probability: parseFloat(p.toFixed(3)),
            probabilityPercent: parseFloat((p * 100).toFixed(1)),
            riskLevel: p > 0.8 ? "极高风险" : (p > 0.5 ? "高风险" : "中低风险")
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
}
