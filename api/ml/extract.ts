
import { extractEvidence } from '../_lib/aiExtraction.js';

export default async function handler(req: any, res: any) {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
    try {
        const { projectType = "IPO关联交易核查", documentText = "" } = req.body || {};
        const result = await extractEvidence(projectType, documentText);
        res.status(200).json(result);
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
}
