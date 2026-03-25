'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Copy, LogOut, Play, Shield, Swords, Users } from 'lucide-react';
import { RankBadge } from '@/components/rank/RankBadge';
import { apiRequest } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { cn } from '@/lib/utils';
import type { RankName } from '@/types/player';

type Team = 'A' | 'B';
type Position = 'attacker' | 'goalkeeper';

export type LobbyPlayer = {
  id: string;
  team: Team;
  position: Position;
  player_id: string;
  goals_scored: number;
  is_mvp: boolean;
  sr_change: number | null;
  players: {
    id: string;
    username: string;
    avatar_url: string | null;
    rank: RankName;
    rank_tier: number;
    placement_matches_left: number;
  } | null;
};

export type MatchLobby = {
  id: string;
  code: string;
  name: string | null;
  host_id: string | null;
  referee_id: string | null;
  status: 'lobby' | 'in_progress' | 'finished' | 'cancelled';
  score_target: number;
  score_team_a: number;
  score_team_b: number;
  created_at: string;
  started_at: string | null;
  match_players: LobbyPlayer[];
};

type MatchLobbyClientProps = {
  match: MatchLobby;
  currentUserId: string;
};

const SLOT_ORDER: Array<{ team: Team; position: Position; label: string; accent: string }> = [
  { team: 'A', position: 'attacker', label: 'A · Attaquant', accent: '#00b4d8' },
  { team: 'A', position: 'goalkeeper', label: 'A · Gardien', accent: '#00b4d8' },
  { team: 'B', position: 'attacker', label: 'B · Attaquant', accent: '#e94560' },
  { team: 'B', position: 'goalkeeper', label: 'B · Gardien', accent: '#e94560' },
];

async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token ?? null;
}

