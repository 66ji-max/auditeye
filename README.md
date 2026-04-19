# AuditEye - AI Audit Intelligence Platform

AuditEye is an intelligent audit analysis platform designed for IPO due diligence teams, internal audit teams, and financial risk control scenarios. It acts as an an intelligent layer for navigating corporate networks, detecting anomalies, and anchoring evidence accurately against files and registries.

## Features Added in MVP Version
- **Full-Stack Implementation**: Seamlessly bridges a React-Vite frontend with an Express-SQLite backend.
- **Project & Workspace Management**: Allows intuitive creation of audit investigations with multiple document uploads.
- **Document Text Extraction Engine**: Uses local storage to read and extract text logic from `TXT`, `MD`, `JSON`, `CSV`, `PDF`, `DOCX`, and `XLSX` files via integrated node parsers.
- **Auditing Rule Engine**: A modular logic system applying specific corporate overlapping patterns (address, executive tracing, etc.) mapping directly to dynamic graphs.
- **Interactive SVG D3 Charting**: Relationship logic parses and charts immediately into an explorable link-map highlighting highly suspicious nodes.
- **Automated Reporting**: Generates downloadable single-page Special Audit HTML summaries combining hits and analysis outcomes.

## Environment Requirements
- Node.js >= 18
- Application handles internal storage inherently via local `uploads/` folder routing natively to SQLite.
- (Optional): To use LLM integration externally, verify `GEMINI_API_KEY` mapped inside `/server.ts` or external `.env`.

## Installation & Startup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Start the local server (Frontend & Backend merged):
   \`\`\`bash
   npm run dev
   \`\`\`
   
   The server will start at `http://localhost:3000`.

## How Uploads Work
1. Navigate to the root Dashboard, press **新建项目** (Create Project).
2. Through the modal, drag/drop or select standard office/text files to accompany your project.
3. Upon entering the project **Workspace**, you'll see a localized **项目文件 (Project Files)** panel mapping the document uploads. 
4. The system safely archives them in the local `/uploads/` folder and tracks file metadata safely via the SQLite `documents` table. 
5. Subsequent queries dynamically read through these files using standard parsing libraries, reporting directly via the real-time interaction logs when flags correspond to content keywords!

## Technical Stack
- **Frontend**: React 19, Tailwind CSS v4, Lucide React, D3.js.
- **Backend**: Express, Multer.
- **Database**: `better-sqlite3`.
- **Parsing Engines**: `pdf-parse` (PDF), `mammoth` (Word), `xlsx` (Excel/CSV).
