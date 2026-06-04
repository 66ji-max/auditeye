import { neon } from "@neondatabase/serverless";

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }
  return neon(process.env.DATABASE_URL);
};

export const INDUSTRY_DEFAULTS: Record<string, {W1: number, W2: number, W3: number, b: number}> = {
  general: { W1: 2.2, W2: 3.0, W3: 1.2, b: -3.0 },
  ipo: { W1: 2.8, W2: 3.2, W3: 1.0, b: -3.2 },
  financial_investment: { W1: 3.1, W2: 2.4, W3: 1.1, b: -3.0 },
  real_estate_construction: { W1: 2.2, W2: 3.6, W3: 1.8, b: -3.3 },
  manufacturing_supply_chain: { W1: 2.4, W2: 3.1, W3: 1.2, b: -3.1 },
  energy_subsidy: { W1: 1.9, W2: 2.6, W3: 2.2, b: -3.0 },
};

export async function ensureModelWeightsTable(): Promise<boolean> {
  if (!process.env.DATABASE_URL) return false;
  const sql = getSql();
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS industry_model_weights (
        id BIGSERIAL PRIMARY KEY,
        industry_type TEXT NOT NULL DEFAULT 'general',
        project_type TEXT DEFAULT 'general',
        method TEXT NOT NULL DEFAULT 'logistic',
        W1 DOUBLE PRECISION NOT NULL,
        W2 DOUBLE PRECISION NOT NULL,
        W3 DOUBLE PRECISION NOT NULL,
        b DOUBLE PRECISION NOT NULL,
        sample_count INTEGER DEFAULT 0,
        fallback BOOLEAN DEFAULT false,
        training_method TEXT,
        feature_importance JSONB,
        updated_at TIMESTAMPTZ DEFAULT now(),
        UNIQUE(industry_type, project_type)
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS industry_training_samples (
        id BIGSERIAL PRIMARY KEY,
        project_id TEXT,
        industry_type TEXT NOT NULL DEFAULT 'general',
        project_type TEXT,
        label BOOLEAN,
        x1_value DOUBLE PRECISION,
        x2_value DOUBLE PRECISION,
        x3_value DOUBLE PRECISION,
        created_at TIMESTAMPTZ DEFAULT now()
      )
    `;

    return true;
  } catch (err: any) {
    console.error("Failed to ensure industry model weights table:", err.message);
    return false;
  }
}

export async function getIndustryWeights(industryType: string = 'general', projectType?: string) {
  if (!process.env.DATABASE_URL) {
    return { ... (INDUSTRY_DEFAULTS[industryType] || INDUSTRY_DEFAULTS['general']), source: 'default' };
  }
  
  const sql = getSql();
  try {
    if (projectType) {
      const projSpecific = await sql`SELECT * FROM industry_model_weights WHERE industry_type = ${industryType} AND project_type = ${projectType} LIMIT 1`;
      if (projSpecific.length > 0) return { W1: projSpecific[0].w1, W2: projSpecific[0].w2, W3: projSpecific[0].w3, b: projSpecific[0].b, source: 'database' };
    }
    
    const indSpecific = await sql`SELECT * FROM industry_model_weights WHERE industry_type = ${industryType} AND project_type = 'general' LIMIT 1`;
    if (indSpecific.length > 0) return { W1: indSpecific[0].w1, W2: indSpecific[0].w2, W3: indSpecific[0].w3, b: indSpecific[0].b, source: 'database' };

    const general = await sql`SELECT * FROM industry_model_weights WHERE industry_type = 'general' AND project_type = 'general' LIMIT 1`;
    if (general.length > 0) return { W1: general[0].w1, W2: general[0].w2, W3: general[0].w3, b: general[0].b, source: 'database' };

  } catch(e) {}
  
  return { ... (INDUSTRY_DEFAULTS[industryType] || INDUSTRY_DEFAULTS['general']), source: 'default' };
}

export async function saveIndustryWeights(industryType: string, projectType: string, weights: {W1: number, W2: number, W3: number, b: number}, sampleCount: number, trainingMethod: string = 'SGD_LogisticRegression') {
  if (!process.env.DATABASE_URL) return;
  const sql = getSql();
  try {
    await sql`
      INSERT INTO industry_model_weights (
        industry_type, project_type, W1, W2, W3, b, sample_count, training_method, updated_at
      ) VALUES (
        ${industryType}, ${projectType}, ${weights.W1}, ${weights.W2}, ${weights.W3}, ${weights.b}, ${sampleCount}, ${trainingMethod}, now()
      ) ON CONFLICT (industry_type, project_type) DO UPDATE SET
        W1 = EXCLUDED.W1,
        W2 = EXCLUDED.W2,
        W3 = EXCLUDED.W3,
        b = EXCLUDED.b,
        sample_count = EXCLUDED.sample_count,
        training_method = EXCLUDED.training_method,
        updated_at = EXCLUDED.updated_at
    `;
  } catch(e) {
    console.error("Failed to save industry weights:", e);
  }
}

export async function saveIndustryTrainingSamples(samples: Array<{projectId?: string, industryType: string, projectType?: string, label: boolean, x1: number, x2: number, x3: number }>) {
  if (!process.env.DATABASE_URL || samples.length === 0) return;
  const sql = getSql();
  try {
    for (const s of samples) {
      await sql`
        INSERT INTO industry_training_samples (
          project_id, industry_type, project_type, label, x1_value, x2_value, x3_value 
        ) VALUES (
          ${s.projectId || null}, ${s.industryType}, ${s.projectType || 'general'}, ${s.label}, ${s.x1}, ${s.x2}, ${s.x3}
        )
      `;
    }
  } catch(e) {
    console.error("Failed to save industry training samples:", e);
  }
}

export async function getIndustryTrainingSamples(industryType: string, projectType?: string) {
  if (!process.env.DATABASE_URL) return [];
  const sql = getSql();
  try {
    if (projectType) {
      const projSpecific = await sql`SELECT * FROM industry_training_samples WHERE industry_type = ${industryType} AND project_type = ${projectType}`;
      if (projSpecific.length >= 10) return projSpecific; // Require at least some samples to be meaningful
    }
    
    const indSpecific = await sql`SELECT * FROM industry_training_samples WHERE industry_type = ${industryType}`;
    if (indSpecific.length >= 10) return indSpecific;

    return await sql`SELECT * FROM industry_training_samples WHERE industry_type = 'general'`;
  } catch(e) {
    console.error("Failed to load industry training samples:", e);
    return [];
  }
}
