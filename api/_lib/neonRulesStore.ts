import { neon } from "@neondatabase/serverless";

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }
  return neon(process.env.DATABASE_URL);
};

export async function ensureAuditRulesTable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const sql = getSql();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS audit_rules (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        industry_type TEXT DEFAULT 'general',
        dimension TEXT DEFAULT 'identity',
        weight INTEGER NOT NULL DEFAULT 10,
        severity TEXT DEFAULT 'medium',
        status TEXT DEFAULT 'enabled',
        description TEXT,
        condition JSONB,
        created_by TEXT DEFAULT 'admin',
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    // Try to blindly add the column if the table already existed before we updated this code
    try {
      await sql`ALTER TABLE audit_rules ADD COLUMN dimension TEXT DEFAULT 'identity'`;
    } catch(err: any) {
      // Column probably already exists, which is fine
    }

    return true;
  } catch (err: any) {
    console.error("Failed to ensure audit rules table:", err.message);
    return false;
  }
}

export async function getAuditRules(industryType?: string, status?: string) {
  if (!process.env.DATABASE_URL) return null;
  const sql = getSql();
  try {
    let rows;
    if (industryType && status) {
        rows = await sql`SELECT * FROM audit_rules WHERE industry_type = ${industryType} AND status = ${status} ORDER BY created_at DESC`;
    } else if (industryType) {
        rows = await sql`SELECT * FROM audit_rules WHERE industry_type = ${industryType} ORDER BY created_at DESC`;
    } else if (status) {
        rows = await sql`SELECT * FROM audit_rules WHERE status = ${status} ORDER BY created_at DESC`;
    } else {
        rows = await sql`SELECT * FROM audit_rules ORDER BY created_at DESC`;
    }
    
    return rows.map((r: any) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      industryType: r.industry_type,
      dimension: r.dimension,
      weight: r.weight,
      severity: r.severity,
      status: r.status,
      description: r.description,
      condition: r.condition,
      createdBy: r.created_by,
      createdAt: r.created_at,
      updatedAt: r.updated_at
    }));
  } catch(e) {
    console.error("Failed to get audit rules:", e);
    return null; /* fallback needed in calling code */
  }
}

export async function createAuditRule(rule: any) {
  if (!process.env.DATABASE_URL) return false;
  const sql = getSql();
  try {
    await sql`
      INSERT INTO audit_rules (
        id, name, category, industry_type, dimension, weight, severity, status, description, condition, created_by
      ) VALUES (
        ${rule.id}, ${rule.name}, ${rule.category}, ${rule.industryType || 'general'}, ${rule.dimension || 'identity'}, ${rule.weight}, ${rule.severity || 'medium'}, ${rule.status || 'enabled'}, ${rule.description || ''}, ${JSON.stringify(rule.condition || {})}, ${rule.createdBy || 'admin'}
      )
    `;
    return true;
  } catch(e) {
    console.error("Failed to create audit rule:", e);
    return false;
  }
}

export async function updateAuditRule(id: string, rule: any) {
  if (!process.env.DATABASE_URL) return false;
  const sql = getSql();
  try {
    await sql`
      UPDATE audit_rules SET
        name = ${rule.name},
        category = ${rule.category},
        industry_type = ${rule.industryType || 'general'},
        dimension = ${rule.dimension || 'identity'},
        weight = ${rule.weight},
        severity = ${rule.severity || 'medium'},
        status = ${rule.status || 'enabled'},
        description = ${rule.description || ''},
        condition = ${JSON.stringify(rule.condition || {})},
        updated_at = now()
      WHERE id = ${id}
    `;
    return true;
  } catch(e) {
    console.error("Failed to update audit rule:", e);
    return false;
  }
}

export async function deleteAuditRule(id: string) {
  if (!process.env.DATABASE_URL) return false;
  const sql = getSql();
  try {
    await sql`
      UPDATE audit_rules SET status = 'disabled', updated_at = now() WHERE id = ${id}
    `;
    return true;
  } catch(e) {
    console.error("Failed to delete audit rule:", e);
    return false;
  }
}
