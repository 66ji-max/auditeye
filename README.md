# AuditEye - AI Audit Intelligence Platform

AuditEye is an intelligent audit analysis platform designed for IPO due diligence teams, internal audit teams, and financial risk control scenarios. It acts as an intelligent layer for navigating corporate networks, detecting anomalies, and anchoring evidence accurately against files and registries.

## Technical Stack
- **Frontend**: React 19, Tailwind CSS v4, Lucide React, D3.js.
- **Backend (Vercel Serverless)**: Vercel Functions (`/api`), `@vercel/blob`, Neon Serverless Postgres.
- **Database**: Neon Postgres (Serverless DB).
- **Storage**: Vercel Blob (for storing PDF/DOCX/TXT).

## Vercel Deployment & "Full Mode" Configuration

This project is configured for Vercel serverless deployment using **Neon Database** and **Vercel Blob**. 

If you just clone and deploy the project without configuring these services, the system will enter **"Demo Read-Only Mode"**. In demo mode, you can explore the 4 pre-loaded showcase templates, but you cannot create new projects or upload files.

To enable **"Full Mode"**, you must securely persist data. Follow the steps below:

### 1. Database (Neon Postgres)
In your Vercel project dashboard, go to the **Storage** tab and connect a **Neon Postgres** database. This will configure the `DATABASE_URL` environment variable.

After the database is connected, you must initialize the database tables by visiting the following URL in your browser:
```
https://<your-project-url>.vercel.app/api/db/init
```

### 2. File Storage (Vercel Blob)
In your Vercel project, go to the **Storage** tab and create/connect a **Vercel Blob** store. Provide the environment variables automatically. This will supply the `BLOB_READ_WRITE_TOKEN`.

### 3. Verify Health Status
You can visit the health check endpoint to verify your configuration status:
```
https://<your-project-url>.vercel.app/api/health
```
If both `databaseConfigured` and `blobConfigured` are true, and `schemaReady` is true, the system will unlock creation and uploading capabilities.

## Environment Requirements (Local Testing)
Create a `.env` file based on `.env.example` in the root of the project:
```env
DATABASE_URL="postgresql://[user]:[password]@[endpoint].neon.tech/[dbname]?sslmode=require"
BLOB_READ_WRITE_TOKEN="vercel_blob_rw_..."

# (Optional for future LLM integration)
AUDITEYE_LLM_API_KEY="your_api_key_here"
```

## Installation & Startup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the local server:
   ```bash
   npm run dev
   ```
   
   The server will start at `http://localhost:3000`.
