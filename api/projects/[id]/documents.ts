import multer from 'multer';
import { put } from '@vercel/blob';
import { getDb } from '../../_lib/db.js';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt'];
// 简单的 MIME 映射表用于辅助校验。浏览器传的 MIME 类型可能不可靠，但我们做一层基础防御。
const ALLOWED_MIMES = [
  'application/pdf',
  'application/msword', 
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  // Vercel Serverless Functions Payload limit is 4.5MB, limiting slightly below to fit metadata.
  limits: { fileSize: 4.3 * 1024 * 1024 }, 
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
    if (e.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({ error: '单文件超过大小限制 (Vercel Node环境上限约 4.5MB)，建议压缩后重试。' });
    }
    return res.status(400).json({ error: `文件解析或上传体积异常: ${e.message}` });
  }

  const files = req.files as Express.Multer.File[];
  if (!files || files.length === 0) {
    return res.status(400).json({ error: "未检测到上传的文件或文件解析为空 (No files uploaded)" });
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
  const failedDocs = [];

  for (const file of files) {
    // 强制转换为 utf8 以安全读取原始名，部分客户端 multer 可能仍按 latin1 返回
    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    
    try {
      const ext = originalName.includes('.') ? originalName.substring(originalName.lastIndexOf('.')).toLowerCase() : '';
      
      // 双重校验：后缀 + MIME Type (允许 MIME 为强制 application/octet-stream fallback)
      if (!ALLOWED_EXTS.includes(ext) && !ALLOWED_MIMES.includes(file.mimetype) && file.mimetype !== 'application/octet-stream') {
        failedDocs.push({ fileName: originalName, reason: `不支持的文件类型: 扩展名 ${ext} 或 MIME ${file.mimetype} 暂不被允许。` });
        continue;
      }

      // 安全的 Blob Path，不要带入原文件名(可能含特殊字符或超长)
      const randomId = Math.random().toString(36).substring(2, 10);
      const safeBlobKey = `audit-files/${id}/${Date.now()}-${randomId}${ext}`;

      // Upload to Vercel Blob
      let blobResult: any;
      try {
        blobResult = await put(safeBlobKey, file.buffer, {
          access: 'public',
        });
      } catch (e: any) {
        failedDocs.push({ fileName: originalName, reason: `Vercel Blob 远程写入失败: ${e.message}` });
        continue;
      }

      const blobUrl = blobResult.url;

      // Save to Neon DB
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
        // 遇到数据库写入失败的情况，做个标记，虽然 Blob 里留存了冗余文件，但不影响主链路和安全性。
        console.error("DB Insert Error - File orphaned in Blob:", safeBlobKey, e.message);
        failedDocs.push({ fileName: originalName, reason: `元数据保存到数据库失败: ${e.message}。由于Vercel Blob无原子事务，部分残留文件会在后续清理策略中移除。` });
        continue;
      }
    } catch(e: any) {
      console.error("Upload process error for file:", e.message);
      failedDocs.push({ fileName: originalName, reason: `处理过程内部异常: ${e.message}` });
    }
  }

  // 综合返回结果结构
  if (failedDocs.length > 0 && insertedDocs.length === 0) {
    return res.status(400).json({ status: "failed", error: "所有文件上传失败", failed: failedDocs });
  } else if (failedDocs.length > 0) {
    return res.status(207).json({ status: "partial_success", documents: insertedDocs, failed: failedDocs });
  }

  return res.status(200).json({ status: "success", documents: insertedDocs });
}
