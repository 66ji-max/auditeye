import multer from 'multer';
import { put } from '@vercel/blob';
import { getDb } from '../../_lib/db.js';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt'];
const MAX_FILE_SIZE = 4.3 * 1024 * 1024; // 4.3 MB

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE }, 
});

function runMiddleware(req: any, res: any, fn: any) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) return reject(result);
      return resolve(result);
    });
  });
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
  }

  try {
    await runMiddleware(req, res, upload.array('files'));
  } catch (e: any) {
    if (e.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '文件太大，请压缩后重试', errorCode: 'FILE_TOO_LARGE' });
    }
    console.error("multer parsing error:", e);
    return res.status(400).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
  }

  const { id } = req.query;

  // Verify project exists in DB
  try {
    const [project] = await sql`SELECT id FROM projects WHERE id = ${id as string}`;
    if (!project) {
       return res.status(404).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
    }
  } catch (err: any) {
    console.error("DB connection error:", err);
    return res.status(500).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
  }

  let formatError = false;

  // 1. Validation Step
  for (const file of files) {
    // 强制转换为 utf8 以安全读取原始名，部分客户端 multer 可能仍按 latin1 返回
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : '';
    
    if (!ALLOWED_EXTS.includes(ext)) {
      formatError = true;
      break;
    }
    if (file.size > MAX_FILE_SIZE) {
      return res.status(413).json({ error: '文件太大，请压缩后重试', errorCode: 'FILE_TOO_LARGE' });
    }
  }

  if (formatError) {
    return res.status(400).json({ error: '仅支持 PDF、DOC、DOCX、TXT 文件', errorCode: 'INVALID_FILE_TYPE' });
  }

  const insertedDocs = [];

  // 2. Upload Step
  for (const file of files) {
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
      
    try {
      const randomId = Math.random().toString(36).substring(2, 10);
      const safeBlobKey = `audit-files/${id}/${Date.now()}-${randomId}${ext}`;

      let blobResult: any;
      try {
        blobResult = await put(safeBlobKey, file.buffer, {
          access: 'public',
        });
      } catch (e: any) {
        console.error("Vercel Blob Upload failed:", e);
        throw new Error('BLOB_FAILED');
      }

      const blobUrl = blobResult.url;

      try {
        const [doc] = await sql`
           INSERT INTO documents (project_id, file_name, original_name, source_type, blob_url)
           VALUES (${id as string}, ${safeBlobKey}, ${originalName}, ${ext}, ${blobUrl})
           RETURNING id, file_name, original_name, source_type, blob_url, uploaded_at
        `;
        insertedDocs.push({
          id: doc.id,
          fileName: doc.file_name,
          originalName: doc.original_name,
          sourceType: doc.source_type,
          blobUrl: doc.blob_url,
          createdAt: doc.uploaded_at
        });
      } catch(e: any) {
        console.error("DB Insert Error - File orphaned in Blob:", safeBlobKey, e.message);
        throw new Error('DB_FAILED');
      }
    } catch(e: any) {
      console.error("Upload process error for file:", e.message);
      return res.status(500).json({ error: '上传失败，请重试', errorCode: 'UPLOAD_FAILED' });
    }
  }

  return res.status(200).json({ status: "success", documents: insertedDocs });
}
