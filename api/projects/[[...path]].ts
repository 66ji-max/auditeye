import { getDb } from '../_lib/db.js';
import { mockProjects, getMockProjectDetail } from '../_lib/mockData.js';
import { generateInitialRiskProfile } from '../_lib/initialRiskProfile.js';
import { parse } from 'cookie';
import { del, put } from '@vercel/blob';
import multer from 'multer';

export const config = {
  api: {
    bodyParser: false,
  },
};

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }, 
});

function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

function getJsonBody(req: any) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk: any) => { body += chunk.toString() });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); } catch (e) { resolve({}); }
    });
  });
}

export default async function handler(req: any, res: any) {
  const rawPath = req.query.path;
  const pathParts = Array.isArray(rawPath) ? rawPath : (typeof rawPath === 'string' ? rawPath.split('/') : []);
  const sql = getDb();

  // /api/projects
  if (pathParts.length === 0) {
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
        } catch (err) {}
      }
      return res.status(200).json([...dbProjects, ...mockProjects]);
      
    } else if (req.method === 'POST') {
      if (!sql) return res.status(503).json({ error: "数据库尚未配置" });
      const body: any = await getJsonBody(req);
      const { name, scenario } = body || {};
      if (!name) return res.status(400).json({ error: "项目名称不能为空" });

      const projectId = 'PROJ-' + Date.now() + Math.floor(Math.random()*900+100);
      const scene = scenario || 'IPO关联交易核查';

      try {
        const initialProfile = generateInitialRiskProfile(scene);
        
        await sql`
          INSERT INTO projects (id, name, scenario, risk_score, risk_level, dimension_scores)
          VALUES (${projectId}, ${name}, ${scene}, ${initialProfile.totalScore}, ${initialProfile.level}::jsonb, ${initialProfile.dimensionScores}::jsonb)
        `;
        
        for (const log of initialProfile.logs) {
          await sql`INSERT INTO audit_logs (project_id, action, details) VALUES (${projectId}, ${log.action}, ${log.details}::jsonb)`;
        }
        for (const hit of initialProfile.ruleHits) {
          await sql`
             INSERT INTO audit_logs (project_id, action, details)
             VALUES (${projectId}, 'RED_FLAG', ${JSON.stringify({ 
               ruleName: hit.ruleName, ruleId: hit.ruleId, dimension: hit.dimension, 
               scoreImpact: hit.scoreImpact, description: hit.description, severity: hit.severity 
             })}::jsonb)
          `;
        }
        await sql`INSERT INTO entities (project_id, type, name, attributes) VALUES (${projectId}, 'COMPANY', ${name + ' (查验标的)'}, ${JSON.stringify({ status: '新建' })}::jsonb)`;
        return res.status(201).json({ id: projectId, name, scenario: scene, status: "created" });
      } catch (err: any) {
        return res.status(500).json({ error: "真实项目插入数据库失败", detail: err.message });
      }
    }
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // /api/projects/:id
  const id = pathParts[0];
  
  // /api/projects/:id/analyze
  if (pathParts.length > 1 && pathParts[1] === 'analyze') {
     return res.status(200).json({ status: "success", result: "mocked" });
  }

  // /api/projects/:id/documents
  if (pathParts.length > 1 && pathParts[1] === 'documents') {
    if (req.method !== 'POST') {
      return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
      await runMiddleware(req, res, upload.array('files'));
    } catch (e: any) {
      if (e.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).json({ error: '文件太大，请压缩后重试', errorCode: 'FILE_TOO_LARGE' });
      }
      return res.status(400).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
    }

    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      return res.status(400).json({ error: '上传未包含文件', errorCode: 'NO_FILES' });
    }

    if (['1001', '1002', '1003', '1004'].includes(id as string)) {
      let formatError = false;
      for (const file of files) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : '';
        if (!ALLOWED_EXTS.includes(ext)) { formatError = true; break; }
      }
      if (formatError) {
        return res.status(400).json({ error: '仅支持 PDF、DOC、DOCX、TXT、XLSX、XLS、CSV、PNG、JPG 文件', errorCode: 'INVALID_FILE_TYPE' });
      }
      const fakeDocs = files.map((file, i) => {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        return {
          id: Date.now() + i,
          fileName: originalName,
          originalName: originalName,
          sourceType: originalName.substring(originalName.lastIndexOf('.')),
          blobUrl: '',
          createdAt: new Date().toISOString(),
          status: '已接入'
        };
      });
      return res.status(200).json({ status: "success", documents: fakeDocs });
    }

    if (!sql) return res.status(503).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
    if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ error: '上传失败，未配置存储', errorCode: 'UPLOAD_FAILED' });

    try {
      const [project] = await sql`SELECT id FROM projects WHERE id = ${id as string}`;
      if (!project) return res.status(404).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
    } catch (err: any) {
      return res.status(500).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
    }

    let formatError = false;
    for (const file of files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : '';
      if (!ALLOWED_EXTS.includes(ext)) { formatError = true; break; }
      if (file.size > MAX_FILE_SIZE) return res.status(413).json({ error: '文件太大，请压缩后重试', errorCode: 'FILE_TOO_LARGE' });
    }
    if (formatError) return res.status(400).json({ error: '仅支持 PDF、DOC、DOCX、TXT、XLSX、XLS、CSV、PNG、JPG 文件', errorCode: 'INVALID_FILE_TYPE' });

    const insertedDocs = [];
    for (const file of files) {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
      try {
        const randomId = Math.random().toString(36).substring(2, 10);
        const safeBlobKey = `audit-files/${id}/${Date.now()}-${randomId}${ext}`;
        
        const blobResult = await put(safeBlobKey, file.buffer, { access: 'public' });
        
        const [doc] = await sql`
           INSERT INTO documents (project_id, file_name, original_name, source_type, blob_url)
           VALUES (${id as string}, ${safeBlobKey}, ${originalName}, ${ext}, ${blobResult.url})
           RETURNING id, file_name, original_name, source_type, blob_url, uploaded_at
        `;
        insertedDocs.push({
          id: doc.id, fileName: doc.file_name, originalName: doc.original_name,
          sourceType: doc.source_type, blobUrl: doc.blob_url, createdAt: doc.uploaded_at
        });
      } catch(e: any) {
        return res.status(500).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
      }
    }
    return res.status(200).json({ status: "success", documents: insertedDocs });
  }

  // /api/projects/:id
  if (req.method === 'DELETE') {
    const cookies = parse(req.headers.cookie || '');
    const isAdmin = cookies.admin_session === 'authenticated';
    const isRollback = req.headers['x-rollback-request'] === 'true';

    if (!isAdmin && !isRollback) return res.status(403).json({ error: '只有管理员可删除项目', errorCode: 'FORBIDDEN' });
    if (!sql) return res.status(503).json({ error: 'Database not available', errorCode: 'UPLOAD_FAILED' });

    try {
      const [project] = await sql`SELECT id FROM projects WHERE id = ${id}`;
      if (!project) return res.status(400).json({ error: '演示模板不可删除', errorCode: 'DEMO_PROJECT' });

      const docs = await sql`SELECT blob_url FROM documents WHERE project_id = ${id} AND blob_url IS NOT NULL`;
      const blobUrls = docs.map((d: any) => d.blob_url).filter(Boolean);
      if (blobUrls.length > 0) {
         try { await del(blobUrls); } catch (e) {}
      }

      await sql`DELETE FROM relationships WHERE project_id = ${id}`;
      await sql`DELETE FROM entities WHERE project_id = ${id}`;
      await sql`DELETE FROM audit_logs WHERE project_id = ${id}`;
      await sql`DELETE FROM documents WHERE project_id = ${id}`;
      await sql`DELETE FROM projects WHERE id = ${id}`;

      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: '删除失败' });
    }
  }

  if (req.method === 'GET') {
    const mockDetail = getMockProjectDetail(id as string);
    if (["1001", "1002", "1003", "1004"].includes(id as string) && mockDetail) {
      return res.status(200).json(mockDetail);
    }
    
    if (sql) {
      try {
        const [project] = await sql`SELECT * FROM projects WHERE id = ${id}`;
        if (project) {
          const documents = await sql`SELECT * FROM documents WHERE project_id = ${id}`;
          const audit_logs = await sql`SELECT * FROM audit_logs WHERE project_id = ${id} ORDER BY created_at ASC`;
          const entities = await sql`SELECT * FROM entities WHERE project_id = ${id}`;
          const relationships = await sql`SELECT * FROM relationships WHERE project_id = ${id}`;

          return res.status(200).json({
             project: {
               id: project.id, name: project.name, scenario: project.scenario,
               riskScore: Number(project.risk_score), riskLevel: project.risk_level,
               dimensionScores: project.dimension_scores, createdAt: project.created_at
             },
             documents: documents.map((d: any) => ({
                id: d.id, fileName: d.file_name, originalName: d.original_name,
                sourceType: d.source_type, blobUrl: d.blob_url, createdAt: d.uploaded_at
             })),
             audit_logs: audit_logs.map((l: any) => ({
                action: l.action, details: JSON.stringify(l.details), createdAt: l.created_at
             })),
             entities: entities.map((e: any) => ({
                type: e.type, name: e.name, attributes: e.attributes
             })),
             relationships: relationships.map((r: any) => ({
                source: r.source, target: r.target, type: r.relation_type, evidence: r.evidence_snippet
             }))
          });
        }
      } catch (err) {}
    }

    if (mockDetail) return res.status(200).json(mockDetail);
    return res.status(404).json({ error: 'Project not found' });
  }

  return res.status(405).json({ error: 'Method Not Allowed' });
}
