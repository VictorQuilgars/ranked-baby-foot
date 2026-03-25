import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await createAdminClient()
    .from('players')
    .select('id, username, avatar_url, rank, rank_tier, placement_matches_left, total_games, wins, losses, goals_scored, mvp_count, created_at')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: 'Joueur introuvable' }, { status: 404 });
  return NextResponse.json({ data });
}
