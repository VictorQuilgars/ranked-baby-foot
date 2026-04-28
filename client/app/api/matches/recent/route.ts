import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  const status = request.nextUrl.searchParams.get('status') ?? 'in_progress';

  const { data, error } = await createAdminClient()
    .from('matches')
    .select(`
      id, code, name, status, score_team_a, score_team_b, winner_team,
      score_target, started_at, finished_at, created_at,
      match_players (
        team, position,
        players (id, username, avatar_url, rank, rank_tier, placement_matches_left)
      )
    `)
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) return NextResponse.json({ error: 'Impossible de charger les matchs' }, { status: 500 });
  return NextResponse.json({ data });
}
