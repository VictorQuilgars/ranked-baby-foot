import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../utils/supabase';

export interface AuthenticatedUser {
  id: string;
  email?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Token manquant' });
    return;
  }

  const token = authHeader.slice(7);

  const { data, error } = await getSupabase().auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: 'Token invalide ou expiré' });
    return;
  }

  req.user = {
    id: data.user.id,
    email: data.user.email,
  };

  next();
}
