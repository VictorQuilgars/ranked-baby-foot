-- Migration: système de vote pour les buts sans arbitre
-- Les deux équipes doivent valider (au moins 1 joueur par équipe)

-- 1. Ajouter status sur match_events
--    'confirmed' = validé (immédiat si arbitre, ou après consensus)
--    'pending'   = en attente de validation des deux équipes
--    'cancelled' = rejeté ou timeout
ALTER TABLE match_events
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('pending', 'confirmed', 'cancelled'));

-- 2. Table des votes pour les buts en attente
CREATE TABLE IF NOT EXISTS goal_votes (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES match_events ON DELETE CASCADE,
  player_id  uuid NOT NULL REFERENCES players,
  team       text NOT NULL CHECK (team IN ('A', 'B')),
  vote       text NOT NULL CHECK (vote IN ('confirm', 'reject')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, player_id)
);

-- 3. Activer Realtime sur goal_votes
ALTER PUBLICATION supabase_realtime ADD TABLE goal_votes;

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_goal_votes_event_id ON goal_votes (event_id);
CREATE INDEX IF NOT EXISTS idx_match_events_match_status ON match_events (match_id, status);
