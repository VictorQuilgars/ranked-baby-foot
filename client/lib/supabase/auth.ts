import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from './server';

export async function getUserFromRequest(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await createAdminClient().auth.getUser(token);
  return user ?? null;
}

export async function requireUser(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) {
    return { user: null, error: NextResponse.json({ error: 'Non authentifié' }, { status: 401 }) };
  }
  return { user, error: null };
}
