import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: match } = await supabase.from('matches').select('id, status').eq('id', id).single();
  if (!match || match.status !== 'lobby') return NextResponse.json({ error: 'Impossible de quitter' }, { status: 400 });

  const { error } = await supabase.from('match_players').delete().eq('match_id', id).eq('player_id', user!.id);
  if (error) return NextResponse.json({ error: 'Impossible de quitter' }, { status: 500 });

  return NextResponse.json({ data: { left: true } });
}
