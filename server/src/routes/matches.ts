import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getSupabase } from '../utils/supabase';
import { requireAuth } from '../middleware/auth';
import { validateBody } from '../middleware/validation';
import { generateMatchCode } from '../utils/matchCode';
import { calculateSRChanges, PlayerMatchData, RankName } from '../services/rankService';
import { matchCreationLimiter } from '../middleware/rateLimiter';

const router = Router();

const createMatchSchema = z.object({
  name: z.string().max(50).optional(),
  scoreTarget: z.number().int().min(3).max(20).default(10),
  team: z.enum(['A', 'B']),
  position: z.enum(['attacker', 'goalkeeper']),
});

const joinMatchSchema = z.object({
  team: z.enum(['A', 'B']),
  position: z.enum(['attacker', 'goalkeeper']),
});

const goalSchema = z.object({
  team: z.enum(['A', 'B']),
  scorerId: z.string().uuid().optional(),
  scorerPosition: z.enum(['attacker', 'goalkeeper']).optional(),
});

// POST /api/matches
router.post('/', requireAuth, matchCreationLimiter, validateBody(createMatchSchema), async (req: Request, res: Response) => {
  const { name, scoreTarget, team, position } = req.body;

  // Générer un code unique
  let code = generateMatchCode();
  let attempts = 0;
  while (attempts < 5) {
    const { data: existing } = await getSupabase()
      .from('matches')
      .select('id')
      .eq('code', code)
      .single();
    if (!existing) break;
    code = generateMatchCode();
    attempts++;
  }

  // Créer le match
  const { data: match, error: matchError } = await getSupabase()
    .from('matches')
    .insert({
      code,
      name: name ?? null,
      host_id: req.user!.id,
      score_target: scoreTarget,
    })
    .select()
    .single();

  if (matchError || !match) {
    res.status(500).json({ error: 'Impossible de créer le match', details: matchError?.message });
    return;
  }

  // Ajouter le créateur comme premier joueur
  const { error: playerError } = await getSupabase()
    .from('match_players')
    .insert({
      match_id: match.id,
      player_id: req.user!.id,
      team,
      position,
    });

  if (playerError) {
    // Rollback le match
    await getSupabase().from('matches').delete().eq('id', match.id);
    res.status(500).json({ error: 'Impossible de rejoindre le match', details: playerError.message });
    return;
  }

  res.status(201).json({ data: match });
});

// GET /api/matches/code/:code
router.get('/code/:code', async (req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('matches')
    .select(`
      *,
      match_players (
        id, team, position, player_id,
        players (id, username, avatar_url, rank, rank_tier, placement_matches_left)
      )
    `)
    .eq('code', (req.params.code as string).toUpperCase())
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Match introuvable avec ce code' });
    return;
  }

  res.json({ data });
});

// GET /api/matches/:id
router.get('/:id', async (req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('matches')
    .select(`
      *,
      match_players (
        id, team, position, player_id, goals_scored, is_mvp, sr_change,
        players (id, username, avatar_url, rank, rank_tier, placement_matches_left)
      )
    `)
    .eq('id', req.params.id)
    .single();

  if (error || !data) {
    res.status(404).json({ error: 'Match introuvable' });
    return;
  }

  res.json({ data });
});

// POST /api/matches/:id/join
router.post('/:id/join', requireAuth, validateBody(joinMatchSchema), async (req: Request, res: Response) => {
  const { team, position } = req.body;

  const { data: match, error: matchError } = await getSupabase()
    .from('matches')
    .select('id, status')
    .eq('id', req.params.id)
    .single();

  if (matchError || !match) {
    res.status(404).json({ error: 'Match introuvable' });
    return;
  }

  if (match.status !== 'lobby') {
    res.status(400).json({ error: 'Ce match n\'est plus en phase de lobby' });
    return;
  }

  // Vérifier que le slot est libre
  const { data: existingSlot } = await getSupabase()
    .from('match_players')
    .select('id')
    .eq('match_id', req.params.id)
    .eq('team', team)
    .eq('position', position)
    .single();

  if (existingSlot) {
    res.status(409).json({ error: 'Ce slot est déjà occupé' });
    return;
  }

  // Vérifier que le joueur n'est pas déjà dans le match
  const { data: alreadyIn } = await getSupabase()
    .from('match_players')
    .select('id')
    .eq('match_id', req.params.id)
    .eq('player_id', req.user!.id)
    .single();

  if (alreadyIn) {
    res.status(409).json({ error: 'Tu es déjà dans ce match' });
    return;
  }

  const { data, error } = await getSupabase()
    .from('match_players')
    .insert({
      match_id: req.params.id,
      player_id: req.user!.id,
      team,
      position,
    })
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Impossible de rejoindre le match', details: error.message });
    return;
  }

  res.status(201).json({ data });
});

