import { mockProjects } from '../src/lib/mockData.js';

export default function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json(mockProjects);
  } else if (req.method === 'POST') {
    // Vercel serverless functions are read-only for local files, so we mock the creation
    const { name, scenario } = req.body || {};
    return res.status(201).json({
      id: Math.floor(Math.random() * 10000) + 2000,
      name: name || "Demo Project",
      scenario: scenario || "IPO审查",
      status: "created"
    });
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
