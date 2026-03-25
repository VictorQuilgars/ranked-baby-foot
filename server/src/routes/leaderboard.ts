import { Router, Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';

const router = Router();

// GET /api/leaderboard
router.get('/', async (_req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('players')
    .select('id, username, avatar_url, rank, rank_tier, rank_points, placement_matches_left, total_games, wins, losses, mvp_count')
    .eq('placement_matches_left', 0) // seulement les joueurs ayant terminé le placement
    .order('rank_points', { ascending: false })
    .limit(100);

  if (error) {
    res.status(500).json({ error: 'Impossible de charger le classement', details: error.message });
    return;
  }

  res.json({ data });
});

export default router;
