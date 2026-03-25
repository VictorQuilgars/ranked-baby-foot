import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { data, error } = await createAdminClient()
    .from('invitations')
    .select('id, status, created_at, expires_at, matches (id, code, name), inviter:inviter_id (id, username, avatar_url, rank, rank_tier)')
    .eq('invited_id', user!.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: 'Impossible de récupérer les invitations' }, { status: 500 });
  return NextResponse.json({ data });
}
