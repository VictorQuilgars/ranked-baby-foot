import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

const schema = z.object({ refereeId: z.string().uuid().optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json().catch(() => ({}));
  const { refereeId } = schema.parse(body);

  const { data: match } = await supabase.from('matches').select('id, host_id').eq('id', id).single();
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
  if (match.host_id !== user!.id) return NextResponse.json({ error: 'Seul l\'hôte peut désigner l\'arbitre' }, { status: 403 });

  const { data, error } = await supabase.from('matches').update({ referee_id: refereeId ?? user!.id }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: 'Impossible de désigner l\'arbitre' }, { status: 500 });
  return NextResponse.json({ data });
}
