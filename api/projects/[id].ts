import { getMockProjectDetail } from '../../src/lib/mockData';

export default function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const { id } = req.query;
    const detail = getMockProjectDetail(id);
    if (!detail) {
      return res.status(404).json({ error: 'Project not found' });
    }
    return res.status(200).json(detail);
  } else if (req.method === 'POST') {
    // Placeholder for analyze or upload
    return res.status(200).json({ status: "success", result: "mocked" });
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
