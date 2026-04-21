import multer from 'multer';
import { put } from '@vercel/blob';
import { getDb } from '../../../src/lib/db';

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

  const sql = getDb();
  if (!sql) {
    return res.status(503).json({ error: "数据库尚未配置 (DATABASE_URL missing)。当前为可读 Demo 模式，禁止写入。" });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: "Vercel Blob 尚未配置 (BLOB_READ_WRITE_TOKEN missing)。当前为可读 Demo 模式，禁止写入。" });
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

  // Verify project exists in DB
  try {
    const [project] = await sql`SELECT id FROM projects WHERE id = ${id as string}`;
    if (!project) {
       return res.status(404).json({ error: `在真实数据库中未找到项目 ID: ${id}。上传已终止。` });
    }
  } catch (err: any) {
    return res.status(500).json({ error: "数据库查询异常，无法验证项目存在性。", detail: err.message });
  }

  const insertedDocs = [];
  for (const file of files) {
    try {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
      
      if (!ALLOWED_EXTS.includes(ext)) {
        return res.status(400).json({ error: `不支持的文件类型: ${ext}` });
      }

      // Upload to Vercel Blob
      let blobResult: any;
      try {
        blobResult = await put('audit-files/' + Date.now() + '-' + originalName, file.buffer, {
          access: 'public',
        });
      } catch (e: any) {
        return res.status(500).json({ error: `上传到 Vercel Blob 失败: ${e.message}` });
      }

      const blobUrl = blobResult.url;

      // Save to Neon DB
      try {
        const [doc] = await sql`
           INSERT INTO documents (project_id, file_name, original_name, source_type, blob_url)
           VALUES (${id as string}, ${blobResult.pathname}, ${originalName}, ${ext}, ${blobUrl})
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
        return res.status(500).json({ error: "元数据写入数据库失败", detail: e.message });
      }
    } catch(e: any) {
      console.error("Upload error for file:", e.message);
      return res.status(500).json({ error: `处理文件异常: ${e.message}` });
    }
  }

  return res.status(200).json({ status: "success", documents: insertedDocs });
}
