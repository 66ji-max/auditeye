import { neon } from "@neondatabase/serverless";

export function hasDatabase(): boolean {
  return !!process.env.DATABASE_URL;
}

const getSql = () => {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is not defined");
    }
    return neon(process.env.DATABASE_URL);
};

export async function ensureTrainingTables(): Promise<boolean> {
  if (!hasDatabase()) {
    console.warn("Neon DATABASE_URL not configured. Using memory fallback for ML training.");
    return false;
  }
  
  const sql = getSql();
  
  try {
      await sql`
        CREATE TABLE IF NOT EXISTS training_samples (
          id BIGSERIAL PRIMARY KEY,
          project_type TEXT NOT NULL,
          method TEXT NOT NULL DEFAULT 'logistic',
          x1a DOUBLE PRECISION DEFAULT 0,
          x1b DOUBLE PRECISION DEFAULT 0,
          x1c DOUBLE PRECISION DEFAULT 0,
          x2a DOUBLE PRECISION DEFAULT 0,
          x2b DOUBLE PRECISION DEFAULT 0,
          x2c DOUBLE PRECISION DEFAULT 0,
          x3a DOUBLE PRECISION DEFAULT 0,
          x3b DOUBLE PRECISION DEFAULT 0,
          x1 DOUBLE PRECISION DEFAULT 0,
          x2 DOUBLE PRECISION DEFAULT 0,
          x3 DOUBLE PRECISION DEFAULT 0,
          label DOUBLE PRECISION NOT NULL,
          raw_sample JSONB,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `;
      
      await sql`
        CREATE TABLE IF NOT EXISTS model_weights (
          project_type TEXT PRIMARY KEY,
          method TEXT NOT NULL,
          W1 DOUBLE PRECISION NOT NULL,
          W2 DOUBLE PRECISION NOT NULL,
          W3 DOUBLE PRECISION NOT NULL,
          b DOUBLE PRECISION NOT NULL,
          sample_count INTEGER DEFAULT 0,
          fallback BOOLEAN DEFAULT false,
          training_method TEXT,
          feature_importance JSONB,
          updated_at TIMESTAMPTZ DEFAULT now()
        );
      `;
      return true;
  } catch (err: any) {
      console.warn("Failed to ensure training tables:", err.message);
      return false;
  }
}

export async function saveTrainingSamples(projectType: string, method: string, samples: any[]): Promise<boolean> {
  if (!hasDatabase() || !samples || samples.length === 0) return false;
  const sql = getSql();
  
  try {
      for (const s of samples) {
          // ignore invalid labels
          if (s.label !== 0 && s.label !== 1) continue;
          
          let X1 = s.X1 ?? ((s.x1a || 0) + (s.x1b || 0) + (s.x1c || 0)) / 3;
          let X2 = s.X2 ?? ((s.x2a || 0) + (s.x2b || 0) + (s.x2c || 0)) / 3;
          let X3 = s.X3 ?? ((s.x3a || 0) + (s.x3b || 0)) / 2;
          
          await sql`
            INSERT INTO training_samples
            (project_type, method, x1a, x1b, x1c, x2a, x2b, x2c, x3a, x3b, x1, x2, x3, label, raw_sample)
            VALUES
            (
                ${projectType}, ${method}, 
                ${s.x1a || 0}, ${s.x1b || 0}, ${s.x1c || 0}, 
                ${s.x2a || 0}, ${s.x2b || 0}, ${s.x2c || 0}, 
                ${s.x3a || 0}, ${s.x3b || 0}, 
                ${X1}, ${X2}, ${X3}, 
                ${s.label}, ${JSON.stringify(s)}::jsonb
            )
          `;
      }
      return true;
  } catch (err: any) {
      console.warn("Failed to save training samples:", err.message);
      return false;
  }
}

export async function loadTrainingSamples(projectType: string): Promise<any[]> {
    if (!hasDatabase()) return [];
    
    const sql = getSql();
    try {
        const rows = await sql`
            SELECT * FROM training_samples
            WHERE project_type = ${projectType}
            ORDER BY id ASC
        `;
        return rows.map((row: any) => row.raw_sample);
    } catch (err: any) {
        console.warn("Failed to load training samples:", err.message);
        return [];
    }
}

export async function saveModelWeights(projectType: string, payload: any): Promise<boolean> {
    if (!hasDatabase()) return false;
    const sql = getSql();
    
    try {
        await sql`
          INSERT INTO model_weights (
              project_type, method, W1, W2, W3, b, sample_count, fallback, training_method, feature_importance, updated_at
          ) VALUES (
              ${projectType}, 
              ${payload.method}, 
              ${payload.weights.W1}, 
              ${payload.weights.W2}, 
              ${payload.weights.W3}, 
              ${payload.weights.b}, 
              ${payload.sampleCount || 0}, 
              ${payload.fallback ? true : false}, 
              ${payload.trainingMethod || ''}, 
              ${payload.featureImportance ? JSON.stringify(payload.featureImportance) : null}::jsonb, 
              now()
          )
          ON CONFLICT (project_type) DO UPDATE SET
              method = EXCLUDED.method,
              W1 = EXCLUDED.W1,
              W2 = EXCLUDED.W2,
              W3 = EXCLUDED.W3,
              b = EXCLUDED.b,
              sample_count = GREATEST(training_sessions.sample_count, EXCLUDED.sample_count),
              fallback = EXCLUDED.fallback,
              training_method = EXCLUDED.training_method,
              feature_importance = EXCLUDED.feature_importance,
              updated_at = EXCLUDED.updated_at
        `;
        return true;
    } catch (err: any) {
        console.warn("Failed to save model weights:", err.message);
        return false;
    }
}

export async function getStoredModelWeights(projectType: string): Promise<any | null> {
    if (!hasDatabase()) return null;
    const sql = getSql();
    try {
        const rows = await sql`
            SELECT * FROM model_weights WHERE project_type = ${projectType}
        `;
        if (rows.length > 0) {
            const row = rows[0];
            return {
                projectType: row.project_type,
                method: row.method,
                weights: {
                    W1: row.w1,
                    W2: row.w2,
                    W3: row.w3,
                    b: row.b
                },
                sampleCount: row.sample_count,
                fallback: row.fallback,
                trainingMethod: row.training_method,
                featureImportance: row.feature_importance
            };
        }
    } catch (err: any) {
        console.warn("Failed to get stored model weights:", err.message);
    }
    return null;
}
