import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: match } = await supabase.from('matches').select('id, status, referee_id, score_team_a, score_team_b').eq('id', id).single();
  if (!match || match.status !== 'in_progress') return NextResponse.json({ error: 'Match non en cours' }, { status: 400 });
  if (match.referee_id && match.referee_id !== user!.id) return NextResponse.json({ error: 'Seul l\'arbitre peut annuler un but' }, { status: 403 });

  const { data: lastGoal } = await supabase
    .from('match_events')
    .select('id, team, scorer_id')
    .eq('match_id', id)
    .eq('event_type', 'goal')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!lastGoal) return NextResponse.json({ error: 'Aucun but à annuler' }, { status: 400 });

  await supabase.from('match_events').update({ event_type: 'goal_cancelled' }).eq('id', lastGoal.id);

  // Décrémenter goals_scored du buteur
  if (lastGoal.scorer_id) {
    const { data: mp } = await supabase.from('match_players').select('goals_scored').eq('match_id', id).eq('player_id', lastGoal.scorer_id).single();
    if (mp && mp.goals_scored > 0) {
      await supabase.from('match_players').update({ goals_scored: mp.goals_scored - 1 }).eq('match_id', id).eq('player_id', lastGoal.scorer_id);
    }
  }

  const scoreField = lastGoal.team === 'A' ? 'score_team_a' : 'score_team_b';
  const currentScore = lastGoal.team === 'A' ? match.score_team_a : match.score_team_b;

  const { data, error } = await supabase.from('matches').update({ [scoreField]: Math.max(0, currentScore - 1) }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: 'Impossible d\'annuler le but' }, { status: 500 });

  return NextResponse.json({ data });
}
