import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.resolve(process.cwd(), 'audit.sqlite');

let db: Database.Database;

try {
  db = new Database(dbPath);
  db.pragma('journal_mode = WAL');
  console.log('Connected to SQLite database.');
} catch (err) {
  console.error('Failed to open database:', err);
  process.exit(1);
}

// Initialize tables
export function initDB() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS projects (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      scenario TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      riskScore INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER,
      fileName TEXT,
      originalName TEXT,
      sourceType TEXT,
      uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(projectId) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS entities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER,
      entityType TEXT,
      name TEXT NOT NULL,
      normalizedName TEXT,
      attributes JSON,
      FOREIGN KEY(projectId) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS relationships (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER,
      sourceId INTEGER,
      targetId INTEGER,
      relationType TEXT,
      evidenceSnippet TEXT,
      sourceDocId INTEGER,
      FOREIGN KEY(projectId) REFERENCES projects(id),
      FOREIGN KEY(sourceId) REFERENCES entities(id),
      FOREIGN KEY(targetId) REFERENCES entities(id)
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      projectId INTEGER,
      action TEXT,
      details JSON,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(projectId) REFERENCES projects(id)
    );

    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      weight INTEGER DEFAULT 0,
      status TEXT DEFAULT 'enabled',
      updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      owner TEXT DEFAULT 'System'
    );

    CREATE TABLE IF NOT EXISTS kb_documents (
      id TEXT PRIMARY KEY,
      name TEXT,
      status TEXT,
      chunks INTEGER,
      entities INTEGER,
      type TEXT,
      date DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  const ruleCount = db.prepare('SELECT COUNT(*) as c FROM rules').get() as { c: number };
  if (ruleCount.c === 0) {
    const insertRule = db.prepare('INSERT INTO rules (id, name, category, weight, status, owner) VALUES (?, ?, ?, ?, ?, ?)');
    insertRule.run('R-ADDR-01', '地址异常重合', '关联关系风险', 35, 'enabled', 'System');
    insertRule.run('R-EXEC-02', '高管履历交叉', '关联关系风险', 20, 'enabled', 'System');
    insertRule.run('R-FIN-01', '存贷双高模型', '财务异常风险', 40, 'enabled', 'Risk Dept');
    insertRule.run('R-FIN-02', '毛利率显著背离', '财务异常风险', 30, 'enabled', 'Risk Dept');
    insertRule.run('R-BEH-01', '频繁更换事务所', '行为异动风险', 25, 'disabled', 'Compliance');
    insertRule.run('R-BEH-02', '上市前夕突击分红', '行为异动风险', 45, 'enabled', 'Compliance');
    insertRule.run('R-DOC-01', '文件关键字预警', '文档异常规则', 15, 'enabled', 'System');
  }

  const kbCount = db.prepare('SELECT COUNT(*) as c FROM kb_documents').get() as { c: number };
  if (kbCount.c === 0) {
    const insertKb = db.prepare('INSERT INTO kb_documents (id, name, status, chunks, entities, type, date) VALUES (?, ?, ?, ?, ?, ?, ?)');
    insertKb.run('DOC-1029', 'A公司 2025 年度审计报告.pdf', '解析完成', 145, 32, '财务文书', '2026-04-18');
    insertKb.run('DOC-1030', '供应商采购协议-B公司.docx', '解析完成', 42, 8, '业务合同', '2026-04-18');
    insertKb.run('DOC-1031', '高管名册及履历表.xlsx', '解析完成', 86, 54, '人事档案', '2026-04-17');
    insertKb.run('DOC-1032', '尽职调查初步问卷.md', '解析中...', 0, 0, '工作底稿', '2026-04-19');
  }

  console.log('Database tables initialized.');
}

export default db;
