import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const { data, error } = await createAdminClient()
    .from('matches')
    .select(`*, match_players (id, team, position, player_id, players (id, username, avatar_url, rank, rank_tier, placement_matches_left))`)
    .eq('code', code.toUpperCase())
    .single();

  if (error || !data) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
  return NextResponse.json({ data });
}
