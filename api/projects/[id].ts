import { getMockProjectDetail } from '../../src/lib/mockData.js';

export default function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const { id } = req.query;
    return res.status(200).json(getMockProjectDetail(id));
  } else if (req.method === 'POST') {
    // Placeholder for analyze or upload
    return res.status(200).json({ status: "success", result: "mocked" });
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
