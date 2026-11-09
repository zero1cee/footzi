import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { User, IUser } from '../models/User.js';

// Extend Express Request interface to include authenticated user
export interface AuthRequest extends Request {
  user?: IUser;
}

interface JwtPayload {
  id: string;
  email: string;
  role: string;
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

    const secret = process.env.JWT_SECRET || 'footzi_super_secret_jwt_key_development_only_change_in_prod';
    const decoded = jwt.verify(token, secret) as JwtPayload;

    const user = await User.findById(decoded.id);

    if (!user) {
      res.status(401).json({
        error: 'Invalid session',
        message: 'The patron account associated with this token no longer exists.',
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

export const requireAdmin = (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({
      error: 'Access denied',
      message: 'Forbidden. Administrator privileges required to access this resource.',
    });
    return;
  }

  next();
};
