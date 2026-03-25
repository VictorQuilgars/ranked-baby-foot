import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';
import { generateMatchCode } from '@/lib/services/matchCode';

const schema = z.object({
  name: z.string().max(50).optional(),
  scoreTarget: z.number().int().min(3).max(20).default(10),
  team: z.enum(['A', 'B']),
  position: z.enum(['attacker', 'goalkeeper']),
});

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { name, scoreTarget, team, position } = schema.parse(body);

    const supabase = createAdminClient();

    // Générer un code unique
    let code = generateMatchCode();
    for (let i = 0; i < 5; i++) {
      const { data: existing } = await supabase.from('matches').select('id').eq('code', code).single();
      if (!existing) break;
      code = generateMatchCode();
    }

    const { data: match, error: matchError } = await supabase
      .from('matches')
      .insert({ code, name: name ?? null, host_id: user!.id, score_target: scoreTarget })
      .select()
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Impossible de créer le match' }, { status: 500 });
    }

    const { error: playerError } = await supabase
      .from('match_players')
      .insert({ match_id: match.id, player_id: user!.id, team, position });

    if (playerError) {
      await supabase.from('matches').delete().eq('id', match.id);
      return NextResponse.json({ error: 'Impossible de rejoindre le match' }, { status: 500 });
    }

    return NextResponse.json({ data: match }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Données invalides', details: e.errors }, { status: 400 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
