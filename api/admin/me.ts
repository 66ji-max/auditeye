import { parse } from 'cookie';

export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const cookies = parse(req.headers.cookie || '');
  const isAdmin = cookies.admin_session === 'authenticated';

  if (isAdmin) {
    return res.status(200).json({ isAdmin: true, role: 'admin' });
  } else {
    return res.status(200).json({ isAdmin: false, role: 'user' });
  }
}
