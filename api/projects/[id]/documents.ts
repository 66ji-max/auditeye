import multer from 'multer';
import { put } from '@vercel/blob';
import { getDb } from '../../../src/lib/db';
import { getMockProjectDetail } from '../../../src/lib/mockData';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt'];

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
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

  try {
    await runMiddleware(req, res, upload.array('files'));
  } catch (e: any) {
    return res.status(500).json({ error: `文件解析失败: ${e.message}` });
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "No files uploaded (请上传文件)" });
  }

  const { id } = req.query;
  const sql = getDb();

  const insertedDocs = [];
  for (const file of files) {
    try {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
      
      if (!ALLOWED_EXTS.includes(ext)) {
        return res.status(400).json({ error: `不支持的文件类型: ${ext}` });
      }

      let blobResult: any = null;
      let blobUrl = '';

      // Upload to Vercel Blob if token is available
      if (process.env.BLOB_READ_WRITE_TOKEN) {
        blobResult = await put('audit-files/' + Date.now() + '-' + originalName, file.buffer, {
          access: 'public',
        });
        blobUrl = blobResult.url;
      } else {
        console.warn("BLOB_READ_WRITE_TOKEN not set, skipping actual Blob upload. Faking URL for demo.");
        blobUrl = `https://unconfigured-blob.vercel.app/${originalName}`;
      }

      // Save to Neon DB if available
      if (sql) {
        const [doc] = await sql`
           INSERT INTO documents (project_id, file_name, original_name, source_type, blob_url)
           VALUES (${id as string}, ${originalName}, ${originalName}, ${ext}, ${blobUrl})
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
      } else {
        // Fallback: push to mock storage
        insertedDocs.push({
          id: Date.now() + Math.floor(Math.random() * 100),
          fileName: originalName,
          originalName: originalName,
          sourceType: ext,
          blobUrl: blobUrl,
          createdAt: new Date().toISOString()
        });
      }
    } catch(e: any) {
      console.error("Upload error for file:", e.message);
    }
  }

  // Update in-memory mock if it exists there, so frontend won't break if it reads from mock
  const projectDetail = getMockProjectDetail(id as string);
  if (projectDetail) {
    projectDetail.documents = [...(projectDetail.documents || []), ...insertedDocs];
  }

  return res.status(200).json({ status: "success", documents: insertedDocs });
}
