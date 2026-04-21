import { getDb } from './_lib/db.js';
import { mockProjects } from './_lib/mockData.js';
import { generateInitialRiskProfile } from './_lib/initialRiskProfile.js';

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
          riskScore: p.risk_score != null ? Number(p.risk_score) : 0,
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
    if (!sql) {
      return res.status(503).json({ error: "数据库尚未配置 (DATABASE_URL missing)。当前为仅可读 Demo 模式，无法创建真实项目。" });
    }

    const { name, scenario } = req.body || {};
    
    if (!name || !name.trim()) {
      return res.status(400).json({ error: "项目名称不能为空" });
    }

    const projectId = 'PROJ-' + Date.now() + Math.floor(Math.random()*(999-100+1)+100);
    const scene = scenario || 'IPO审查';

    try {
      const initialProfile = generateInitialRiskProfile(scene);
      
      await sql`
        INSERT INTO projects (id, name, scenario, risk_score, risk_level, dimension_scores)
        VALUES (
          ${projectId}, 
          ${name}, 
          ${scene}, 
          ${initialProfile.totalScore}, 
          ${initialProfile.level}::jsonb, 
          ${initialProfile.dimensionScores}::jsonb
        )
      `;
      
      // Add initial logs from profile
      for (const log of initialProfile.logs) {
        await sql`
          INSERT INTO audit_logs (project_id, action, details)
          VALUES (${projectId}, ${log.action}, ${log.details}::jsonb)
        `;
      }

      // Add rule hits as RED_FLAG audit logs to show in UI pre-warnings
      for (const hit of initialProfile.ruleHits) {
         await sql`
           INSERT INTO audit_logs (project_id, action, details)
           VALUES (${projectId}, 'RED_FLAG', ${JSON.stringify({ 
             ruleName: hit.ruleName, 
             ruleId: hit.ruleId, 
             dimension: hit.dimension, 
             scoreImpact: hit.scoreImpact, 
             description: hit.description, 
             severity: hit.severity 
           })}::jsonb)
         `;
      }

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
      return res.status(500).json({ 
        error: "真实项目插入数据库失败。请确认是否已执行 /api/db/init 生成数据表结构。", 
        detail: err.message 
      });
    }
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
