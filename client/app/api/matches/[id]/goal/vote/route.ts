import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import { finalizeSRCalculation, determineWinner } from '@/lib/services/matchService';

const schema = z.object({
  eventId: z.string().uuid(),
  vote: z.enum(['confirm', 'reject']),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { eventId, vote } = schema.parse(body);
    const supabase = createAdminClient();

    // Vérifier que le joueur est bien dans ce match
    const { data: playerEntry } = await supabase
      .from('match_players')
      .select('team')
      .eq('match_id', id)
      .eq('player_id', user!.id)
      .single();

    if (!playerEntry) {
      return NextResponse.json({ error: 'Tu ne participes pas à ce match' }, { status: 403 });
    }

    // Vérifier que l'event existe, appartient à ce match et est en attente
    const { data: event } = await supabase
      .from('match_events')
      .select('id, team, scorer_id, status')
      .eq('id', eventId)
      .eq('match_id', id)
      .single();

    if (!event) return NextResponse.json({ error: 'But introuvable' }, { status: 404 });
    if (event.status !== 'pending') {
      return NextResponse.json({ error: 'Ce but n\'est plus en attente' }, { status: 400 });
    }

    // Insérer ou mettre à jour le vote
    await supabase.from('goal_votes').upsert({
      event_id: eventId,
      player_id: user!.id,
      team: playerEntry.team,
      vote,
    }, { onConflict: 'event_id,player_id' });

    // Rejet → annulation immédiate
    if (vote === 'reject') {
      await supabase.from('match_events').update({ status: 'cancelled' }).eq('id', eventId);
      return NextResponse.json({ data: { status: 'cancelled' } });
    }

    // Vérifier si les deux équipes ont confirmé
    const { data: votes } = await supabase
      .from('goal_votes')
      .select('team, vote')
      .eq('event_id', eventId);

    const confirmingTeams = new Set(
      (votes ?? []).filter((v) => v.vote === 'confirm').map((v) => v.team)
    );

    if (!confirmingTeams.has('A') || !confirmingTeams.has('B')) {
      return NextResponse.json({ data: { status: 'pending' } });
    }

    // Les deux équipes ont confirmé → appliquer le but
    const goalTeam = event.team as 'A' | 'B';

    const { data: match } = await supabase
      .from('matches')
      .select('score_team_a, score_team_b, score_target')
      .eq('id', id)
      .single();

    if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });

    // Incrémenter goals_scored du buteur
    if (event.scorer_id) {
      const { data: mp } = await supabase
        .from('match_players')
        .select('goals_scored')
        .eq('match_id', id)
        .eq('player_id', event.scorer_id)
        .single();
      if (mp) {
        await supabase.from('match_players')
          .update({ goals_scored: mp.goals_scored + 1 })
          .eq('match_id', id)
          .eq('player_id', event.scorer_id);
      }
    }

    const scoreField = goalTeam === 'A' ? 'score_team_a' : 'score_team_b';
    const newScore = (goalTeam === 'A' ? match.score_team_a : match.score_team_b) + 1;
    const newScoreA = goalTeam === 'A' ? newScore : match.score_team_a;
    const newScoreB = goalTeam === 'B' ? newScore : match.score_team_b;
    const isFinished = newScore >= match.score_target;
    const winner = determineWinner(newScoreA, newScoreB);

    const updates: Record<string, unknown> = { [scoreField]: newScore };
    if (isFinished) {
      updates.status = 'finished';
      updates.winner_team = winner;
      updates.finished_at = new Date().toISOString();
    }

    const { data: updatedMatch, error: updateError } = await supabase
      .from('matches').update(updates).eq('id', id).select().single();

    if (updateError) return NextResponse.json({ error: 'Impossible d\'appliquer le but' }, { status: 500 });

    await supabase.from('match_events').update({ status: 'confirmed' }).eq('id', eventId);

    if (isFinished) await finalizeSRCalculation(id, winner);

    return NextResponse.json({ data: updatedMatch });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
