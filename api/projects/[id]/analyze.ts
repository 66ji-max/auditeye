export default function handler(req: any, res: any) {
  if (req.method === 'POST') {
    return res.status(200).json({ status: "success", result: "mocked on vercel" });
  }
  return res.status(405).json({ error: 'Method Not Allowed' });
}
