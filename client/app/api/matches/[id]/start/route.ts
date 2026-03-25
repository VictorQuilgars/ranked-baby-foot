import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: match } = await supabase.from('matches').select('id, status, host_id').eq('id', id).single();
  if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
  if (match.host_id !== user!.id) return NextResponse.json({ error: 'Seul l\'hôte peut démarrer' }, { status: 403 });
  if (match.status !== 'lobby') return NextResponse.json({ error: 'Match non en lobby' }, { status: 400 });

  const { data: players } = await supabase.from('match_players').select('id').eq('match_id', id);
  if (!players || players.length < 4) return NextResponse.json({ error: '4 joueurs requis' }, { status: 400 });

  const { data, error } = await supabase
    .from('matches')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: 'Impossible de démarrer' }, { status: 500 });
  return NextResponse.json({ data });
}
