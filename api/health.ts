import { getDb } from '../src/lib/db';

export default async function handler(req: any, res: any) {
  const sql = getDb();
  
  let databaseConfigured = !!process.env.DATABASE_URL;
  let blobConfigured = !!process.env.BLOB_READ_WRITE_TOKEN;
  let databaseReachable = false;
  let schemaReady = false;

  if (sql) {
    try {
      const [{ exists }] = await sql`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'projects'
        );
      `;
      databaseReachable = true;
      schemaReady = exists;
    } catch (e) {
      databaseReachable = false;
    }
  }

  const mode = (databaseConfigured && blobConfigured && databaseReachable && schemaReady) 
      ? 'full' 
      : 'demo-readonly';

  let message = '';
  if (mode === 'full') {
    message = 'System is fully operational (full mode). You can create real projects and upload files.';
  } else {
    message = 'System is in demo-readonly mode. Creation and uploads are disabled until Neon DB and Vercel Blob are fully configured and schema is initialized.';
  }

  return res.status(200).json({
    databaseConfigured,
    blobConfigured,
    databaseReachable,
    schemaReady,
    mode,
    message
  });
}
