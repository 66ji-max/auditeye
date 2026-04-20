import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import multer from "multer";
import fs from "fs";
import db, { initDB } from "./src/db.ts";
import { AuditEngine } from "./src/services/auditEngine.ts";

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

async function startServer() {
  initDB();

  const app = express();
  const PORT = process.env.PORT || 3000;

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
  
  const DEMO_MODE = true; // Temporary flag for taking screenshots

  app.get("/api/projects", (req, res) => {
    if (DEMO_MODE) {
      return res.json([
        { id: 1001, name: "星巴达（大连）企业重组审查项目", scenario: "深度欺诈审查", riskScore: 92, docCount: 14, createdAt: new Date().toISOString() },
        { id: 1002, name: "绿能科技IPO主体资金流穿透", scenario: "IPO审查", riskScore: 45, docCount: 32, createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: 1003, name: "鼎信资本年度审计关联方排查", scenario: "年度审计异常追踪", riskScore: 12, docCount: 8, createdAt: new Date(Date.now() - 86400000 * 3).toISOString() },
        { id: 1004, name: "华泰置业烂尾楼资金抽逃协查", scenario: "内部反欺诈审查", riskScore: 99, docCount: 105, createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
      ]);
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
        // Decode filename one more time in case of deep ascii issues, or rely on our storage config
        const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
        const ext = path.extname(originalName).toLowerCase();
        const info = stmt.run(projectId, file.filename, originalName, ext);
        insertedDocs.push({ id: info.lastInsertRowid, originalName, fileName: file.filename });
      }

      res.json({ status: "success", documents: insertedDocs });
    } catch (e: any) {
      console.error("Upload error:", e);
      res.status(500).json({ error: e.message });
    }
  });

  app.delete("/api/documents/:id", (req, res) => {
    try {
      const doc: any = db.prepare('SELECT * FROM documents WHERE id = ?').get(req.params.id);
      if (!doc) return res.status(404).json({ error: "Document not found" });

      const filePath = path.join(uploadDir, doc.fileName);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      db.prepare('DELETE FROM documents WHERE id = ?').run(req.params.id);
      res.json({ status: "success" });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  app.get("/api/projects/:id", (req, res) => {
    if (DEMO_MODE) {
      return res.json({
        project: { id: req.params.id, name: "星巴达（大连）企业重组审查项目", scenario: "深度欺诈审查", riskScore: 92, createdAt: new Date().toISOString() },
        documents: [
          { id: 1, fileName: 'bank_statement.pdf', originalName: '1-星巴达2024对公流水.pdf', sourceType: '.pdf' },
          { id: 2, fileName: 'contract.pdf', originalName: '补充借款协议（密）.pdf', sourceType: '.pdf' },
          { id: 3, fileName: 'board.pdf', originalName: '2023年度董事会决议.docx', sourceType: '.docx' }
        ],
        audit_logs: [
          { action: 'INFO', createdAt: new Date(Date.now() - 300000).toISOString(), details: JSON.stringify({ message: '成功连接至全国企业信用信息公示系统进行实名校验。' }) },
          { action: 'INFO', createdAt: new Date(Date.now() - 280000).toISOString(), details: JSON.stringify({ message: '解析 14 份非结构化文书，共切分得到 402 个独立语块。' }) },
          { action: 'INFO', createdAt: new Date(Date.now() - 250000).toISOString(), details: JSON.stringify({ message: '利用图计算发现隐藏 4 层网络嵌套的实际控制人体系。' }) },
          { action: 'RED_FLAG', createdAt: new Date(Date.now() - 100000).toISOString(), details: JSON.stringify({ ruleName: '隐藏高管交叉控股 (R-MGMT-02)', ruleId: 'R-MGMT-02', scoreImpact: 35, description: '检测到目标企业【星巴达】的边缘小微供应商【大连海润实业】其实际受益人为星巴达副总裁李某，涉嫌违规体外循环输送利益。', severity: 'high'}) },
          { action: 'RED_FLAG', createdAt: new Date(Date.now() - 90000).toISOString(), details: JSON.stringify({ ruleName: '注册地址重叠 (R-ADDR-01)', ruleId: 'R-ADDR-01', scoreImpact: 20, description: '五家近期发生大规模贸易往来的“壳公司”均集中注册于同一地址（科技硅谷大厦3栋A座401），存在虚假虚开发票嫌疑。', severity: 'high'}) },
          { action: 'RED_FLAG', createdAt: new Date(Date.now() - 80000).toISOString(), details: JSON.stringify({ ruleName: '短期异常资金回流 (R-FUND-09)', ruleId: 'R-FUND-09', scoreImpact: 37, description: '流水记录显示多笔过千万大额资金在72小时内通过第三方通道绕回主体公司账户，典型粉饰报表与虚增营收特征。', severity: 'critical'}) }
        ],
        entities: [
          { type: 'COMPANY', name: '星巴达(大连)科技', attributes: { registeredCapital: '5000万', address: '高新园区科技硅谷大厦1栋' } },
          { type: 'COMPANY', name: '大连海润实业', attributes: { address: '科技硅谷大厦3栋A座401' } },
          { type: 'COMPANY', name: '创通物流', attributes: { address: '科技硅谷大厦3栋A座401' } },
          { type: 'COMPANY', name: '鼎力贸易', attributes: { address: '科技硅谷大厦3栋A座401' } },
          { type: 'COMPANY', name: '瑞博咨询服务', attributes: { address: '科技硅谷大厦3栋A座401' } },
          { type: 'COMPANY', name: '万恒资产', attributes: { address: '科技硅谷大厦3栋A座401' } },
          { type: 'PERSON', name: '李明 (副总裁)', attributes: { role: '执行董事' } },
          { type: 'PERSON', name: '张伟 (CEO)', attributes: { role: '法定代表人' } },
          { type: 'COMPANY', name: '离岸开曼星巴达基金', attributes: { address: 'Cayman Islands' } },
          { type: 'PERSON', name: '王强 (财务总监)', attributes: { role: 'CFO' } },
          { type: 'COMPANY', name: '审计核准第三方', attributes: { address: '北京东城区' } }
        ],
        relationships: [
          { source: '星巴达(大连)科技', target: '张伟 (CEO)', relationType: 'LEGAL_REP', evidenceSnippet: '工商登记信息明确张伟自2021年起担任法定代表人。' },
          { source: '星巴达(大连)科技', target: '王强 (财务总监)', relationType: 'EXECUTIVE', evidenceSnippet: '人事档案与年度财报批露。' },
          { source: '星巴达(大连)科技', target: '李明 (副总裁)', relationType: 'EXECUTIVE', evidenceSnippet: '公司组织架构图第4页所示。' },
          { source: '大连海润实业', target: '李明 (副总裁)', relationType: 'HIGH_RISK_OVERLAP', evidenceSnippet: '海润实业的最终穿透受益人协议指向李某的配偶，形成实质利益共同体。' },
          { source: '创通物流', target: '大连海润实业', relationType: 'FUND_TRANSFER', evidenceSnippet: '对公流水第120页，金额2000万，附言"技术服务费"。' },
          { source: '星巴达(大连)科技', target: '大连海润实业', relationType: 'HIGH_RISK_OVERLAP', evidenceSnippet: '年报显示发生重组期间采购额暴增4000%，触发反舞弊拦截体系。' },
          { source: '鼎力贸易', target: '瑞博咨询服务', relationType: 'ADDRESS_SHARED', evidenceSnippet: '两家公司注册地完全相同，连工位号均一致。' },
          { source: '瑞博咨询服务', target: '万恒资产', relationType: 'ADDRESS_SHARED', evidenceSnippet: '营业执照注册地一致。' },
          { source: '万恒资产', target: '鼎力贸易', relationType: 'ADDRESS_SHARED', evidenceSnippet: '企查查数据反馈为关联聚类地址。' },
          { source: '离岸开曼星巴达基金', target: '张伟 (CEO)', relationType: 'SHAREHOLDER', evidenceSnippet: '红筹架构招股书附件披露持有45%股权。' },
          { source: '星巴达(大连)科技', target: '创通物流', relationType: 'SUSPICIOUS_TRADE', evidenceSnippet: '三方凭证比对无法支持真实的物流发生场景。' }
        ]
      });
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
