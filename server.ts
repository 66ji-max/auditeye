import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import fs from "fs";
import db, { initDB } from "./src/db.ts";
import { AuditEngine } from "./src/services/auditEngine.ts";
import { mockProjects, getMockProjectDetail, mockRules, mockKb } from "./src/lib/mockData.ts";

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// File extensions allowed
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt', '.md', '.json', '.csv', '.xls', '.xlsx'];


async function startServer() {
  initDB();

  const app = express();
  const PORT = process.env.PORT || 3000;
  const DEMO_MODE = true; // Switch for using mock data APIs

  app.use(express.json());

  // API Routes
  app.get("/api/health", async (req, res) => {
    try {
      const { llm } = await import("./src/services/llmProvider.ts");
      const llmStatus = await llm.checkStatus();
      res.json({ status: "ok", llm: llmStatus });
    } catch (e: any) {
      res.json({ status: "ok", llm: { status: "error", message: e.message } });
    }
  });

  // Projects API
  app.post("/api/projects", async (req, res) => {
    try {
      const { name, scenario } = req.body;
      
      if (DEMO_MODE) {
        return res.status(403).json({ error: "Local demo mode. Creates are not supported in local express mock mode. Deploy to vercel." });
      }

      const scene = scenario || 'IPO关联交易核查';
      const { generateInitialRiskProfile } = await import("./api/_lib/initialRiskProfile.ts");
      const initialProfile = generateInitialRiskProfile(scene);

      const stmt = db.prepare('INSERT INTO projects (name, scenario, riskScore, riskLevel, dimensionScores) VALUES (?, ?, ?, ?, ?)');
      const info = stmt.run(name, scene, initialProfile.totalScore, JSON.stringify(initialProfile.level), JSON.stringify(initialProfile.dimensionScores));
      const projectId = info.lastInsertRowid;

      const logStmt = db.prepare('INSERT INTO audit_logs (projectId, action, details) VALUES (?, ?, ?)');
      for (const log of initialProfile.logs) {
        logStmt.run(projectId, log.action, log.details);
      }
      for (const hit of initialProfile.ruleHits) {
         logStmt.run(projectId, 'RED_FLAG', JSON.stringify({ 
           ruleName: hit.ruleName, 
           ruleId: hit.ruleId, 
           dimension: hit.dimension, 
           scoreImpact: hit.scoreImpact, 
           description: hit.description, 
           severity: hit.severity 
         }));
      }

      const entityStmt = db.prepare('INSERT INTO entities (projectId, entityType, name, attributes) VALUES (?, ?, ?, ?)');
      entityStmt.run(projectId, 'COMPANY', name + ' (查验标的)', JSON.stringify({ status: '新建' }));

      res.status(201).json({ id: projectId, name, scenario: scene, status: "created" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/projects", async (req, res) => {
    if (DEMO_MODE) {
      return res.json(mockProjects);
    }
    
    try {
      const projects = db.prepare(`
        SELECT p.*, COUNT(d.id) as docCount 
        FROM projects p 
        LEFT JOIN documents d ON p.id = d.projectId 
        GROUP BY p.id 
        ORDER BY p.createdAt DESC
      `).all();
      res.json(projects);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/projects/:id/documents", upload.array('files'), async (req, res) => {
    try {
      const projectId = req.params.id;
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });

      if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return res.status(500).json({ error: "Vercel Blob is not configured. Missing BLOB_READ_WRITE_TOKEN." });
      }

      const { ensureDocumentTables, saveDocumentMetadata } = await import("./api/_lib/neonDocumentStore.ts");
      const { put, del } = await import("@vercel/blob");
      const { parseDocumentBuffer } = await import("./src/services/documentParser.ts");

      await ensureDocumentTables();

      const insertedDocs = [];
      
      for (const file of files) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const ext = path.extname(originalName).toLowerCase();
        
        if (!ALLOWED_EXTS.includes(ext)) {
          return res.status(400).json({ error: `Unsupported file type: ${ext}.` });
        }

        const safeFileName = originalName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
        const blobPathname = `projects/${projectId}/documents/${Date.now()}-${safeFileName}`;

        const blob = await put(blobPathname, file.buffer, {
          access: "public",
          contentType: file.mimetype || "application/octet-stream",
          addRandomSuffix: true
        });

        let extractedText = "";
        let parseStatus = "parsed";
        try {
          extractedText = await parseDocumentBuffer(file.buffer, originalName);
          if (extractedText.startsWith("[System]")) {
            parseStatus = "failed";
          }
        } catch (err: any) {
          extractedText = "[System] Extraction failed: " + err.message;
          parseStatus = "failed";
        }

        const metadata = await saveDocumentMetadata({
          projectId,
          originalName,
          storedName: safeFileName,
          sourceType: ext,
          contentType: file.mimetype || "application/octet-stream",
          sizeBytes: file.size,
          blobUrl: blob.url,
          blobPathname: blob.pathname || blobPathname,
          uploadStatus: "uploaded",
          parseStatus,
          extractedText
        });
        
        if (!metadata) {
          await del(blob.url);
          throw new Error("Failed to save document metadata in Neon; blob deleted.");
        }

        insertedDocs.push({
          id: metadata.id,
          projectId,
          originalName,
          fileName: metadata.stored_name,
          sourceType: metadata.source_type,
          sizeBytes: metadata.size_bytes,
          sizeText: (metadata.size_bytes / 1024).toFixed(2) + " KB",
          blobUrl: metadata.blob_url,
          blobPathname: metadata.blob_pathname,
          parseStatus: metadata.parse_status,
          uploadedAt: metadata.created_at
        });
      }

      res.json({ status: "success", documents: insertedDocs });
    } catch (e: any) {
      console.error("Upload error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const { getDocumentById, deleteDocumentMetadata } = await import("./api/_lib/neonDocumentStore.ts");
      const { del } = await import("@vercel/blob");

      const docId = req.params.id;
      const doc = await getDocumentById(docId);
      
      if (!doc) {
        return res.status(404).json({ error: "Document not found." });
      }

      if (doc.blobUrl) {
        try {
          await del(doc.blobUrl);
        } catch (e: any) {
          console.warn("Failed to delete blob from Vercel:", e.message);
        }
      }

      await deleteDocumentMetadata(docId);

      // Attempt to also clean up old SQLite just in case (to avoid legacy cruft)
      if (!DEMO_MODE) {
        try {
          db.prepare('DELETE FROM documents WHERE id = ?').run(docId);
        } catch(e) {}
      }

      res.json({ status: "success" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    let mockData = null;
    let fallbackToDb = false;

    if (DEMO_MODE) {
      mockData = getMockProjectDetail(req.params.id);
      if (!mockData) {
         fallbackToDb = true; 
      }
    } else {
      fallbackToDb = true;
    }

    try {
      const { listProjectDocuments } = await import("./api/_lib/neonDocumentStore.ts");
      const neonDocs = await listProjectDocuments(req.params.id);

      if (fallbackToDb) {
        const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
        if (!project) return res.status(404).json({ error: "Not found" });
        
        const sqliteDocs = db.prepare('SELECT * FROM documents WHERE projectId = ?').all(req.params.id);
        const audit_logs = db.prepare('SELECT * FROM audit_logs WHERE projectId = ? ORDER BY createdAt ASC').all(req.params.id);
        const entities = db.prepare('SELECT * FROM entities WHERE projectId = ?').all(req.params.id);
        const relationships = db.prepare('SELECT * FROM relationships WHERE projectId = ?').all(req.params.id);
        
        // Merge sqliteDocs (legacy) with neonDocs
        const allDocs = [...sqliteDocs] as any[];
        neonDocs.forEach((nd) => {
          if (!allDocs.find((d: any) => d.id === nd.id || d.originalName === nd.originalName)) {
             allDocs.push(nd);
          }
        });

        return res.json({ project, documents: allDocs, audit_logs, entities, relationships });
      }

      if (mockData) {
        // Merge neon docs into mockData.documents
        const mergedDocs = [...(mockData.documents || [])] as any[];
        neonDocs.forEach((nd) => {
          if (!mergedDocs.find((d: any) => d.id === nd.id || d.originalName === nd.originalName)) {
             mergedDocs.unshift(nd); 
          }
        });
        mockData.documents = mergedDocs;
        return res.json(mockData);
      }

    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/storage/status", async (req, res) => {
    try {
      const { hasDocumentDatabase, ensureDocumentTables } = await import("./api/_lib/neonDocumentStore.ts");
      let dtReady = false;
      if (hasDocumentDatabase()) {
         dtReady = await ensureDocumentTables();
      }
      res.status(200).json({
        databaseConfigured: hasDocumentDatabase(),
        blobConfigured: !!process.env.BLOB_READ_WRITE_TOKEN,
        documentTablesReady: dtReady,
        message: "Storage status fetched"
      });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/projects/:id/documents", async (req, res) => {
    try {
      const { listProjectDocuments } = await import("./api/_lib/neonDocumentStore.ts");
      const ptr = await listProjectDocuments(req.params.id);
      res.status(200).json({
        projectId: req.params.id,
        count: ptr.length,
        documents: ptr
      });
    } catch(e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/projects/:id/analyze", async (req, res) => {
    try {
      const projectId = req.params.id;
      const { targetCompany } = req.body;

      const engine = new AuditEngine();
      const result = await engine.runAnalysis(targetCompany, projectId);

      // Save overall score
      db.prepare('UPDATE projects SET riskScore = ? WHERE id = ?').run(result.score, projectId);

      // Save Entities
      const insertEntity = db.prepare('INSERT INTO entities (projectId, entityType, name, normalizedName, attributes) VALUES (?, ?, ?, ?, ?)');
      for (const ent of result.combinedEntities) {
        insertEntity.run(projectId, ent.type, ent.name, ent.normalizedName, JSON.stringify(ent.attributes));
      }

      // We might need to map relation source/target to DB IDs, but for prototyping we'll just store names directly as simplified
      const insertRel = db.prepare('INSERT INTO relationships (projectId, sourceId, targetId, relationType, evidenceSnippet) VALUES (?, ?, ?, ?, ?)');
      // For demo, we store names in sourceId/targetId ignoring the foreign constraints (in SQLite we didn't strictly enforce PRAGMA foreign_keys = ON)
      // Actually, my schema has INTEGER foreign keys. I should disable foreign keys or map them.
      // Let's just insert as text and ignore type because SQLite typing is dynamic by default.
      for (const rel of result.combinedRelationships) {
        insertRel.run(projectId, rel.source, rel.target, rel.type, rel.evidence);
      }

      // Save Logs
      const insertLog = db.prepare('INSERT INTO audit_logs (projectId, action, details) VALUES (?, ?, ?)');
      result.logs.forEach(log => insertLog.run(projectId, 'INFO', JSON.stringify({ message: log })));
      result.recommendations.forEach(rec => insertLog.run(projectId, 'RED_FLAG', JSON.stringify(rec)));

      res.json({ status: "success", result });
    } catch (e: any) {
      console.error(e);
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/rules", (req, res) => {
    if (DEMO_MODE) {
      return res.json([
        { id: 'R-ADDR-01', name: '高密聚类注册地址重叠', category: '关联控制', weight: 20, status: 'enabled', updatedAt: '2026-04-10', owner: '审计风控组' },
        { id: 'R-MGMT-02', name: '隐藏高管交叉控股/任职', category: '关联控制', weight: 40, status: 'enabled', updatedAt: '2026-04-12', owner: '审计风控组' },
        { id: 'R-FUND-09', name: '短期异常资金回路 (72h内)', category: '资金洗售', weight: 50, status: 'enabled', updatedAt: '2026-04-15', owner: '资金合规组' },
        { id: 'R-TEND-04', name: '供应商与员工电话/邮箱重叠', category: '舞弊围标', weight: 35, status: 'enabled', updatedAt: '2026-03-22', owner: '采购合规组' },
        { id: 'R-FIN-01', name: '毛利率显著背离行业均值', category: '财务造假', weight: 15, status: 'disabled', updatedAt: '2026-01-05', owner: '数据模型组' }
      ]);
    }
    
    try {
      const rules = db.prepare('SELECT * FROM rules').all();
      res.json(rules);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/kb", (req, res) => {
    if (DEMO_MODE) {
      return res.json([
        { id: 'KB-2026-X1', name: '大连星巴达重组资产评估补充协议.pdf', type: 'PDF', status: '已解析', chunks: 145, entities: 22, date: '2026-04-18' },
        { id: 'KB-2026-X2', name: '2024年供应商尽职调查(海润实业).docx', type: 'Word', status: '已解析', chunks: 89, entities: 15, date: '2026-04-18' },
        { id: 'KB-2026-X3', name: '招行银企直联流水明细 (30天).xlsx', type: 'Excel', status: '提取中...', chunks: '-', entities: '-', date: '2026-04-19' },
        { id: 'KB-2026-X4', name: '高层核心治理人员任免决议汇编.pdf', type: 'PDF', status: '已解析', chunks: 204, entities: 41, date: '2026-04-15' },
        { id: 'KB-2026-X5', name: '往来邮件存档_财务总监部.pst', type: 'Email', status: '排队中', chunks: '-', entities: '-', date: '2026-04-19' },
      ]);
    }

    try {
      const kb = db.prepare('SELECT * FROM kb_documents').all();
      res.json(kb);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // Admin and Auth APIs for local Dev Server (Mirrors Vercel Serverless Functions)
  const cookie = await import('cookie');
  
  app.post("/api/admin/login", (req, res) => {
    const { password } = req.body || {};
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '20050805';
    if (password === ADMIN_PASSWORD) {
      res.setHeader('Set-Cookie', cookie.serialize('admin_session', 'authenticated', {
        httpOnly: true, secure: process.env.NODE_ENV === 'production', maxAge: 86400, path: '/', sameSite: 'lax',
      }));
      res.status(200).json({ success: true, role: 'admin' });
    } else {
      res.status(401).json({ error: '密码错误' });
    }
  });

  app.post("/api/admin/logout", (req, res) => {
    res.setHeader('Set-Cookie', cookie.serialize('admin_session', '', {
      httpOnly: true, secure: process.env.NODE_ENV === 'production', expires: new Date(0), path: '/', sameSite: 'lax',
    }));
    res.status(200).json({ success: true });
  });

  app.get("/api/admin/me", (req, res) => {
    const cookies = cookie.parse(req.headers.cookie || '');
    if (cookies.admin_session === 'authenticated') {
      res.status(200).json({ isAdmin: true, role: 'admin' });
    } else {
      res.status(200).json({ isAdmin: false, role: 'user' });
    }
  });

  app.delete("/api/projects/:id", (req, res) => {
    const cookies = cookie.parse(req.headers.cookie || '');
    if (cookies.admin_session !== 'authenticated') {
      return res.status(403).json({ error: 'Permission denied', errorCode: 'FORBIDDEN' });
    }
    res.status(200).json({ success: true });
  });

  // Vite middleware for development
  
  // ML API Routes
  app.get("/api/ml/db-status", async (req, res) => {
    try {
      const { hasDatabase, ensureTrainingTables, getStoredModelWeights } = await import("./api/_lib/neonTrainingStore.js");
      if (!hasDatabase()) {
        return res.status(200).json({ databaseConfigured: false, tablesReady: false, message: "DATABASE_URL is not defined." });
      }
      
      const tablesReady = await ensureTrainingTables();
      if (!tablesReady) {
        return res.status(200).json({ databaseConfigured: true, tablesReady: false, message: "Neon DB connected but failed to create tables." });
      }
      
      try {
          await getStoredModelWeights("TEST");
          res.status(200).json({ databaseConfigured: true, tablesReady: true, message: "Neon DB connected and tables exist." });
      } catch(e: any) {
          res.status(200).json({ databaseConfigured: true, tablesReady: false, message: e.message });
      }
    } catch(e:any) {
        res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/ml/weights", async (req, res) => {
    try {
      const { getWeightsByProjectType } = await import("./api/_lib/modelWeights.js");
      const { hasDatabase, getStoredModelWeights } = await import("./api/_lib/neonTrainingStore.js");
      const pt = (req.query.projectType as string) || "IPO关联交易核查";
      
      let source = "memory-default";
      if (hasDatabase()) {
          const dbW = await getStoredModelWeights(pt);
          if (dbW) source = "database";
      }
      const weights = await getWeightsByProjectType(pt);
      res.status(200).json({
          projectType: pt,
          source,
          weights
      });
    } catch(e:any) {
        res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/ml/training-samples", async (req, res) => {
      try {
          const { loadTrainingSamples, hasDatabase } = await import("./api/_lib/neonTrainingStore.js");
          const pt = (req.query.projectType as string) || "IPO关联交易核查";
          
          if (!hasDatabase()) {
              return res.status(200).json({ message: "No database configured", count: 0, samples: [] });
          }
          
          const items = await loadTrainingSamples(pt);
          
          res.status(200).json({
              projectType: pt,
              count: items.length,
              samples: items.slice(-20) // last 20
          });
      } catch(e:any) {
          res.status(500).json({ error: e.message });
      }
  });

  app.get("/api/ml/diagnostics", async (req, res) => {
    try {
        let baseUrlHost = null;
        try {
            if (process.env.LLM_BASE_URL) {
                baseUrlHost = new URL(process.env.LLM_BASE_URL).host;
            }
        } catch(e) {}
        res.status(200).json({
            "env": {
                "LLM_API_KEY": !!process.env.LLM_API_KEY,
                "LLM_BASE_URL": !!process.env.LLM_BASE_URL,
                "LLM_MODEL": !!process.env.LLM_MODEL,
                "LLM_FALLBACK_MODEL": !!process.env.LLM_FALLBACK_MODEL,
                "GEMINI_API_KEY": !!process.env.GEMINI_API_KEY,
                "GOOGLE_AI_API_KEY": !!process.env.GOOGLE_AI_API_KEY
            },
            "resolved": {
                "mode": process.env.LLM_BASE_URL ? "openai-compatible" : (process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_API_KEY ? "official-gemini" : "mock-fallback"),
                "model": process.env.LLM_MODEL || "gemini-3.1-pro-preview",
                "fallbackModel": process.env.LLM_FALLBACK_MODEL || "gemini-3-flash-preview",
                "baseUrlHost": baseUrlHost
            }
        });
    } catch (e: any) {
        res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ml/extract", async (req, res) => {
    try {
      const { extractEvidence } = await import("./api/_lib/aiExtraction.js");
      const { projectType = "IPO关联交易核查", documentText = "" } = req.body || {};
      const result = await extractEvidence(projectType, documentText);
      res.status(200).json(result);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ml/train-weights", async (req, res) => {
    try {
      const { trainCategoryWeights } = await import("./api/_lib/weightTraining.js");
      const { saveOrCacheWeights, getWeightsByProjectType } = await import("./api/_lib/modelWeights.js");
      const { ensureTrainingTables, saveTrainingSamples, loadTrainingSamples, hasDatabase } = await import("./api/_lib/neonTrainingStore.js");
      
      const { projectType = "IPO关联交易核查", samples = [], method = "logistic" } = req.body || {};
      
      const tablesReady = await ensureTrainingTables();
      const samplesSaved = await saveTrainingSamples(projectType, method, samples);
      
      const hasDb = hasDatabase() && tablesReady;
      const historicalSamples = await loadTrainingSamples(projectType);
      
      const allSamples = hasDb && historicalSamples.length > 0 ? historicalSamples : samples;
      let finalWeights = await getWeightsByProjectType(projectType);
      
      if (method === "basic-mlp") {
          const { basicNeuralWeightTraining } = await import("./api/_lib/basicNeuralWeightTraining.js");
          const trained = basicNeuralWeightTraining(allSamples, finalWeights);
          
          let weightsSaved = false;
          if (!trained.fallback) {
              finalWeights = trained.derivedCategoryWeights;
              weightsSaved = await saveOrCacheWeights(projectType, finalWeights, {
                  method: "basic-mlp",
                  sampleCount: trained.sampleCount,
                  fallback: false,
                  trainingMethod: trained.trainingMethod,
                  featureImportance: trained.featureImportance
              });
          }
          
          res.status(200).json({
              projectType,
              method: "basic-mlp",
              weights: finalWeights,
              sampleCount: trained.sampleCount,
              fallback: trained.fallback,
              trainingMethod: trained.trainingMethod,
              featureImportance: trained.featureImportance,
              explanation: trained.explanation,
              persisted: weightsSaved || samplesSaved,
              usedHistoricalSamples: hasDb,
              totalTrainingSamples: allSamples.length
          });
      } else {
          const trained = trainCategoryWeights(allSamples, finalWeights);
          
          let weightsSaved = false;
          let sampleCount = allSamples.length;
          if (!trained.fallback) {
              finalWeights = { W1: trained.W1, W2: trained.W2, W3: trained.W3, b: trained.b };
              weightsSaved = await saveOrCacheWeights(projectType, finalWeights, {
                  method: "logistic",
                  sampleCount,
                  fallback: false,
                  trainingMethod: "weak-supervised logistic regression"
              });
          } else {
              sampleCount = allSamples.length < 10 ? allSamples.length : 48; // demo
          }

          res.status(200).json({
              projectType,
              method: "logistic",
              weights: finalWeights,
              sampleCount: sampleCount,
              trainingMethod: "weak-supervised logistic regression",
              fallback: !!trained.fallback,
              persisted: weightsSaved || samplesSaved,
              usedHistoricalSamples: hasDb,
              totalTrainingSamples: allSamples.length
          });
      }
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.post("/api/ml/predict-risk", async (req, res) => {
    try {
      const { getWeightsByProjectType } = await import("./api/_lib/modelWeights.js");
      
      const { projectType = "IPO关联交易核查", X1 = 0, X2 = 0, X3 = 0 } = req.body || {};
      const w = await getWeightsByProjectType(projectType);
      
      const z = w.W1 * X1 + w.W2 * X2 + w.W3 * X3 + w.b;
      const p = 1 / (1 + Math.exp(-z));
      
      res.status(200).json({
          projectType,
          weights: w,
          zValue: parseFloat(z.toFixed(4)),
          probability: parseFloat(p.toFixed(3)),
          probabilityPercent: parseFloat((p * 100).toFixed(1)),
          riskLevel: p > 0.8 ? "极高风险" : (p > 0.5 ? "高风险" : "中低风险")
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    // Fallback for SPA routing
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return; 
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
