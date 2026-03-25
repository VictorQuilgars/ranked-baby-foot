'use client';

import { useState, useTransition } from 'react';
import { motion } from 'framer-motion';
import { Save, Shield, Star, Target, TrendingUp } from 'lucide-react';
import { RankBadge } from '@/components/rank/RankBadge';
import { SRBar } from '@/components/rank/SRBar';
import { apiRequest } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import type { RankName } from '@/types/player';

type PreferredPosition = 'attacker' | 'goalkeeper' | 'both';

type PlayerProfile = {
  id: string;
  username: string;
  avatar_url: string | null;
  rank_points: number;
  rank: RankName;
  rank_tier: number;
  placement_matches_left: number;
  preferred_position: PreferredPosition;
  total_games: number;
  wins: number;
  losses: number;
  goals_scored: number;
  mvp_count: number;
  rank_shield: number;
};

type MatchHistoryItem = {
  id: string;
  team: 'A' | 'B';
  position: PreferredPosition;
  goals_scored: number;
  is_mvp: boolean;
  sr_change: number | null;
  joined_at: string;
  matches: {
    id: string;
    code: string;
    name: string | null;
    score_team_a: number;
    score_team_b: number;
    winner_team: 'A' | 'B' | 'draw' | null;
    finished_at: string | null;
  } | null;
};

type ProfileClientProps = {
  initialPlayer: PlayerProfile;
  history: MatchHistoryItem[];
};

const POSITION_OPTIONS: Array<{ value: PreferredPosition; label: string }> = [
  { value: 'attacker', label: 'Attaquant' },
  { value: 'goalkeeper', label: 'Gardien' },
  { value: 'both', label: 'Les deux' },
];

function getPreferredPositionLabel(position: PreferredPosition) {
  return POSITION_OPTIONS.find((option) => option.value === position)?.label ?? 'Les deux';
}

function getWinRate(player: PlayerProfile) {
  if (player.total_games === 0) return 0;
  return Math.round((player.wins / player.total_games) * 100);
}

function getHistoryOutcome(entry: MatchHistoryItem) {
  const match = entry.matches;

  if (!match?.winner_team) {
    return { label: 'Incomplet', color: '#a8a8b3' };
  }

  if (match.winner_team === 'draw') {
    return { label: 'Égalité', color: '#f5a623' };
  }

  return match.winner_team === entry.team
    ? { label: 'Victoire', color: '#22c55e' }
    : { label: 'Défaite', color: '#ef4444' };
}

function formatSignedSr(value: number | null) {
  if (value === null) return 'En attente';
  if (value > 0) return `+${value} SR`;
  if (value < 0) return `${value} SR`;
  return '0 SR';
}

