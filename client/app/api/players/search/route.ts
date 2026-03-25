import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const q = request.nextUrl.searchParams.get('q') ?? '';
  if (q.length < 2) return NextResponse.json({ error: 'Minimum 2 caractères' }, { status: 400 });

  const { data, error } = await createAdminClient()
    .from('players')
    .select('id, username, avatar_url, rank, rank_tier, placement_matches_left')
    .ilike('username', `%${q}%`)
    .neq('id', user!.id)
    .limit(10);

  if (error) return NextResponse.json({ error: 'Erreur de recherche' }, { status: 500 });
  return NextResponse.json({ data });
}
