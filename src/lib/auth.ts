import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'premium-hostel-mgmt-system-secret-key-2026';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function signToken(payload: { userId: string; role: string; name: string; phone: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): { userId: string; role: string; name: string; phone: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: string; role: string; name: string; phone: string };
  } catch (error) {
    return null;
  }
}

export function getCookieValue(cookieString: string | null, name: string): string | null {
  if (!cookieString) return null;
  const match = cookieString.match(new RegExp('(^| )' + name + '=([^;]+)'));
  if (match) return match[2];
  return null;
}

export async function getUserFromRequest(req: Request): Promise<{ userId: string; role: string; name: string; phone: string } | null> {
  try {
    const cookieHeader = req.headers.get('cookie');
    const token = getCookieValue(cookieHeader, 'token');
    if (!token) return null;
    return verifyToken(token);
  } catch (error) {
    return null;
  }
}
