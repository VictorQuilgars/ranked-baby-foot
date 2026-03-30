import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import { finalizeSRCalculation } from '@/lib/services/matchService';

const schema = z.object({
  team: z.enum(['A', 'B']),
  scorerId: z.string().uuid().optional(),
  scorerPosition: z.enum(['attacker', 'goalkeeper']).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { team, scorerId, scorerPosition } = schema.parse(body);
    const supabase = createAdminClient();

    const { data: match } = await supabase
      .from('matches')
      .select('id, status, referee_id, score_team_a, score_team_b, score_target')
      .eq('id', id)
      .single();

    if (!match || match.status !== 'in_progress') {
      return NextResponse.json({ error: 'Match non en cours' }, { status: 400 });
    }
    if (match.referee_id && match.referee_id !== user!.id) {
      return NextResponse.json({ error: 'Seul l\'arbitre peut enregistrer un but' }, { status: 403 });
    }

    // ── Avec arbitre : confirmation immédiate ─────────────────────────────────
    if (match.referee_id) {
      const { data: event } = await supabase.from('match_events').insert({
        match_id: id,
        event_type: 'goal',
        status: 'confirmed',
        team,
        scorer_id: scorerId ?? null,
        scorer_position: scorerPosition ?? null,
        created_by: user!.id,
      }).select('id').single();

      if (!event) return NextResponse.json({ error: 'Impossible d\'enregistrer le but' }, { status: 500 });

      if (scorerId) {
        const { data: mp } = await supabase.from('match_players').select('goals_scored').eq('match_id', id).eq('player_id', scorerId).single();
        if (mp) await supabase.from('match_players').update({ goals_scored: mp.goals_scored + 1 }).eq('match_id', id).eq('player_id', scorerId);
      }

      const scoreField = team === 'A' ? 'score_team_a' : 'score_team_b';
      const newScore = (team === 'A' ? match.score_team_a : match.score_team_b) + 1;
      const isFinished = newScore >= match.score_target;

      const updates: Record<string, unknown> = { [scoreField]: newScore };
      if (isFinished) {
        updates.status = 'finished';
        updates.winner_team = team;
        updates.finished_at = new Date().toISOString();
      }

      const { data, error } = await supabase.from('matches').update(updates).eq('id', id).select().single();
      if (error) return NextResponse.json({ error: 'Impossible d\'enregistrer le but' }, { status: 500 });

      if (isFinished) await finalizeSRCalculation(id, team);

      return NextResponse.json({ data });
    }

    // ── Sans arbitre : vote requis des deux équipes ───────────────────────────
    // Vérifier que le joueur est bien dans ce match
    const { data: creatorEntry } = await supabase
      .from('match_players')
      .select('team')
      .eq('match_id', id)
      .eq('player_id', user!.id)
      .single();

    if (!creatorEntry) {
      return NextResponse.json({ error: 'Tu ne participes pas à ce match' }, { status: 403 });
    }

    const { data: event } = await supabase.from('match_events').insert({
      match_id: id,
      event_type: 'goal',
      status: 'pending',
      team,
      scorer_id: scorerId ?? null,
      scorer_position: scorerPosition ?? null,
      created_by: user!.id,
    }).select('id').single();

    if (!event) return NextResponse.json({ error: 'Impossible de créer le but' }, { status: 500 });

    // Auto-confirmer pour l'équipe du créateur
    await supabase.from('goal_votes').insert({
      event_id: event.id,
      player_id: user!.id,
      team: creatorEntry.team,
      vote: 'confirm',
    });

    return NextResponse.json({ data: { pending: true, eventId: event.id } });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
