import { getDb } from '../_lib/db.js';

export default async function handler(req: any, res: any) {
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sql = getDb();

  if (!sql) {
    return res.status(400).json({ error: "DATABASE_URL is not configured." });
  }

  try {
    await sql`
      CREATE TABLE IF NOT EXISTS projects (
          id VARCHAR(255) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          scenario VARCHAR(255) NOT NULL,
          risk_score NUMERIC DEFAULT 0,
          risk_level JSONB,
          dimension_scores JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS documents (
          id SERIAL PRIMARY KEY,
          project_id VARCHAR(255) REFERENCES projects(id),
          file_name VARCHAR(255) NOT NULL,
          original_name VARCHAR(255) NOT NULL,
          source_type VARCHAR(50),
          blob_url TEXT,
          uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          project_id VARCHAR(255) REFERENCES projects(id),
          action VARCHAR(50),
          details JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS entities (
          id SERIAL PRIMARY KEY,
          project_id VARCHAR(255) REFERENCES projects(id),
          type VARCHAR(50),
          name VARCHAR(255),
          attributes JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS relationships (
          id SERIAL PRIMARY KEY,
          project_id VARCHAR(255) REFERENCES projects(id),
          source VARCHAR(255),
          target VARCHAR(255),
          relation_type VARCHAR(50),
          evidence_snippet TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `;

    return res.status(200).json({ status: "success", message: "Database schema initialized successfully" });
  } catch (error: any) {
    console.error("DB Init Error:", error);
    return res.status(500).json({ error: "Failed to initialize database", details: error.message });
  }
}
