import { mockProjects, createNewMockProject } from '../src/lib/mockData';

export default function handler(req: any, res: any) {
  if (req.method === 'GET') {
    return res.status(200).json(mockProjects);
  } else if (req.method === 'POST') {
    // Try to create mock project on Vercel instance memory
    const { name, scenario } = req.body || {};
    try {
      const newProject = createNewMockProject(name, scenario || 'IPO审查');
      return res.status(201).json({
        id: newProject.id,
        name: newProject.name,
        scenario: newProject.scenario,
        status: "created"
      });
    } catch (e) {
      return res.status(201).json({
        id: Math.floor(Math.random() * 10000) + 2000,
        name: name || "Demo Project",
        scenario: scenario || "IPO审查",
        status: "created (fallback)"
      });
    }
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
