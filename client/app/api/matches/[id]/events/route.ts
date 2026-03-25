import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await createAdminClient()
    .from('match_events')
    .select('id, event_type, team, scorer_position, created_at, scorer:scorer_id (id, username, avatar_url)')
    .eq('match_id', id)
    .eq('event_type', 'goal')
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: 'Impossible de récupérer les événements' }, { status: 500 });
  return NextResponse.json({ data });
}
