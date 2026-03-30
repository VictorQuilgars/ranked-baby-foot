import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import { finalizeSRCalculation, determineWinner } from '@/lib/services/matchService';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: match } = await supabase
      .from('matches')
      .select('id, status, host_id, referee_id, score_team_a, score_team_b')
      .eq('id', id)
      .single();

    if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
    if (match.status !== 'in_progress' && match.status !== 'paused') {
      return NextResponse.json({ error: 'Le match ne peut pas être terminé' }, { status: 400 });
    }

    const isHost = match.host_id === user!.id;
    const isReferee = match.referee_id === user!.id;
    if (!isHost && !isReferee) {
      return NextResponse.json({ error: 'Seul l\'hôte ou l\'arbitre peut terminer le match' }, { status: 403 });
    }

    const winner = determineWinner(match.score_team_a, match.score_team_b);

    const { data, error } = await supabase
      .from('matches')
      .update({ status: 'finished', winner_team: winner, finished_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Impossible de terminer le match' }, { status: 500 });

    await finalizeSRCalculation(id, winner);

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
