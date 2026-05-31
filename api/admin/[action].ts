import { parse, serialize } from 'cookie';

export default function handler(req: any, res: any) {
  const { action } = req.query;

  if (action === 'me') {
    if (req.method !== 'GET') return res.status(405).json({ error: 'Method Not Allowed' });
    const cookies = parse(req.headers.cookie || '');
    const isAdmin = cookies.admin_session === 'authenticated';
    return res.status(200).json({ isAdmin, role: isAdmin ? 'admin' : 'user' });
  } 
  
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const { password } = req.body || {};
    const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '20050805';

    if (password === ADMIN_PASSWORD) {
      const cookieString = serialize('admin_session', 'authenticated', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24, // 1 day
        path: '/',
        sameSite: 'lax',
      });
      res.setHeader('Set-Cookie', cookieString);
      return res.status(200).json({ success: true, role: 'admin' });
    } else {
      return res.status(401).json({ error: '密码错误' });
    }
  } 
  
  if (action === 'logout') {
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });
    const cookieString = serialize('admin_session', '', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0), // Expire immediately
      path: '/',
      sameSite: 'lax',
    });
    res.setHeader('Set-Cookie', cookieString);
    return res.status(200).json({ success: true });
  }

  return res.status(404).json({ error: 'Not found' });
}
