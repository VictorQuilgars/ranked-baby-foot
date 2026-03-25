import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';
import { validateBody, validateQuery } from '../middleware/validation';

const router = Router();

const updateProfileSchema = z.object({
  username: z.string().min(2).max(20).regex(/^[a-zA-Z0-9_-]+$/).optional(),
  avatarUrl: z.string().url().optional(),
  preferredPosition: z.enum(['attacker', 'goalkeeper', 'both']).optional(),
});

const searchQuerySchema = z.object({
  q: z.string().min(2).max(20),
});

// GET /api/players/search
router.get('/search', requireAuth, validateQuery(searchQuerySchema), async (req: Request, res: Response) => {
  const { q } = req.query as { q: string };

  const { data, error } = await getSupabase()
    .from('players')
    .select('id, username, avatar_url, rank, rank_tier, placement_matches_left')
    .ilike('username', `%${q}%`)
    .neq('id', req.user!.id)
    .limit(10);

  if (error) {
    res.status(500).json({ error: 'Erreur de recherche', details: error.message });
    return;
  }

  res.json({ data });
});

// GET /api/players/me
router.get('/me', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('players')
    .select('*')
    .eq('id', req.user!.id)
    .single();

  if (error) {
    res.status(404).json({ error: 'Profil introuvable' });
    return;
  }

  res.json({ data });
});

// GET /api/players/me/history
router.get('/me/history', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('match_players')
    .select(`
      id, team, position, goals_scored, is_mvp, sr_change, joined_at,
      matches (
        id, code, name, status, score_team_a, score_team_b, winner_team,
        started_at, finished_at
      )
    `)
    .eq('player_id', req.user!.id)
    .not('matches.status', 'eq', 'cancelled')
    .order('joined_at', { ascending: false })
    .limit(20);

  if (error) {
    res.status(500).json({ error: 'Impossible de récupérer l\'historique', details: error.message });
    return;
  }

  res.json({ data });
});

// PUT /api/players/me
router.put('/me', requireAuth, validateBody(updateProfileSchema), async (req: Request, res: Response) => {
  const updates: Record<string, unknown> = {};

  if (req.body.username !== undefined) {
    // Vérifier l'unicité du username
    const { data: existing } = await getSupabase()
      .from('players')
      .select('id')
      .eq('username', req.body.username)
      .neq('id', req.user!.id)
      .single();

    if (existing) {
      res.status(409).json({ error: 'Ce pseudo est déjà pris' });
      return;
    }
    updates.username = req.body.username;
  }

  if (req.body.avatarUrl !== undefined) updates.avatar_url = req.body.avatarUrl;
  if (req.body.preferredPosition !== undefined) updates.preferred_position = req.body.preferredPosition;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await getSupabase()
    .from('players')
    .update(updates)
    .eq('id', req.user!.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Mise à jour impossible', details: error.message });
    return;
  }

  res.json({ data });
});

// GET /api/players/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('players')
    .select('id, username, avatar_url, rank, rank_tier, placement_matches_left, total_games, wins, losses, goals_scored, mvp_count, created_at')
    .eq('id', req.params.id)
    .single();

  if (error) {
    res.status(404).json({ error: 'Joueur introuvable' });
    return;
  }

  res.json({ data });
});

export default router;
