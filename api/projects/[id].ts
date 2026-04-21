import { getDb } from '../_lib/db.js';
import { getMockProjectDetail } from '../_lib/mockData.js';
import { parse } from 'cookie';
import { del } from '@vercel/blob';

export default async function handler(req: any, res: any) {
  const { id } = req.query;

  if (req.method === 'DELETE') {
    const cookies = parse(req.headers.cookie || '');
    const isAdmin = cookies.admin_session === 'authenticated';

    if (!isAdmin) {
      return res.status(403).json({ error: 'Permission denied', errorCode: 'FORBIDDEN' });
    }

    const sql = getDb();
    if (!sql) {
      return res.status(503).json({ error: 'Database not available', errorCode: 'UPLOAD_FAILED' });
    }

    try {
      const [project] = await sql`SELECT id FROM projects WHERE id = ${id as string}`;
      if (!project) {
         return res.status(400).json({ error: '演示模板不可删除', errorCode: 'DEMO_PROJECT' });
      }

      // Fetch blob_urls to delete them
      const docs = await sql`SELECT blob_url FROM documents WHERE project_id = ${id as string} AND blob_url IS NOT NULL`;
      const blobUrls = docs.map(d => d.blob_url).filter(Boolean);

      // 2. Delete Blobs
      if (blobUrls.length > 0) {
         try {
           await del(blobUrls);
         } catch (blobErr) {
           console.error("Failed to delete blobs:", blobErr);
         }
      }

      // 3. Delete Relationships, Entities, Audit Logs, Documents, Projects
      await sql`DELETE FROM relationships WHERE project_id = ${id as string}`;
      await sql`DELETE FROM entities WHERE project_id = ${id as string}`;
      await sql`DELETE FROM audit_logs WHERE project_id = ${id as string}`;
      await sql`DELETE FROM documents WHERE project_id = ${id as string}`;
      await sql`DELETE FROM projects WHERE id = ${id as string}`;

      return res.status(200).json({ success: true });
    } catch (err: any) {
      console.error("Delete project error:", err);
      return res.status(500).json({ error: '删除失败，请重试', errorCode: 'UPLOAD_FAILED' });
    }
  }

  if (req.method === 'GET') {
    const sql = getDb();

    // 1. First see if it's a known mock project id (like 1001-1004)
    // We check if it is natively in the demo map.
    const mockDetail = getMockProjectDetail(id as string);
    // Only return mock if it's one of the canonical demo ones, or if we have no DB
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
               id: project.id,
               name: project.name,
               scenario: project.scenario,
               riskScore: Number(project.risk_score),
               riskLevel: project.risk_level,
               dimensionScores: project.dimension_scores,
               createdAt: project.created_at
             },
             documents: documents.map((d: any) => ({
                id: d.id,
                fileName: d.file_name,
                originalName: d.original_name,
                sourceType: d.source_type,
                blobUrl: d.blob_url,
                createdAt: d.uploaded_at
             })),
             audit_logs: audit_logs.map((l: any) => ({
                action: l.action,
                details: JSON.stringify(l.details),
                createdAt: l.created_at
             })),
             entities: entities.map((e: any) => ({
                type: e.type,
                name: e.name,
                attributes: e.attributes
             })),
             relationships: relationships.map((r: any) => ({
                source: r.source,
                target: r.target,
                type: r.relation_type,
                evidence: r.evidence_snippet
             }))
          });
        }
      } catch (err: any) {
        console.error("DB Fetch failed for project details:", err);
      }
    }

    // Fallback if not found in DB but maybe exists in memory store mock
    if (mockDetail) {
      return res.status(200).json(mockDetail);
    }
    
    return res.status(404).json({ error: 'Project not found' });
  } else if (req.method === 'POST') {
    // Placeholder for analyze or upload
    return res.status(200).json({ status: "success", result: "mocked" });
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
