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
  `);
  console.log('Database tables initialized.');
}

export default db;
