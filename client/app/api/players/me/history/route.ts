import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { data, error } = await createAdminClient()
    .from('match_players')
    .select('id, team, position, goals_scored, is_mvp, sr_change, joined_at, matches (id, code, name, status, score_team_a, score_team_b, winner_team, started_at, finished_at)')
    .eq('player_id', user!.id)
    .order('joined_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: 'Impossible de récupérer l\'historique' }, { status: 500 });
  return NextResponse.json({ data });
}