export function MatchLobbyClient({ match, currentUserId }: MatchLobbyClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const currentPlayer = match.match_players.find((entry) => entry.player_id === currentUserId) ?? null;
  const isHost = match.host_id === currentUserId;
  const isLobby = match.status === 'lobby';
  const canStart = isHost && isLobby && match.match_players.length === 4;

  function handleAction(action: () => Promise<void>) {
    setError(null);
    setFeedback(null);

    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : 'Action impossible');
      }
    });
  }

  function joinSlot(team: Team, position: Position) {
    handleAction(async () => {
      const token = await getAccessToken();

      if (!token) {
        throw new Error('Session introuvable, reconnecte-toi.');
      }

      await apiRequest(`/api/matches/${match.id}/join`, {
        method: 'POST',
        token,
        body: { team, position },
      });
    });
  }

  function leaveMatch() {
    handleAction(async () => {
      const token = await getAccessToken();

      if (!token) {
        throw new Error('Session introuvable, reconnecte-toi.');
      }

      await apiRequest(`/api/matches/${match.id}/leave`, {
        method: 'POST',
        token,
      });
    });
  }

  function startMatch() {
    handleAction(async () => {
      const token = await getAccessToken();

      if (!token) {
        throw new Error('Session introuvable, reconnecte-toi.');
      }

      await apiRequest(`/api/matches/${match.id}/start`, {
        method: 'POST',
        token,
      });

      setFeedback('Match démarré. L’interface de score arrive au prochain lot.');
    });
  }

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(match.code);
      setFeedback('Code copié.');
      setError(null);
    } catch {
      setError('Impossible de copier le code.');
    }
  }

  return (
    <div
      className="min-h-screen px-5 pt-10 pb-28"
      style={{
        background:
          'radial-gradient(circle at top, rgba(0,180,216,0.12) 0%, rgba(233,69,96,0.14) 18%, rgba(15,52,96,0.35) 32%, #1a1a2e 72%)',
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
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Match</p>
            <h1 className="mt-2 truncate text-3xl font-black text-white">
              {match.name ?? `Lobby ${match.code}`}
            </h1>
            <p className="mt-2 text-sm text-muted">
              Statut: <span className="font-bold text-white">{match.status === 'lobby' ? 'Lobby' : match.status === 'in_progress' ? 'En cours' : 'Terminé'}</span>
            </p>
          </div>

          <button
            type="button"
            onClick={copyCode}
            className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-bold text-white transition-all"
          >
            <Copy size={16} />
            {match.code}
          </button>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3">
          {[
            { label: 'Joueurs', value: `${match.match_players.length}/4`, icon: Users },
            { label: 'Objectif', value: `${match.score_target}`, icon: Swords },
            { label: 'Score', value: `${match.score_team_a} - ${match.score_team_b}`, icon: Shield },
          ].map(({ label, value, icon: Icon }) => (
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
                <Icon size={16} className="text-white/70" />
              </div>
              <p className="mt-3 text-2xl font-black text-white">{value}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-3">
          {isLobby && !currentPlayer ? (
            <p className="text-sm text-muted">Choisis un slot libre pour rejoindre la partie.</p>
          ) : null}
          {currentPlayer ? (
            <button
              type="button"
              onClick={leaveMatch}
              disabled={!isLobby || isPending}
              className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/6 px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50"
            >
              <LogOut size={16} />
              Quitter le lobby
            </button>
          ) : null}
          {isHost ? (
            <button
              type="button"
              onClick={startMatch}
              disabled={!canStart || isPending}
              className="inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all disabled:opacity-50"
              style={{
                background: 'linear-gradient(135deg, #e94560, #c73652)',
                boxShadow: canStart ? '0 12px 26px rgba(233,69,96,0.28)' : 'none',
              }}
            >
              <Play size={16} />
              Démarrer le match
            </button>
          ) : null}
        </div>

        {feedback ? <p className="mt-4 text-sm font-medium text-green-400">{feedback}</p> : null}
        {error ? <p className="mt-4 text-sm font-medium text-red-400">{error}</p> : null}
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
            <h2 className="text-lg font-black text-white">Composition</h2>
            <p className="text-xs text-muted">1 attaquant + 1 gardien par équipe</p>
          </div>
          {currentPlayer ? (
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-accent">
              Tu es placé en {currentPlayer.team} · {currentPlayer.position === 'attacker' ? 'Attaquant' : 'Gardien'}
            </p>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {SLOT_ORDER.map((slot) => {
            const occupant = match.match_players.find(
              (entry) => entry.team === slot.team && entry.position === slot.position
            );
            const isCurrentSlot = occupant?.player_id === currentUserId;
            const canJoinSlot = isLobby && !occupant && !currentPlayer;

            return (
              <div
                key={`${slot.team}-${slot.position}`}
                className="rounded-3xl px-4 py-4"
                style={{
                  background: `linear-gradient(135deg, ${slot.accent}16, rgba(255,255,255,0.03))`,
                  border: `1px solid ${slot.accent}33`,
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-black text-white">{slot.label}</p>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: slot.accent }}>
                    {slot.position === 'attacker' ? 'ATK' : 'GK'}
                  </span>
                </div>

                {occupant?.players ? (
                  <div className="mt-4 flex items-center gap-3">
                    {occupant.players.avatar_url ? (
                      <img
                        src={occupant.players.avatar_url}
                        alt={occupant.players.username}
                        className="h-12 w-12 rounded-2xl object-cover"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-night-3 text-lg font-black text-white">
                        {occupant.players.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-white">{occupant.players.username}</p>
                      <div className="mt-2 flex items-center gap-2">
                        <RankBadge
                          rank={occupant.players.rank}
                          tier={occupant.players.rank_tier}
                          size="sm"
                          showLabel={false}
                          isPlacement={occupant.players.placement_matches_left > 0}
                          animated={false}
                        />
                        {isCurrentSlot ? (
                          <span className="text-[11px] font-semibold uppercase tracking-[0.2em] text-accent">Toi</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <p className="text-sm text-muted">Slot libre</p>
                    {canJoinSlot ? (
                      <button
                        type="button"
                        onClick={() => joinSlot(slot.team, slot.position)}
                        disabled={isPending}
                        className={cn(
                          'mt-3 inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-bold text-white transition-all',
                          isPending && 'opacity-60'
                        )}
                        style={{
                          background: `linear-gradient(135deg, ${slot.accent}, ${slot.accent}cc)`,
                        }}
                      >
                        <Users size={16} />
                        Rejoindre ce slot
                      </button>
                    ) : (
                      <p className="mt-3 text-xs text-muted">
                        {currentPlayer ? 'Quitte d’abord ton slot actuel pour changer.' : 'Le match doit être en lobby pour rejoindre.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.section>

      {match.status !== 'lobby' ? (
        <motion.section
          className="mt-5 rounded-[32px] p-5"
          style={{
            background: 'linear-gradient(180deg, rgba(12,18,33,0.98), rgba(22,33,62,0.9))',
            border: '1px solid rgba(255,255,255,0.06)',
          }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12, duration: 0.4 }}
        >
          <h2 className="text-lg font-black text-white">Suite du match</h2>
          <p className="mt-2 text-sm text-muted">
            Le lobby est prêt. L’interface de score et d’arbitrage sera livrée dans le prochain lot.
          </p>
        </motion.section>
      ) : null}
    </div>
  );
}
