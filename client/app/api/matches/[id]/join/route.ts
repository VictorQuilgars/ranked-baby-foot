import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

const schema = z.object({
  team: z.enum(['A', 'B']),
  position: z.enum(['attacker', 'goalkeeper']),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const body = await request.json();
    const { team, position } = schema.parse(body);
    const supabase = createAdminClient();

    const { data: match } = await supabase.from('matches').select('id, status').eq('id', id).single();
    if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
    if (match.status !== 'lobby') return NextResponse.json({ error: 'Match non en lobby' }, { status: 400 });

    const { data: slotTaken } = await supabase.from('match_players').select('id').eq('match_id', id).eq('team', team).eq('position', position).single();
    if (slotTaken) return NextResponse.json({ error: 'Ce slot est déjà occupé' }, { status: 409 });

    const { data: alreadyIn } = await supabase.from('match_players').select('id').eq('match_id', id).eq('player_id', user!.id).single();
    if (alreadyIn) return NextResponse.json({ error: 'Tu es déjà dans ce match' }, { status: 409 });

    const { data, error } = await supabase.from('match_players').insert({ match_id: id, player_id: user!.id, team, position }).select().single();
    if (error) return NextResponse.json({ error: 'Impossible de rejoindre' }, { status: 500 });

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
