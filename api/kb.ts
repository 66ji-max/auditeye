import { mockKb } from '../src/lib/mockData.js';

export default function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json(mockKb);
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
