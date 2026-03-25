import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUser } from '@/lib/supabase/auth';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { user, error: authError } = await requireUser(request);
  if (authError) return authError;

  const { id } = await params;
  const { data, error } = await createAdminClient()
    .from('invitations')
    .update({ status: 'declined' })
    .eq('id', id)
    .eq('invited_id', user!.id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !data) return NextResponse.json({ error: 'Invitation introuvable ou déjà traitée' }, { status: 404 });
  return NextResponse.json({ data });
}
