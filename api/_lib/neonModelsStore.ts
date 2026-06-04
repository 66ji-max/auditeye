import { neon } from "@neondatabase/serverless";

const getSql = () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }
  return neon(process.env.DATABASE_URL);
};

import { DEFAULT_INDUSTRY_WEIGHTS } from '../../src/config/industryWeights.js';

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
        alpha DOUBLE PRECISION DEFAULT 0,
        default_weights JSONB,
        learned_weights JSONB,
        final_weights JSONB,
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
  const getRationale = (ind: string) => DEFAULT_INDUSTRY_WEIGHTS[ind]?.rationale || DEFAULT_INDUSTRY_WEIGHTS['general'].rationale;
  if (!process.env.DATABASE_URL) {
    return { ... (DEFAULT_INDUSTRY_WEIGHTS[industryType] || DEFAULT_INDUSTRY_WEIGHTS['general']), source: 'default_industry', rationale: getRationale(industryType) };
  }
  
  const sql = getSql();
  try {
    if (projectType) {
      const projSpecific = await sql`SELECT * FROM industry_model_weights WHERE industry_type = ${industryType} AND project_type = ${projectType} LIMIT 1`;
      if (projSpecific.length > 0) return { W1: projSpecific[0].w1, W2: projSpecific[0].w2, W3: projSpecific[0].w3, b: projSpecific[0].b, source: projSpecific[0].learned_weights ? 'blended_learning' : 'learned_project', rationale: getRationale(industryType) };
    }
    
    const indSpecific = await sql`SELECT * FROM industry_model_weights WHERE industry_type = ${industryType} AND project_type = 'general' LIMIT 1`;
    if (indSpecific.length > 0) return { W1: indSpecific[0].w1, W2: indSpecific[0].w2, W3: indSpecific[0].w3, b: indSpecific[0].b, source: indSpecific[0].learned_weights ? 'blended_learning' : 'learned_industry', rationale: getRationale(industryType) };

    const general = await sql`SELECT * FROM industry_model_weights WHERE industry_type = 'general' AND project_type = 'general' LIMIT 1`;
    if (general.length > 0) return { W1: general[0].w1, W2: general[0].w2, W3: general[0].w3, b: general[0].b, source: 'blended_learning', rationale: getRationale('general') };

  } catch(e) {}
  
  return { ... (DEFAULT_INDUSTRY_WEIGHTS[industryType] || DEFAULT_INDUSTRY_WEIGHTS['general']), source: industryType === 'general' ? 'default_general' : 'default_industry', rationale: getRationale(industryType) };
}


export async function saveIndustryWeights(
  industryType: string, 
  projectType: string, 
  finalWeights: {W1: number, W2: number, W3: number, b: number}, 
  sampleCount: number, 
  trainingMethod: string = 'SGD_LogisticRegression',
  alpha: number = 0,
  defaultWeights: any = {},
  learnedWeights: any = {}
) {
  if (!process.env.DATABASE_URL) return;
  const sql = getSql();
  try {
    await sql`
      INSERT INTO industry_model_weights (
        industry_type, project_type, W1, W2, W3, b, sample_count, training_method, updated_at,
        alpha, default_weights, learned_weights, final_weights
      ) VALUES (
        ${industryType}, ${projectType}, ${finalWeights.W1}, ${finalWeights.W2}, ${finalWeights.W3}, ${finalWeights.b}, ${sampleCount}, ${trainingMethod}, now(),
        ${alpha}, ${JSON.stringify(defaultWeights)}, ${JSON.stringify(learnedWeights)}, ${JSON.stringify(finalWeights)}
      ) ON CONFLICT (industry_type, project_type) DO UPDATE SET
        W1 = EXCLUDED.W1,
        W2 = EXCLUDED.W2,
        W3 = EXCLUDED.W3,
        b = EXCLUDED.b,
        sample_count = EXCLUDED.sample_count,
        training_method = EXCLUDED.training_method,
        alpha = EXCLUDED.alpha,
        default_weights = EXCLUDED.default_weights,
        learned_weights = EXCLUDED.learned_weights,
        final_weights = EXCLUDED.final_weights,
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
