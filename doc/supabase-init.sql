-- =========================================================
-- Ranked Baby Foot — Script d'initialisation Supabase
-- À exécuter dans l'éditeur SQL du dashboard Supabase
-- =========================================================

-- Table players
CREATE TABLE IF NOT EXISTS players (
  id                      uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                text UNIQUE NOT NULL,
  avatar_url              text,
  rank_points             integer DEFAULT 0 NOT NULL,
  rank                    text DEFAULT 'Bronze' NOT NULL
                            CHECK (rank IN ('Bronze','Silver','Gold','Platinum','Diamond','Crimson','Iridescent')),
  rank_tier               integer DEFAULT 1 NOT NULL CHECK (rank_tier BETWEEN 1 AND 3),
  hidden_mmr              integer DEFAULT 0 NOT NULL,
  placement_matches_left  integer DEFAULT 5 NOT NULL,
  preferred_position      text DEFAULT 'both' CHECK (preferred_position IN ('attacker','goalkeeper','both')),
  total_games             integer DEFAULT 0 NOT NULL,
  wins                    integer DEFAULT 0 NOT NULL,
  losses                  integer DEFAULT 0 NOT NULL,
  goals_scored            integer DEFAULT 0 NOT NULL,
  mvp_count               integer DEFAULT 0 NOT NULL,
  rank_shield             integer DEFAULT 0 NOT NULL,
  daily_loss_forgiven     boolean DEFAULT false NOT NULL,
  created_at              timestamptz DEFAULT now() NOT NULL,
  updated_at              timestamptz DEFAULT now() NOT NULL
);

-- Table matches
CREATE TABLE IF NOT EXISTS matches (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text UNIQUE NOT NULL,
  name            text,
  host_id         uuid REFERENCES players(id) ON DELETE SET NULL,
  referee_id      uuid REFERENCES players(id) ON DELETE SET NULL,
  status          text DEFAULT 'lobby' NOT NULL
                    CHECK (status IN ('lobby','in_progress','finished','cancelled')),
  score_target    integer DEFAULT 10 NOT NULL CHECK (score_target BETWEEN 3 AND 20),
  score_team_a    integer DEFAULT 0 NOT NULL,
  score_team_b    integer DEFAULT 0 NOT NULL,
  winner_team     text CHECK (winner_team IN ('A','B','draw')),
  created_at      timestamptz DEFAULT now() NOT NULL,
  started_at      timestamptz,
  finished_at     timestamptz
);

-- Table match_players
CREATE TABLE IF NOT EXISTS match_players (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id      uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  player_id     uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  team          text NOT NULL CHECK (team IN ('A','B')),
  position      text NOT NULL CHECK (position IN ('attacker','goalkeeper')),
  goals_scored  integer DEFAULT 0 NOT NULL,
  is_mvp        boolean DEFAULT false NOT NULL,
  sr_change     integer, -- null jusqu'à la fin du match
  joined_at     timestamptz DEFAULT now() NOT NULL,
  UNIQUE (match_id, player_id),
  UNIQUE (match_id, team, position) -- 1 attaquant + 1 gardien max par équipe
);

-- Table match_events
CREATE TABLE IF NOT EXISTS match_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id        uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  event_type      text NOT NULL CHECK (event_type IN ('goal','goal_cancelled')),
  team            text NOT NULL CHECK (team IN ('A','B')),
  scorer_id       uuid REFERENCES players(id) ON DELETE SET NULL,
  scorer_position text CHECK (scorer_position IN ('attacker','goalkeeper')),
  created_at      timestamptz DEFAULT now() NOT NULL,
  created_by      uuid REFERENCES players(id) ON DELETE SET NULL
);

-- Table invitations
CREATE TABLE IF NOT EXISTS invitations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id    uuid REFERENCES matches(id) ON DELETE CASCADE NOT NULL,
  inviter_id  uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  invited_id  uuid REFERENCES players(id) ON DELETE CASCADE NOT NULL,
  status      text DEFAULT 'pending' NOT NULL
                CHECK (status IN ('pending','accepted','declined','expired')),
  created_at  timestamptz DEFAULT now() NOT NULL,
  expires_at  timestamptz NOT NULL
);

