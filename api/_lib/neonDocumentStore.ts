import { neon } from "@neondatabase/serverless";

export function hasDocumentDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }
  return neon(process.env.DATABASE_URL);
};

export async function ensureDocumentTables(): Promise<boolean> {
  if (!hasDocumentDatabase()) {
    console.warn("Neon DATABASE_URL not configured. Using memory/local fallback for documents.");
    return false;
  }
  
  const sql = getSql();
  
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS audit_documents (
        id BIGSERIAL PRIMARY KEY,
        project_id TEXT NOT NULL,
        original_name TEXT NOT NULL,
        stored_name TEXT,
        source_type TEXT,
        content_type TEXT,
        size_bytes BIGINT DEFAULT 0,
        blob_url TEXT NOT NULL,
        blob_pathname TEXT,
        upload_status TEXT DEFAULT 'uploaded',
        parse_status TEXT DEFAULT 'pending',
        extracted_text TEXT,
        text_length INTEGER DEFAULT 0,
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_audit_documents_project_id
      ON audit_documents(project_id);
    `;
    return true;
  } catch (err: any) {
    console.warn("Failed to ensure document tables:", err.message);
    return false;
  }
}

export async function saveDocumentMetadata(input: any): Promise<any> {
  if (!hasDocumentDatabase()) return null;
  const sql = getSql();
  try {
    const rows = await sql`
      INSERT INTO audit_documents (
        project_id, original_name, stored_name, source_type, content_type,
        size_bytes, blob_url, blob_pathname, upload_status, parse_status,
        extracted_text, text_length
      ) VALUES (
        ${input.projectId}, ${input.originalName}, ${input.storedName}, ${input.sourceType}, ${input.contentType},
        ${input.sizeBytes}, ${input.blobUrl}, ${input.blobPathname}, ${input.uploadStatus}, ${input.parseStatus},
        ${input.extractedText}, ${input.extractedText ? input.extractedText.length : 0}
      )
      RETURNING *;
    `;
    return rows[0];
  } catch (err: any) {
    console.error("Failed to save document metadata:", err.message);
    return null;
  }
}

export async function listProjectDocuments(projectId: string): Promise<any[]> {
  if (!hasDocumentDatabase()) return [];
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT * FROM audit_documents
      WHERE project_id = ${projectId}
      ORDER BY created_at DESC
    `;
    return rows.map((row: any) => ({
      id: row.id,
      projectId: row.project_id,
      originalName: row.original_name,
      fileName: row.stored_name,
      sourceType: row.source_type,
      sizeBytes: row.size_bytes,
      sizeText: (row.size_bytes / 1024).toFixed(2) + ' KB',
      blobUrl: row.blob_url,
      blobPathname: row.blob_pathname,
      status: row.upload_status,
      parseStatus: row.parse_status,
      uploadedAt: row.created_at,
      extractedText: row.extracted_text
    }));
  } catch (err: any) {
    console.error("Failed to list project documents:", err.message);
    return [];
  }
}

export async function getDocumentById(id: string | number): Promise<any | null> {
  if (!hasDocumentDatabase()) return null;
  const sql = getSql();
  try {
    const rows = await sql`
      SELECT * FROM audit_documents WHERE id = ${id} LIMIT 1
    `;
    if (rows.length === 0) return null;
    const row = rows[0];
    return {
      id: row.id,
      projectId: row.project_id,
      originalName: row.original_name,
      fileName: row.stored_name,
      sourceType: row.source_type,
      sizeBytes: row.size_bytes,
      sizeText: (row.size_bytes / 1024).toFixed(2) + ' KB',
      blobUrl: row.blob_url,
      blobPathname: row.blob_pathname,
      status: row.upload_status,
      parseStatus: row.parse_status,
      uploadedAt: row.created_at,
      extractedText: row.extracted_text
    };
  } catch (err: any) {
    console.error("Failed to get document by id:", err.message);
    return null;
  }
}

export async function deleteDocumentMetadata(id: string | number): Promise<boolean> {
  if (!hasDocumentDatabase()) return false;
  const sql = getSql();
  try {
    await sql`
      DELETE FROM audit_documents WHERE id = ${id}
    `;
    return true;
  } catch (err: any) {
    console.error("Failed to delete document metadata:", err.message);
    return false;
  }
}

export async function updateDocumentExtractedText(id: string | number, extractedText: string, parseStatus: string): Promise<boolean> {
  if (!hasDocumentDatabase()) return false;
  const sql = getSql();
  try {
    await sql`
      UPDATE audit_documents
      SET extracted_text = ${extractedText},
          text_length = ${extractedText ? extractedText.length : 0},
          parse_status = ${parseStatus},
          updated_at = now()
      WHERE id = ${id}
    `;
    return true;
  } catch (err: any) {
    console.error("Failed to update document extracted text:", err.message);
    return false;
  }
}
