import { Router, Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';

const router = Router();

// POST /api/auth/sync-profile
// Crée ou met à jour le profil joueur après connexion OAuth
router.post('/sync-profile', requireAuth, async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const { username, avatarUrl } = req.body;

  // Vérifie si le profil existe déjà
  const { data: existing } = await getSupabase()
    .from('players')
    .select('id')
    .eq('id', userId)
    .single();

  if (existing) {
    res.json({ data: { created: false } });
    return;
  }

  // Création du profil initial
  const { data, error } = await getSupabase()
    .from('players')
    .insert({
      id: userId,
      username: username ?? `player_${userId.slice(0, 8)}`,
      avatar_url: avatarUrl ?? null,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Impossible de créer le profil', details: error.message });
    return;
  }

  res.status(201).json({ data: { created: true, player: data } });
});

export default router;
