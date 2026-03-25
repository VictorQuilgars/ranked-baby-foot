import { createSessionClient, createAdminClient } from '@/lib/supabase/server';
import { HomeClient } from './HomeClient';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  const supabase = await createSessionClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  let { data: player } = await createAdminClient()
    .from('players')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!player) {
    const username =
      user.user_metadata?.full_name?.replace(/\s+/g, '_').toLowerCase() ??
      `player_${user.id.slice(0, 8)}`;

    const { data: created } = await createAdminClient()
      .from('players')
      .insert({ id: user.id, username, avatar_url: user.user_metadata?.avatar_url ?? null })
      .select()
      .single();

    player = created;
  }

  return <HomeClient player={player} />;
}
