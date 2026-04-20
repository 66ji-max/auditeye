import multer from 'multer';
import { getMockProjectDetail } from '../../../src/lib/mockData';

const ALLOWED_EXTS = ['.pdf', '.doc', '.docx', '.txt'];

export const config = {
  api: {
    bodyParser: false,
  },
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
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

  const insertedDocs = [];
  for (const file of files) {
    try {
      const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
      const ext = originalName.substring(originalName.lastIndexOf('.')).toLowerCase();
      
      if (!ALLOWED_EXTS.includes(ext)) {
        return res.status(400).json({ error: `不支持的文件类型: ${ext}` });
      }

      insertedDocs.push({
        id: Date.now() + Math.floor(Math.random() * 100),
        fileName: originalName,
        originalName: originalName,
        sourceType: ext
      });
    } catch(e) {
      // ignore individual parse errors
    }
  }

  const { id } = req.query;
  const projectDetail = getMockProjectDetail(id as string);
  
  if (projectDetail) {
    projectDetail.documents = [...(projectDetail.documents || []), ...insertedDocs];
  }

  return res.status(200).json({ status: "success", documents: insertedDocs });
}
