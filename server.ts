import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import fs from "fs";
import db, { initDB } from "./src/db.ts";
import { AuditEngine } from "./src/services/auditEngine.ts";
import { mockProjects, getMockProjectDetail, mockRules, mockKb } from "./src/lib/mockData.ts";

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    // Handle utf-8 filenames in multer
    const finalName = Date.now() + '-' + Buffer.from(file.originalname, 'latin1').toString('utf8');
    cb(null, finalName);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

// File extensions allowed
const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt'];

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

      const stmt = db.prepare('INSERT INTO projects (name, scenario) VALUES (?, ?)');
      const info = stmt.run(name, scenario || 'IPO审查');
      res.json({ id: info.lastInsertRowid, name, status: "created" });
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

  app.post("/api/projects/:id/documents", upload.array('files'), (req, res) => {
    try {
      const projectId = req.params.id;
      const files = req.files as Express.Multer.File[];
      if (!files || files.length === 0) return res.status(400).json({ error: "No files uploaded" });

      const insertedDocs = [];
      const stmt = db.prepare('INSERT INTO documents (projectId, fileName, originalName, sourceType) VALUES (?, ?, ?, ?)');
      
      for (const file of files) {
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const ext = path.extname(originalName).toLowerCase();
        
        if (!ALLOWED_EXTS.includes(ext)) {
          // Clean up all uploaded invalid files
          files.forEach(f => {
             const fp = path.join(uploadDir, f.filename);
             if (fs.existsSync(fp)) fs.unlinkSync(fp);
          });
          return res.status(400).json({ error: `Unsupported file type: ${ext}. Only PDF, Word, and TXT are allowed.` });
        }

        if (!DEMO_MODE) {
           const info = stmt.run(projectId, file.filename, originalName, ext);
           insertedDocs.push({ id: info.lastInsertRowid, originalName, fileName: file.filename });
        } else {
           insertedDocs.push({ id: Date.now(), originalName, fileName: file.filename });
        }
      }

      res.json({ status: "success", documents: insertedDocs });
    } catch (e: any) {
      console.error("Upload error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/documents/:id", (req, res) => {
    try {
      if (!DEMO_MODE) {
        const doc: any = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
        if (!doc) return res.status(404).json({ error: "Document not found" });

        const filePath = path.join(uploadDir, doc.fileName);
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }

        db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
      }
      res.json({ status: "success" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    if (DEMO_MODE) {
      const detail = getMockProjectDetail(req.params.id);
      if (!detail) return res.status(404).json({ error: "Project not found" });
      return res.json(detail);
    }

    try {
      const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
      if (!project) return res.status(404).json({ error: "Not found" });
      
      const documents = db.prepare('SELECT * FROM documents WHERE projectId = ?').all(req.params.id);
      const audit_logs = db.prepare('SELECT * FROM audit_logs WHERE projectId = ? ORDER BY createdAt ASC').all(req.params.id);
      
      const entities = db.prepare('SELECT * FROM entities WHERE projectId = ?').all(req.params.id);
      const relationships = db.prepare('SELECT * FROM relationships WHERE projectId = ?').all(req.params.id);
      
      res.json({ project, documents, audit_logs, entities, relationships });
    } catch (e: any) {
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

  // Vite middleware for development
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