// POST /api/matches/:id/leave
router.post('/:id/leave', requireAuth, async (req: Request, res: Response) => {
  const { data: match } = await getSupabase()
    .from('matches')
    .select('id, status, host_id')
    .eq('id', req.params.id)
    .single();

  if (!match || match.status !== 'lobby') {
    res.status(400).json({ error: 'Impossible de quitter : match non trouvé ou déjà démarré' });
    return;
  }

  const { error } = await getSupabase()
    .from('match_players')
    .delete()
    .eq('match_id', req.params.id)
    .eq('player_id', req.user!.id);

  if (error) {
    res.status(500).json({ error: 'Impossible de quitter le match', details: error.message });
    return;
  }

  res.json({ data: { left: true } });
});

// POST /api/matches/:id/start
router.post('/:id/start', requireAuth, async (req: Request, res: Response) => {
  const { data: match } = await getSupabase()
    .from('matches')
    .select('id, status, host_id')
    .eq('id', req.params.id)
    .single();

  if (!match) {
    res.status(404).json({ error: 'Match introuvable' });
    return;
  }

  if (match.host_id !== req.user!.id) {
    res.status(403).json({ error: 'Seul l\'hôte peut démarrer le match' });
    return;
  }

  if (match.status !== 'lobby') {
    res.status(400).json({ error: 'Le match n\'est pas en lobby' });
    return;
  }

  // Vérifier que les 4 slots sont remplis
  const { data: players } = await getSupabase()
    .from('match_players')
    .select('id')
    .eq('match_id', req.params.id);

  if (!players || players.length < 4) {
    res.status(400).json({ error: '4 joueurs requis pour démarrer' });
    return;
  }

  const { data, error } = await getSupabase()
    .from('matches')
    .update({ status: 'in_progress', started_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Impossible de démarrer le match', details: error.message });
    return;
  }

  res.json({ data });
});

// POST /api/matches/:id/referee
router.post('/:id/referee', requireAuth, async (req: Request, res: Response) => {
  const { data: match } = await getSupabase()
    .from('matches')
    .select('id, status, host_id')
    .eq('id', req.params.id)
    .single();

  if (!match) {
    res.status(404).json({ error: 'Match introuvable' });
    return;
  }

  if (match.host_id !== req.user!.id) {
    res.status(403).json({ error: 'Seul l\'hôte peut désigner l\'arbitre' });
    return;
  }

  const { refereeId } = req.body;

  const { data, error } = await getSupabase()
    .from('matches')
    .update({ referee_id: refereeId ?? req.user!.id })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Impossible de désigner l\'arbitre', details: error.message });
    return;
  }

  res.json({ data });
});

// POST /api/matches/:id/goal
router.post('/:id/goal', requireAuth, validateBody(goalSchema), async (req: Request, res: Response) => {
  const { team, scorerId, scorerPosition } = req.body;

  const { data: match } = await getSupabase()
    .from('matches')
    .select('id, status, referee_id, score_team_a, score_team_b, score_target')
    .eq('id', req.params.id)
    .single();

  if (!match || match.status !== 'in_progress') {
    res.status(400).json({ error: 'Match non trouvé ou pas en cours' });
    return;
  }

  // Vérifier que c'est bien l'arbitre (si arbitre désigné)
  if (match.referee_id && match.referee_id !== req.user!.id) {
    res.status(403).json({ error: 'Seul l\'arbitre peut enregistrer un but' });
    return;
  }

  // Enregistrer l'événement
  await getSupabase().from('match_events').insert({
    match_id: req.params.id,
    event_type: 'goal',
    team,
    scorer_id: scorerId ?? null,
    scorer_position: scorerPosition ?? null,
    created_by: req.user!.id,
  });

  // Mettre à jour le score
  const scoreField = team === 'A' ? 'score_team_a' : 'score_team_b';
  const newScore = (team === 'A' ? match.score_team_a : match.score_team_b) + 1;

  let updates: Record<string, unknown> = { [scoreField]: newScore };

  // Fin de match si score cible atteint
  if (newScore >= match.score_target) {
    updates = {
      ...updates,
      status: 'finished',
      winner_team: team,
      finished_at: new Date().toISOString(),
    };
  }

  if (scorerId) {
    await getSupabase()
      .from('match_players')
      .update({ goals_scored: getSupabase().rpc as unknown as number }) // incrémenté via trigger SQL
      .eq('match_id', req.params.id)
      .eq('player_id', scorerId);
  }

  const { data, error } = await getSupabase()
    .from('matches')
    .update(updates)
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Impossible d\'enregistrer le but', details: error.message });
    return;
  }

  // Si match terminé, calculer les SR
  if (data.status === 'finished') {
    await finalizeSRCalculation(req.params.id as string, data.winner_team);
  }

  res.json({ data });
});

