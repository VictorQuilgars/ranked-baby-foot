import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const supabase = createAdminClient();

    const { data: match } = await supabase
      .from('matches')
      .select('id, status, host_id, referee_id')
      .eq('id', id)
      .single();

    if (!match) return NextResponse.json({ error: 'Match introuvable' }, { status: 404 });
    if (match.status !== 'in_progress') {
      return NextResponse.json({ error: 'Seul un match en cours peut être mis en pause' }, { status: 400 });
    }

    const isHost = match.host_id === user!.id;
    const isReferee = match.referee_id === user!.id;
    if (!isHost && !isReferee) {
      return NextResponse.json({ error: 'Seul l\'hôte ou l\'arbitre peut mettre en pause' }, { status: 403 });
    }

    const { data, error } = await supabase
      .from('matches')
      .update({ status: 'paused' })
      .eq('id', id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: 'Impossible de mettre en pause' }, { status: 500 });

    return NextResponse.json({ data });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
