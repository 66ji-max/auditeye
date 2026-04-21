import { getDb } from '../src/lib/db';
import { mockProjects, createNewMockProject } from '../src/lib/mockData';

export default async function handler(req: any, res: any) {
  const sql = getDb();

  if (req.method === 'GET') {
    let dbProjects: any[] = [];
    if (sql) {
      try {
        const rows = await sql`
          SELECT p.*, 
          (SELECT COUNT(*) FROM documents d WHERE d.project_id = p.id) as doc_count
          FROM projects p 
          ORDER BY p.created_at DESC
        `;
        dbProjects = rows.map((p: any) => ({
          id: String(p.id),
          name: p.name,
          scenario: p.scenario,
          riskScore: p.risk_score ? Number(p.risk_score) : 0,
          riskLevel: p.risk_level ? p.risk_level : { label: '未评级', color: 'bg-gray-500' },
          docCount: Number(p.doc_count) || 0,
          createdAt: p.created_at ? new Date(p.created_at).toISOString() : new Date().toISOString()
        }));
      } catch (err) {
        console.warn("DB fetch failed for projects schema might be missing:", err);
      }
    }
    
    // Merge DB projects and demo projects. DB first.
    return res.status(200).json([...dbProjects, ...mockProjects]);
    
  } else if (req.method === 'POST') {
    const { name, scenario } = req.body || {};
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "项目名称不能为空" });
    }

    const projectId = 'PROJ-' + Date.now() + Math.floor(Math.random()*(999-100+1)+100);
    const scene = scenario || 'IPO审查';

    if (sql) {
      try {
        const initialRiskLevel = { label: '扫描中', color: 'bg-blue-500/20 text-blue-500 border-blue-500/50' };
        
        await sql`
          INSERT INTO projects (id, name, scenario, risk_score, risk_level, dimension_scores)
          VALUES (${projectId}, ${name}, ${scene}, 0, ${initialRiskLevel}::jsonb, '{}'::jsonb)
        `;
        
        // Add initial log
        await sql`
          INSERT INTO audit_logs (project_id, action, details)
          VALUES (${projectId}, 'INFO', ${JSON.stringify({ message: "项目初始化完成，正在等待文档上传。" })}::jsonb)
        `;

        // Add initial entity
        await sql`
          INSERT INTO entities (project_id, type, name, attributes)
          VALUES (${projectId}, 'COMPANY', ${name + ' (查验标的)'}, ${JSON.stringify({ status: '新建' })}::jsonb)
        `;

        return res.status(201).json({
          id: projectId,
          name: name,
          scenario: scene,
          status: "created"
        });
      } catch (err: any) {
        console.error("DB Insert Failed:", err);
        // Fallback below
      }
    }

    // FALLBACK to memory store if DB is absent or failed
    try {
      const newProject = createNewMockProject(name, scene);
      return res.status(201).json({
        id: newProject.id,
        name: newProject.name,
        scenario: newProject.scenario,
        status: "created (memory fallback)"
      });
    } catch (e: any) {
      return res.status(500).json({ error: "创建项目失败", detail: e.message });
    }
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
