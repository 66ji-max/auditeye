import { getDb } from '../../src/lib/db';
import { getMockProjectDetail } from '../../src/lib/mockData';

export default async function handler(req: any, res: any) {
  if (req.method === 'GET') {
    const { id } = req.query;

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
