import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

const schema = z.object({
  username: z.string().min(2).max(20).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  avatarUrl: z.string().url().optional(),
  preferredPosition: z.enum(['attacker', 'goalkeeper', 'both']).optional(),
});

export async function GET(request: NextRequest) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { data, error } = await createAdminClient().from('players').select('*').eq('id', user!.id).single();
  if (error) return NextResponse.json({ error: 'Profil introuvable' }, { status: 404 });
  return NextResponse.json({ data });
}

export async function PUT(request: NextRequest) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const body = await request.json();
    const parsed = schema.parse(body);
    const supabase = createAdminClient();
    const updates: Record<string, unknown> = {};

    if (parsed.username !== undefined) {
      const { data: existing } = await supabase.from('players').select('id').eq('username', parsed.username).neq('id', user!.id).single();
      if (existing) return NextResponse.json({ error: 'Ce pseudo est déjà pris' }, { status: 409 });
      updates.username = parsed.username;
    }
    if (parsed.avatarUrl !== undefined) updates.avatar_url = parsed.avatarUrl;
    if (parsed.preferredPosition !== undefined) updates.preferred_position = parsed.preferredPosition;

    const { data, error } = await supabase.from('players').update(updates).eq('id', user!.id).select().single();
    if (error) return NextResponse.json({ error: 'Mise à jour impossible' }, { status: 500 });
    return NextResponse.json({ data });
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ error: 'Données invalides' }, { status: 400 });
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