export function ProfileClient({ initialPlayer, history }: ProfileClientProps) {
  const [player, setPlayer] = useState(initialPlayer);
  const [username, setUsername] = useState(initialPlayer.username);
  const [preferredPosition, setPreferredPosition] = useState<PreferredPosition>(
    initialPlayer.preferred_position
  );
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isPlacement = player.placement_matches_left > 0;

  function saveProfile() {
    setFeedback(null);
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setError('Session introuvable, reconnecte-toi.');
        return;
      }

      try {
        const response = await apiRequest<{ data: PlayerProfile }>('/api/players/me', {
          method: 'PUT',
          token,
          body: {
            username: username.trim(),
            preferredPosition,
          },
        });

        setPlayer(response.data);
        setUsername(response.data.username);
        setPreferredPosition(response.data.preferred_position);
        setFeedback('Profil mis à jour.');
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : 'Mise à jour impossible');
      }
    });
  }

  return (
    <div
      className="min-h-screen px-5 pt-10 pb-28"
      style={{
        background:
          'radial-gradient(circle at top, rgba(123,47,255,0.18) 0%, rgba(15,52,96,0.42) 24%, #1a1a2e 72%)',
      }}
    >
      <motion.section
        className="rounded-[32px] p-6"
        style={{
          background: 'linear-gradient(145deg, rgba(22,33,62,0.96), rgba(15,52,96,0.9))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Profil Joueur</p>
            <h1 className="mt-2 truncate text-3xl font-black text-white">{player.username}</h1>
            <p className="mt-2 text-sm text-muted">
              Position préférée: {getPreferredPositionLabel(player.preferred_position)}
            </p>
          </div>

          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.username}
              className="h-16 w-16 rounded-3xl border-2 border-white/10 object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-night-3 text-2xl font-black text-accent">
              {player.username.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>

        <div className="mt-6 flex flex-col items-center gap-4 rounded-[28px] px-5 py-6" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <RankBadge
            rank={player.rank}
            tier={player.rank_tier}
            size="xl"
            showLabel={true}
            isPlacement={isPlacement}
          />

          {!isPlacement ? (
            <div className="w-full max-w-sm">
              <SRBar sr={player.rank_points} rank={player.rank} tier={player.rank_tier} />
            </div>
          ) : (
            <p className="text-center text-sm text-muted">
              {player.placement_matches_left} match{player.placement_matches_left > 1 ? 's' : ''} de placement restant{player.placement_matches_left > 1 ? 's' : ''}
            </p>
          )}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          {[
            { label: 'Winrate', value: `${getWinRate(player)}%`, icon: TrendingUp, color: '#22c55e' },
            { label: 'Buts', value: player.goals_scored, icon: Target, color: '#f5a623' },
            { label: 'MVP', value: player.mvp_count, icon: Star, color: '#7b2fff' },
            { label: 'Bouclier', value: player.placement_matches_left > 0 ? 'Placement' : player.rank_shield, icon: Shield, color: '#e94560' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-3xl px-4 py-4"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs uppercase tracking-[0.24em] text-muted">{label}</span>
                <Icon size={16} style={{ color }} />
              </div>
              <p className="mt-3 text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>
      </motion.section>

      <motion.section
        className="mt-5 rounded-[32px] p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(12,18,33,0.98), rgba(22,33,62,0.9))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-black text-white">Modifier mon profil</h2>
            <p className="text-xs text-muted">Pseudo unique et rôle préféré</p>
          </div>
          <button
            type="button"
            onClick={saveProfile}
            disabled={isPending}
            className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #e94560, #c73652)',
              boxShadow: '0 10px 24px rgba(233,69,96,0.28)',
            }}
          >
            <Save size={16} />
            {isPending ? 'Sauvegarde...' : 'Sauvegarder'}
          </button>
        </div>

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Pseudo</span>
            <input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              maxLength={20}
              className="rounded-2xl border border-white/10 bg-night-2 px-4 py-3 text-white outline-none transition focus:border-accent"
              placeholder="ton_pseudo"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Position préférée</span>
            <div className="grid grid-cols-3 gap-2">
              {POSITION_OPTIONS.map((option) => {
                const isActive = preferredPosition === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPreferredPosition(option.value)}
                    className="rounded-2xl px-3 py-3 text-sm font-bold transition-all"
                    style={{
                      background: isActive ? 'linear-gradient(135deg, #7b2fff, #5822d8)' : 'rgba(255,255,255,0.04)',
                      border: isActive ? '1px solid rgba(123,47,255,0.5)' : '1px solid rgba(255,255,255,0.08)',
                      color: '#ffffff',
                    }}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>

          {feedback ? <p className="text-sm font-medium text-green-400">{feedback}</p> : null}
          {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}
        </div>
      </motion.section>

      <motion.section
        className="mt-5 rounded-[32px] p-5"
        style={{
          background: 'linear-gradient(180deg, rgba(12,18,33,0.98), rgba(22,33,62,0.9))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.16, duration: 0.4 }}
      >
        <div>
          <h2 className="text-lg font-black text-white">20 derniers matchs</h2>
          <p className="text-xs text-muted">Résultats, rôle, buts et variation de SR</p>
        </div>

        <div className="mt-4 flex flex-col gap-3">
          {history.length === 0 ? (
            <div
              className="rounded-3xl px-4 py-8 text-center"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
              }}
            >
              <p className="text-white font-bold">Aucun match pour le moment</p>
              <p className="mt-2 text-sm text-muted">Tes parties terminées apparaîtront ici.</p>
            </div>
          ) : (
            history.map((entry) => {
              const outcome = getHistoryOutcome(entry);
              const score = entry.matches
                ? `${entry.matches.score_team_a} - ${entry.matches.score_team_b}`
                : '--';

              return (
                <div
                  key={entry.id}
                  className="rounded-3xl px-4 py-4"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-white">
                        {entry.matches?.name ?? `Match ${entry.matches?.code ?? '—'}`}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted">
                        <span>Équipe {entry.team}</span>
                        <span>{getPreferredPositionLabel(entry.position)}</span>
                        <span>{entry.goals_scored} but{entry.goals_scored > 1 ? 's' : ''}</span>
                        {entry.is_mvp ? <span className="text-gold-ui">MVP</span> : null}
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-lg font-black text-white">{score}</p>
                      <p className="text-xs font-semibold" style={{ color: outcome.color }}>
                        {outcome.label}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between text-xs">
                    <span className="text-muted">
                      {entry.matches?.finished_at
                        ? new Date(entry.matches.finished_at).toLocaleDateString('fr-FR')
                        : 'Match non terminé'}
                    </span>
                    <span
                      className="font-black"
                      style={{
                        color:
                          entry.sr_change === null
                            ? '#a8a8b3'
                            : entry.sr_change >= 0
                              ? '#22c55e'
                              : '#ef4444',
                      }}
                    >
                      {formatSignedSr(entry.sr_change)}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </motion.section>
    </div>
  );
}
