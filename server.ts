import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import db, { initDB } from "./src/db.ts";
import { AuditEngine } from "./src/services/auditEngine.ts";

const upload = multer({ dest: 'uploads/' });

async function startServer() {
  initDB();

  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Projects API
  app.post("/api/projects", (req, res) => {
    try {
      const { name, scenario } = req.body;
      const stmt = db.prepare('INSERT INTO projects (name, scenario) VALUES (?, ?)');
      const info = stmt.run(name, scenario || 'IPO Due Diligence');
      res.json({ id: info.lastInsertRowid, name, status: "created" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
  
  app.get("/api/projects", (req, res) => {
    try {
      const projects = db.prepare('SELECT * FROM projects ORDER BY createdAt DESC').all();
      res.json(projects);
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/projects/:id", (req, res) => {
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
      const result = await engine.runAnalysis(targetCompany);

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
