import { createClient } from '@/lib/supabase/server';
import { HomeClient } from './HomeClient';

export default async function HomePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  let { data: player } = await supabase
    .from('players')
    .select('*')
    .eq('id', user.id)
    .single();

  // Première connexion — créer le profil automatiquement
  if (!player) {
    const username =
      user.user_metadata?.full_name?.replace(/\s+/g, '_').toLowerCase() ??
      `player_${user.id.slice(0, 8)}`;

    const { data: created } = await supabase
      .from('players')
      .insert({
        id: user.id,
        username,
        avatar_url: user.user_metadata?.avatar_url ?? null,
      })
      .select()
      .single();

    player = created;
  }

  return <HomeClient player={player} />;
}
