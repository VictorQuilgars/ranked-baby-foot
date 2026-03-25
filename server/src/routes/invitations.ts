import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

const router = Router();

const createInvitationSchema = z.object({
  matchId: z.string().uuid(),
  invitedId: z.string().uuid(),
});

// POST /api/invitations
router.post('/', requireAuth, validateBody(createInvitationSchema), async (req: Request, res: Response) => {
  const { matchId, invitedId } = req.body;

  // Vérifier que le match existe et est en lobby
  const { data: match, error: matchError } = await getSupabase()
    .from('matches')
    .select('id, status, host_id')
    .eq('id', matchId)
    .single();

  if (matchError || !match) {
    res.status(404).json({ error: 'Match introuvable' });
    return;
  }

  if (match.status !== 'lobby') {
    res.status(400).json({ error: 'Le match n\'est plus en phase de lobby' });
    return;
  }

  // Vérifier qu'une invitation n'est pas déjà en attente
  const { data: existing } = await getSupabase()
    .from('invitations')
    .select('id')
    .eq('match_id', matchId)
    .eq('invited_id', invitedId)
    .eq('status', 'pending')
    .single();

  if (existing) {
    res.status(409).json({ error: 'Une invitation est déjà en attente pour ce joueur' });
    return;
  }

  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

  const { data, error } = await getSupabase()
    .from('invitations')
    .insert({
      match_id: matchId,
      inviter_id: req.user!.id,
      invited_id: invitedId,
      expires_at: expiresAt,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Impossible de créer l\'invitation', details: error.message });
    return;
  }

  res.status(201).json({ data });
});

// GET /api/invitations/pending
router.get('/pending', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('invitations')
    .select(`
      id, status, created_at, expires_at,
      matches (id, code, name),
      inviter:inviter_id (id, username, avatar_url, rank, rank_tier)
    `)
    .eq('invited_id', req.user!.id)
    .eq('status', 'pending')
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false });

  if (error) {
    res.status(500).json({ error: 'Impossible de récupérer les invitations', details: error.message });
    return;
  }

  res.json({ data });
});

// POST /api/invitations/:id/accept
router.post('/:id/accept', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', req.params.id)
    .eq('invited_id', req.user!.id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Invitation introuvable ou déjà traitée' });
    return;
  }

  res.json({ data });
});

// POST /api/invitations/:id/decline
router.post('/:id/decline', requireAuth, async (req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('invitations')
    .update({ status: 'declined' })
    .eq('id', req.params.id)
    .eq('invited_id', req.user!.id)
    .eq('status', 'pending')
    .select()
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Invitation introuvable ou déjà traitée' });
    return;
  }

  res.json({ data });
});

export default router;
