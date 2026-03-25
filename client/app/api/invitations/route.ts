import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

const schema = z.object({
  matchId: z.string().uuid(),
  invitedId: z.string().uuid(),
});

export async function POST(request: NextRequest) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const { matchId, invitedId } = schema.parse(body);
    const supabase = createAdminClient();

    const { data: match } = await supabase.from('matches').select('id, status').eq('id', matchId).single();
    if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
    if (match.status !== 'lobby') return NextResponse.json({ error: 'Match non en lobby' }, { status: 400 });

    const { data: existing } = await supabase.from('invitations').select('id').eq('match_id', matchId).eq('invited_id', invitedId).eq('status', 'pending').single();
    if (existing) return NextResponse.json({ error: 'Invitation déjà en attente' }, { status: 409 });

    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from('invitations').insert({ match_id: matchId, inviter_id: user!.id, invited_id: invitedId, expires_at: expiresAt }).select().single();
    if (error) return NextResponse.json({ error: 'Impossible de créer l\'invitation' }, { status: 500 });

    return NextResponse.json({ data }, { status: 201 });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
