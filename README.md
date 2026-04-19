# AuditEye - AI Audit Intelligence Platform

AuditEye is an intelligent audit analysis platform designed for IPO due diligence teams, internal audit teams, and financial risk control scenarios. It acts as an intelligent layer for navigating corporate networks, detecting anomalies, and anchoring evidence accurately against files and registries.

## Features Added in MVP Version
- **Full-Stack Implementation**: Seamlessly bridges a React-Vite frontend with an Express-SQLite backend.
- **Provider LLM Architecture**: Includes intelligent fallback model proxy logic, configurable to OpenAI-compliant architectures.
- **Project & Workspace Management**: Allows intuitive creation of audit investigations with multiple document uploads.
- **Document Text Extraction Engine**: Uses local storage to read and extract text logic from `TXT`, `MD`, `JSON`, `CSV`, `PDF`, `DOCX`, and `XLSX` files via integrated node parsers.
- **Auditing Rule Engine**: A modular logic system applying specific corporate overlapping patterns (address, executive tracing, etc.) mapping directly to dynamic graphs.
- **Interactive SVG D3 Charting**: Relationship logic parses and charts immediately into an explorable link-map highlighting highly suspicious nodes.
- **Automated Reporting**: Generates downloadable single-page Special Audit HTML summaries combining hits and analysis outcomes.

## Environment Requirements
Create a `.env` file based on `.env.example` in the root of the project to set up your LLM:
```env
AUDITEYE_LLM_API_KEY="your_api_key_here"
AUDITEYE_LLM_BASE_URL="https://max.openai365.top/v1"
AUDITEYE_PRIMARY_MODEL="gemini-2.5-pro"
AUDITEYE_FALLBACK_MODELS="gemini-3.1-pro-preview,gemini-3.1-pro-preview-maxthinking,gemini-3-pro-preview-thinking,claude-opus-4-6"
```

## Installation & Startup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local server (Frontend & Backend merged):
   ```bash
   npm run dev
   ```
   
   The server will start at `http://localhost:3000`.

## Technical Stack
- **Frontend**: React 19, Tailwind CSS v4, Lucide React, D3.js.
- **Backend**: Express, Multer, OpenAI-compatible proxy interface.
- **Database**: `better-sqlite3`.
- **Parsing Engines**: `pdf-parse` (PDF), `mammoth` (Word), `xlsx` (Excel/CSV).