-- =========================================================
-- Row Level Security (RLS)
-- =========================================================

ALTER TABLE players        ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_players   ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations     ENABLE ROW LEVEL SECURITY;

-- players : lecture publique, écriture sur son propre profil uniquement
CREATE POLICY "players_read_all"   ON players FOR SELECT USING (true);
CREATE POLICY "players_insert_own" ON players FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "players_update_own" ON players FOR UPDATE USING (auth.uid() = id);

-- matches : lecture publique, création authentifiée
CREATE POLICY "matches_read_all"  ON matches FOR SELECT USING (true);
CREATE POLICY "matches_insert"    ON matches FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
-- UPDATE/DELETE via service_role uniquement (API Express)

-- match_players : lecture publique, tout le reste via service_role
CREATE POLICY "match_players_read_all" ON match_players FOR SELECT USING (true);

-- match_events : lecture publique, tout le reste via service_role
CREATE POLICY "match_events_read_all" ON match_events FOR SELECT USING (true);

-- invitations : visible par l'invité et l'inviteur
CREATE POLICY "invitations_read" ON invitations FOR SELECT
  USING (auth.uid() = invited_id OR auth.uid() = inviter_id);

-- =========================================================
-- Triggers
-- =========================================================

-- Mise à jour de updated_at sur players
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER players_updated_at
  BEFORE UPDATE ON players
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fonction utilitaire : rang depuis les SR
CREATE OR REPLACE FUNCTION get_rank_from_sr(sr integer)
RETURNS text AS $$
BEGIN
  IF sr >= 4500 THEN RETURN 'Iridescent';
  ELSIF sr >= 3000 THEN RETURN 'Crimson';
  ELSIF sr >= 2000 THEN RETURN 'Diamond';
  ELSIF sr >= 1200 THEN RETURN 'Platinum';
  ELSIF sr >= 700  THEN RETURN 'Gold';
  ELSIF sr >= 300  THEN RETURN 'Silver';
  ELSE RETURN 'Bronze';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Fonction utilitaire : tier depuis les SR
CREATE OR REPLACE FUNCTION get_tier_from_sr(sr integer)
RETURNS integer AS $$
DECLARE
  rank text := get_rank_from_sr(sr);
  tier_size integer;
  rank_min integer;
BEGIN
  IF rank = 'Iridescent' THEN RETURN 1; END IF;
  rank_min := CASE rank
    WHEN 'Bronze'   THEN 0
    WHEN 'Silver'   THEN 300
    WHEN 'Gold'     THEN 700
    WHEN 'Platinum' THEN 1200
    WHEN 'Diamond'  THEN 2000
    WHEN 'Crimson'  THEN 3000
  END;
  tier_size := CASE rank
    WHEN 'Bronze'   THEN 100  -- 300/3
    WHEN 'Silver'   THEN 133  -- 400/3
    WHEN 'Gold'     THEN 166  -- 500/3
    WHEN 'Platinum' THEN 266  -- 800/3
    WHEN 'Diamond'  THEN 333  -- 1000/3
    WHEN 'Crimson'  THEN 500  -- 1500/3
  END;
  RETURN LEAST(3, FLOOR((sr - rank_min) / tier_size) + 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =========================================================
-- Realtime
-- =========================================================

ALTER PUBLICATION supabase_realtime ADD TABLE matches;
ALTER PUBLICATION supabase_realtime ADD TABLE match_players;
ALTER PUBLICATION supabase_realtime ADD TABLE match_events;
ALTER PUBLICATION supabase_realtime ADD TABLE invitations;

-- =========================================================
-- Cron : reset daily_loss_forgiven chaque nuit à minuit
-- (nécessite pg_cron activé dans les extensions Supabase)
-- =========================================================

-- SELECT cron.schedule(
--   'reset-daily-loss-forgiven',
--   '0 0 * * *',
--   $$ UPDATE players SET daily_loss_forgiven = false $$
-- );
