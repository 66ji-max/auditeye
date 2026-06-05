import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import fs from "fs";
import db, { initDB } from "./src/db.ts";
import { AuditEngine } from "./src/services/auditEngine.ts";
import { getMockProjects, getMockProjectDetail, mockRules, mockKb } from "./src/lib/mockData.ts";

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
  app.get("/api/version", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    res.json({
      buildTime: "2026-06-04 risk-score-v4",
      source: "auditeye-server",
      riskScorePatch: "unified-risk-score-v3",
      mode: DEMO_MODE ? "demo" : "prod"
    });
  });

  app.get("/api/debug/risk-scores", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    res.setHeader("Surrogate-Control", "no-store");
    const projs = getMockProjects();
    const results = [1001, 1002, 1003, 1004].map(id => {
      const listProj = projs.find(p => p.id.toString() === id.toString());
      const name = listProj ? listProj.name : '';
      const listScore = listProj ? listProj.riskScore : null;
      
      const detail = getMockProjectDetail(String(id));
      const detailProjectScore = detail ? detail.project.riskScore : null;
      const detailRiskScoringScore = detail?.riskScoring ? detail.riskScoring.probabilityPercent : null;
      
      const consistent = listScore === detailProjectScore && detailProjectScore === detailRiskScoringScore;
      
      return {
        id,
        name,
        listScore,
        detailProjectScore,
        detailRiskScoringScore,
        consistent
      };
    });
    res.json(results);
  });

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
      const projects = getMockProjects().map((p:any) => ({
        ...p,
        riskScore: Math.round(Number(p.riskScore ?? 0))
      }));

      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      res.setHeader("Surrogate-Control", "no-store");
      return res.json(projects);
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
  const { ensureModelWeightsTable } = await import("./api/_lib/neonModelsStore.ts");
  await ensureModelWeightsTable();
  const { ensureAuditRulesTable } = await import("./api/_lib/neonRulesStore.ts");
  await ensureAuditRulesTable();


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
        const finalScore = Math.round(Number(
          mockData?.riskScoring?.probabilityPercent ??
          mockData?.project?.riskScore ??
          0
        ));

        mockData.project.riskScore = finalScore;

        if (mockData.riskScoring) {
          mockData.riskScoring.probabilityPercent = finalScore;
        }

        res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
        res.setHeader("Pragma", "no-cache");
        res.setHeader("Expires", "0");
        res.setHeader("Surrogate-Control", "no-store");

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
  const { ensureModelWeightsTable } = await import("./api/_lib/neonModelsStore.ts");
  await ensureModelWeightsTable();
  const { ensureAuditRulesTable } = await import("./api/_lib/neonRulesStore.ts");
  await ensureAuditRulesTable();

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

  app.get("/api/rules", (req, res, next) => {
    // Pass to neonRulesStore handler below
    next();
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
  
  
  app.get("/api/rules", async (req, res) => {
    try {
      const { getAuditRules } = await import("./api/_lib/neonRulesStore.js");
      const industryType = req.query.industryType as string | undefined;
      const status = req.query.status as string | undefined;
      const rules = await getAuditRules(industryType, status);
      if (rules) {
        return res.json(rules);
      }
      return res.status(500).json({error: 'Failed to fetch rules'});
    } catch(e) {
      res.status(500).json({error: e.message});
    }
  });

  app.post("/api/rules", async (req, res) => {
    if (!req.headers['x-admin-mode'] && req.headers['x-role'] !== 'admin') {
      return res.status(403).json({error: 'Permission denied. Admins only.'});
    }
    try {
      const { createAuditRule } = await import("./api/_lib/neonRulesStore.js");
      const success = await createAuditRule(req.body);
      res.json({success});
    } catch(e) {
      res.status(500).json({error: e.message});
    }
  });

  app.put("/api/rules/:id", async (req, res) => {
    if (!req.headers['x-admin-mode'] && req.headers['x-role'] !== 'admin') {
      return res.status(403).json({error: 'Permission denied. Admins only.'});
    }
    try {
      const { updateAuditRule } = await import("./api/_lib/neonRulesStore.js");
      const success = await updateAuditRule(req.params.id, req.body);
      res.json({success});
    } catch(e) {
      res.status(500).json({error: e.message});
    }
  });

  app.delete("/api/rules/:id", async (req, res) => {
    if (!req.headers['x-admin-mode'] && req.headers['x-role'] !== 'admin') {
      return res.status(403).json({error: 'Permission denied. Admins only.'});
    }
    try {
      const { deleteAuditRule } = await import("./api/_lib/neonRulesStore.js");
      const success = await deleteAuditRule(req.params.id);
      res.json({success});
    } catch(e) {
      res.status(500).json({error: e.message});
    }
  });

  app.get("/api/rules-status", async (req, res) => {
      res.json({ databaseConfigured: !!process.env.DATABASE_URL, rulesTableReady: true });
  });

  // ML API Routes

  app.get("/api/ml/industry-weights", async (req, res) => {
    try {
      const { INDUSTRY_TYPES, DEFAULT_INDUSTRY_WEIGHTS } = await import("./src/config/industryWeights.js");
      res.json({
        categories: INDUSTRY_TYPES,
        defaults: DEFAULT_INDUSTRY_WEIGHTS
      });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/ml/industry-weights/:industryType", async (req, res) => {
    try {
      const { getIndustryWeights } = await import("./api/_lib/neonModelsStore.js");
      const industryType = req.params.industryType || 'general';
      const result = await getIndustryWeights(industryType);
      
      const { INDUSTRY_TYPES } = await import("./src/config/industryWeights.js");
      const name = INDUSTRY_TYPES[industryType]?.label || "通用审计模型";
      
      res.json({
        industryType,
        industryName: name,
        weights: { W1: result.W1, W2: result.W2, W3: result.W3, b: result.b },
        source: result.source,
        rationale: result.rationale
      });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  });

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

  
  app.get("/api/ml/industry-weight-debug", async (req, res) => {
    try {
       const { demoProjectDetailsMap } = await import("./src/lib/mockData.js");
       const result = [];
       for (const key of Object.keys(demoProjectDetailsMap)) {
          const detail = demoProjectDetailsMap[key];
          const rs = detail.riskScoring || {};
          result.push({
             id: detail.project?.id || key,
             name: detail.project?.name || '',
             industryType: rs.industryType || 'general',
             industryName: rs.industryName || '默认',
             W1: rs.globalWeights?.W1,
             W2: rs.globalWeights?.W2,
             W3: rs.globalWeights?.W3,
             b: rs.globalWeights?.b,
             probabilityPercent: rs.probabilityPercent || 0,
             source: rs.weightSource
          });
       }
       res.json(result);
    } catch(e) {
       res.status(500).json({ error: e.message });
    }
  });

app.post("/api/ml/train-weights", async (req, res) => {
    try {
      const isAdmin = req.cookies?.admin_session === 'authenticated' || req.headers['x-admin-mode'] === 'true' || req.headers['x-role'] === 'admin';
      if (!isAdmin) {
        return res.status(403).json({ error: "暂无权限，请切换管理员模式。" });
      }

      const { industryType = "general", projectType = "general", samples = [], method = "logistic" } = req.body || {};
      
      const { getIndustryWeights, saveIndustryWeights, saveIndustryTrainingSamples, getIndustryTrainingSamples } = await import("./api/_lib/neonModelsStore.js");
      const { DEFAULT_INDUSTRY_WEIGHTS } = await import("./src/config/industryWeights.js");
      
      await saveIndustryTrainingSamples(samples.map((s) => ({
        ...s,
        industryType,
        projectType,
        x1: s.X1 ?? s.x1 ?? 0,
        x2: s.X2 ?? s.x2 ?? 0,
        x3: s.X3 ?? s.x3 ?? 0,
      })));
      
      const allSamples = await getIndustryTrainingSamples(industryType, projectType);
      const usedSamples = allSamples.length >= 10 ? allSamples : samples;
      const sampleCount = usedSamples.length;
      
      const { basicNeuralWeightTraining } = await import("./api/_lib/basicNeuralWeightTraining.js");
      
      const defaultWeights = DEFAULT_INDUSTRY_WEIGHTS[industryType] || DEFAULT_INDUSTRY_WEIGHTS['general'];
      
      const trainSamples = usedSamples.map((s) => ({
        X1: s.x1_value ?? s.X1 ?? s.x1, X2: s.x2_value ?? s.X2 ?? s.x2, X3: s.x3_value ?? s.X3 ?? s.x3, label: s.label
      }));
      
      const trained = basicNeuralWeightTraining(trainSamples, {W1: defaultWeights.W1, W2: defaultWeights.W2, W3: defaultWeights.W3, b: defaultWeights.b});
      
      let finalWeights = { ...defaultWeights };
      let alpha = 0;
      let learnedWeights = trained.derivedCategoryWeights;
      
      if (!trained.fallback) {
         alpha = Math.min(0.9, sampleCount / (sampleCount + 30));
         finalWeights = {
           W1: alpha * learnedWeights.W1 + (1 - alpha) * defaultWeights.W1,
           W2: alpha * learnedWeights.W2 + (1 - alpha) * defaultWeights.W2,
           W3: alpha * learnedWeights.W3 + (1 - alpha) * defaultWeights.W3,
           b: alpha * learnedWeights.b + (1 - alpha) * defaultWeights.b,
           rationale: defaultWeights.rationale
         };
         await saveIndustryWeights(industryType, projectType, finalWeights, sampleCount, trained.trainingMethod, alpha, defaultWeights, learnedWeights);
      }
      
      res.status(200).json({
          industryType,
          projectType,
          method,
          usedIndustrySamples: trainSamples.length,
          totalIndustrySamples: allSamples.length,
          totalProjectSamples: allSamples.length,
          sampleCount,
          alpha,
          defaultWeights: { W1: defaultWeights.W1, W2: defaultWeights.W2, W3: defaultWeights.W3, b: defaultWeights.b },
          learnedWeights,
          finalWeights,
          weights: finalWeights,
          source: "blended_learning",
          persisted: !trained.fallback,
          message: "Industry-specific training completed"
      });
    } catch (e) {
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
