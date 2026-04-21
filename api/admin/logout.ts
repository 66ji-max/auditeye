import { serialize } from 'cookie';

export default function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

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
