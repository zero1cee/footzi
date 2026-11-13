import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.js';
import { getJwtSecret } from '../config/env.js';

// Extend Express Request interface to include authenticated user
export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
  iat?: number;
}

export const authenticate = async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    }

    if (!token) {
      res.status(401).json({
        error: 'Authentication required',
        message: 'No Bearer authentication token provided. Please log in.',
      });
      return;
    }

    const secret = getJwtSecret();
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        error: 'Invalid session',
        message: 'The patron account associated with this token no longer exists.',
      });
      return;
    }

    // A password change or reset invalidates every token issued before it
    if (user.passwordChangedAt && decoded.iat && decoded.iat < Math.floor(user.passwordChangedAt.getTime() / 1000)) {
      res.status(401).json({
        error: 'Session expired',
        message: 'Your password was changed. Please log in again.',
      });
      return;
    }

    req.user = user;
    next();
  } catch (error: any) {
    res.status(401).json({
      error: 'Authentication failed',
      message: error.name === 'TokenExpiredError' ? 'Token expired. Please log in again.' : 'Invalid token signature.',
    });
  }
};

/** True for accounts that may open the operations desk (full admin or the read-only demo admin). */
export const isAdminRole = (role?: string): boolean => role === 'admin' || role === 'demo_admin';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Contact details of real customers are blanked for the public demo admin
const MASKED_KEYS = new Set(['email', 'customerEmail', 'phone', 'customerPhone', 'addressLine', 'pincode', 'customerName']);
const MASKED_PERSON_PARENTS = new Set(['user', 'shippingAddress']);

const maskValue = (key: string, value: string): string =>
  key.toLowerCase().includes('email') && value.includes('@')
    ? `${value[0]}***${value.slice(value.indexOf('@'))}`
    : '••••••';

const maskDeep = (node: any, parentKey = ''): any => {
  if (Array.isArray(node)) return node.map((n) => maskDeep(n, parentKey));
  if (node && typeof node === 'object' && !(node instanceof Date) && typeof node.toHexString !== 'function') {
    const out: any = {};
    for (const [key, value] of Object.entries(node)) {
      const isPersonName = key === 'name' && MASKED_PERSON_PARENTS.has(parentKey);
      out[key] =
        typeof value === 'string' && (MASKED_KEYS.has(key) || isPersonName)
          ? maskValue(key, value)
          : maskDeep(value, key);
    }
    return out;
  }
  return node;
};

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (!isAdminRole(req.user.role)) {
    res.status(403).json({
      error: 'Access denied',
      message: 'Forbidden. Administrator privileges required to access this resource.',
    });
    return;
  }

  if (req.user.role === 'demo_admin') {
    if (!SAFE_METHODS.has(req.method)) {
      res.status(403).json({
        error: 'Read-only demo: changes are disabled for this account.',
        message: 'The demo admin account is read-only. Sign in with the private admin account to make changes.',
      });
      return;
    }

    // Mask customer contact details in everything this session reads
    const json = res.json.bind(res);
    res.json = (body: any) => json(maskDeep(JSON.parse(JSON.stringify(body))));
  }

  next();
};