// POST /api/matches/:id/goal/cancel
router.post('/:id/goal/cancel', requireAuth, async (req: Request, res: Response) => {
  const { data: match } = await getSupabase()
    .from('matches')
    .select('id, status, referee_id, score_team_a, score_team_b')
    .eq('id', req.params.id)
    .single();

  if (!match || match.status !== 'in_progress') {
    res.status(400).json({ error: 'Match non trouvé ou pas en cours' });
    return;
  }

  if (match.referee_id && match.referee_id !== req.user!.id) {
    res.status(403).json({ error: 'Seul l\'arbitre peut annuler un but' });
    return;
  }

  // Récupérer le dernier but
  const { data: lastGoal } = await getSupabase()
    .from('match_events')
    .select('id, team')
    .eq('match_id', req.params.id)
    .eq('event_type', 'goal')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!lastGoal) {
    res.status(400).json({ error: 'Aucun but à annuler' });
    return;
  }

  // Marquer comme annulé
  await getSupabase()
    .from('match_events')
    .update({ event_type: 'goal_cancelled' })
    .eq('id', lastGoal.id);

  // Décrémenter le score
  const scoreField = lastGoal.team === 'A' ? 'score_team_a' : 'score_team_b';
  const currentScore = lastGoal.team === 'A' ? match.score_team_a : match.score_team_b;

  const { data, error } = await getSupabase()
    .from('matches')
    .update({ [scoreField]: Math.max(0, currentScore - 1) })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    res.status(500).json({ error: 'Impossible d\'annuler le but', details: error.message });
    return;
  }

  res.json({ data });
});

// GET /api/matches/:id/events
router.get('/:id/events', async (req: Request, res: Response) => {
  const { data, error } = await getSupabase()
    .from('match_events')
    .select(`
      id, event_type, team, scorer_position, created_at,
      scorer:scorer_id (id, username, avatar_url)
    `)
    .eq('match_id', req.params.id)
    .eq('event_type', 'goal')
    .order('created_at', { ascending: true });

  if (error) {
    res.status(500).json({ error: 'Impossible de récupérer les événements', details: error.message });
    return;
  }

  res.json({ data });
});

// Calcul et application des SR en fin de match
async function finalizeSRCalculation(matchId: string, winnerTeam: string): Promise<void> {
  const { data: matchPlayers } = await getSupabase()
    .from('match_players')
    .select(`
      player_id, team, position, goals_scored,
      players (rank_points, rank, rank_tier, hidden_mmr, placement_matches_left, rank_shield, daily_loss_forgiven)
    `)
    .eq('match_id', matchId);

  if (!matchPlayers || matchPlayers.length === 0) return;

  const { data: match } = await getSupabase()
    .from('matches')
    .select('score_team_a, score_team_b')
    .eq('id', matchId)
    .single();

  if (!match) return;

  const players: PlayerMatchData[] = matchPlayers.map((mp: Record<string, unknown>) => {
    const p = mp.players as Record<string, unknown>;
    return {
      playerId: mp.player_id as string,
      team: mp.team as 'A' | 'B',
      position: mp.position as 'attacker' | 'goalkeeper',
      goalsScored: mp.goals_scored as number,
      currentSR: p.rank_points as number,
      currentRank: p.rank as RankName,
      currentTier: p.rank_tier as number,
      hiddenMmr: p.hidden_mmr as number,
      placementMatchesLeft: p.placement_matches_left as number,
      rankShield: p.rank_shield as number,
      dailyLossForgiven: p.daily_loss_forgiven as boolean,
    };
  });

  const srChanges = calculateSRChanges({
    players,
    scoreA: match.score_team_a,
    scoreB: match.score_team_b,
    winnerTeam: winnerTeam as 'A' | 'B' | 'draw',
  });

  // Appliquer les changements en parallèle
  await Promise.all(srChanges.map(async (change) => {
    const player = players.find(p => p.playerId === change.playerId)!;
    const newPlacementLeft = Math.max(0, player.placementMatchesLeft - 1);
    const newShield = change.rankUp ? 3 : change.shieldUsed ? player.rankShield - 1 : player.rankShield;

    await getSupabase().from('players').update({
      rank_points: change.newSR,
      rank: newPlacementLeft > 0 ? player.currentRank : change.newRank,
      rank_tier: newPlacementLeft > 0 ? player.currentTier : change.newTier,
      hidden_mmr: change.newHiddenMmr,
      placement_matches_left: newPlacementLeft,
      rank_shield: Math.max(0, newShield),
      daily_loss_forgiven: change.lossForgivenUsed ? true : player.dailyLossForgiven,
      total_games: getSupabase().rpc as unknown as number, // incrémenté via trigger SQL
      wins: change.newSR > player.currentSR || winnerTeam === player.team ? getSupabase().rpc as unknown as number : undefined,
    }).eq('id', change.playerId);

    await getSupabase().from('match_players').update({
      sr_change: change.delta,
      is_mvp: change.isMvp,
    }).eq('match_id', matchId).eq('player_id', change.playerId);
  }));
}

export default router;
