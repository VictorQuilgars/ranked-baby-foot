'use client';

import { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Copy, LogOut, Play, Shield, Star, Swords, Trophy, Users } from 'lucide-react';
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
  winner_team: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
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

const TEAM_ACCENT: Record<Team, string> = { A: '#00b4d8', B: '#e94560' };

async function getAccessToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function MatchLobbyClient({ match: initialMatch, currentUserId }: MatchLobbyClientProps) {
  const router = useRouter();
  const [match, setMatch] = useState<MatchLobby>(initialMatch);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Sync server data after router.refresh()
  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-${initialMatch.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'matches',
        filter: `id=eq.${initialMatch.id}`,
      }, (payload) => {
        setMatch(prev => ({
          ...prev,
          status: payload.new.status,
          score_team_a: payload.new.score_team_a,
          score_team_b: payload.new.score_team_b,
          winner_team: payload.new.winner_team ?? null,
          finished_at: payload.new.finished_at ?? null,
        }));
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'match_players',
        filter: `match_id=eq.${initialMatch.id}`,
      }, () => {
        router.refresh();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [initialMatch.id, router]);

  const currentPlayer = match.match_players.find((e) => e.player_id === currentUserId) ?? null;
  const isHost = match.host_id === currentUserId;
  const canStart = isHost && match.status === 'lobby' && match.match_players.length === 4;
  const canRecordGoal = match.status === 'in_progress' &&
    (!match.referee_id || match.referee_id === currentUserId);

  const teamAPlayers = match.match_players.filter((p) => p.team === 'A');
  const teamBPlayers = match.match_players.filter((p) => p.team === 'B');

  function handleAction(action: () => Promise<void>) {
    setError(null);
    setFeedback(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action impossible');
      }
    });
  }

  function joinSlot(team: Team, position: Position) {
    handleAction(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Session introuvable, reconnecte-toi.');
      await apiRequest(`/api/matches/${match.id}/join`, { method: 'POST', token, body: { team, position } });
    });
  }

  function leaveMatch() {
    handleAction(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Session introuvable, reconnecte-toi.');
      await apiRequest(`/api/matches/${match.id}/leave`, { method: 'POST', token });
    });
  }

  function startMatch() {
    handleAction(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Session introuvable, reconnecte-toi.');
      await apiRequest(`/api/matches/${match.id}/start`, { method: 'POST', token });
    });
  }

  function recordGoal(team: Team) {
    handleAction(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Session introuvable, reconnecte-toi.');
      await apiRequest(`/api/matches/${match.id}/goal`, { method: 'POST', token, body: { team } });
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

  // ─── FINISHED VIEW ─────────────────────────────────────────────────────────
  if (match.status === 'finished') {
    const isDraw = match.winner_team === 'draw';
    const winner = match.winner_team as Team | 'draw' | null;
    const winnerAccent = !isDraw && winner && winner !== 'draw' ? TEAM_ACCENT[winner as Team] : '#f5a623';

    return (
      <div
        className="min-h-screen flex flex-col pb-28 relative overflow-hidden"
        style={{ background: '#0d111e' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 45% at 50% 15%, ${winnerAccent}20 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 px-5 pt-10 flex flex-col gap-4">
          {/* Winner banner */}
          <motion.div
            className="rounded-[28px] p-6 text-center"
            style={{
              background: `linear-gradient(145deg, ${winnerAccent}18, ${winnerAccent}06)`,
              border: `1px solid ${winnerAccent}44`,
            }}
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
          >
            <Trophy size={36} style={{ color: winnerAccent }} className="mx-auto mb-3" />
            <p className="text-[10px] font-black uppercase tracking-[0.4em] mb-2" style={{ color: `${winnerAccent}99` }}>
              Résultat final
            </p>
            <h1 className="text-2xl font-black text-white uppercase tracking-wide mb-1">
              {isDraw ? 'Match nul' : `Victoire Équipe ${winner}`}
            </h1>
            <p className="text-5xl font-black mt-3" style={{ color: winnerAccent }}>
              {match.score_team_a} — {match.score_team_b}
            </p>
          </motion.div>

          {/* SR Results */}
          <motion.div
            className="rounded-[28px] p-5"
            style={{
              background: 'rgba(22,33,62,0.9)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <h2 className="text-[10px] font-black uppercase tracking-[0.35em] text-muted mb-4">Résultats SR</h2>

            {(['A', 'B'] as Team[]).map((team) => {
              const players = team === 'A' ? teamAPlayers : teamBPlayers;
              const accent = TEAM_ACCENT[team];
              const isWinner = !isDraw && winner === team;
              return (
                <div key={team} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${accent}44, transparent)` }} />
                    <span className="text-[10px] font-black uppercase tracking-[0.3em]" style={{ color: accent }}>
                      Équipe {team}{isWinner ? ' · Vainqueur' : ''}
                    </span>
                    <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, transparent, ${accent}44)` }} />
                  </div>
                  {players.map((entry) => {
                    const p = entry.players;
                    const delta = entry.sr_change;
                    return (
                      <div
                        key={entry.player_id}
                        className="flex items-center gap-3 py-3 border-b last:border-b-0"
                        style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                      >
                        {p ? (
                          <RankBadge
                            rank={p.rank}
                            tier={p.rank_tier}
                            size="sm"
                            showLabel={false}
                            isPlacement={p.placement_matches_left > 0}
                            animated={false}
                          />
                        ) : (
                          <div className="w-9 h-9 rounded-2xl bg-white/5" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="font-black text-white text-sm truncate">{p?.username ?? '—'}</p>
                            {entry.is_mvp && (
                              <span
                                className="flex items-center gap-0.5 text-[10px] font-black uppercase tracking-wide"
                                style={{ color: '#f5a623' }}
                              >
                                <Star size={10} fill="#f5a623" />MVP
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-muted">
                            {entry.position === 'attacker' ? 'Attaquant' : 'Gardien'} · {entry.goals_scored} but{entry.goals_scored !== 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="text-right">
                          {delta !== null ? (
                            <p
                              className="text-sm font-black"
                              style={{ color: delta >= 0 ? '#4ade80' : '#f87171' }}
                            >
                              {delta >= 0 ? '+' : ''}{delta} SR
                            </p>
                          ) : (
                            <p className="text-xs text-muted">Calcul…</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>

          {/* Back button */}
          <motion.button
            onClick={() => router.push('/home')}
            className="btn-cr-dark justify-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            Retour à l'accueil
          </motion.button>
        </div>
      </div>
    );
  }

  // ─── IN-PROGRESS VIEW ──────────────────────────────────────────────────────
  if (match.status === 'in_progress') {
    return (
      <div
        className="min-h-screen flex flex-col pb-28 relative overflow-hidden"
        style={{ background: '#0d111e' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 40% at 25% 10%, #00b4d820 0%, transparent 60%), radial-gradient(ellipse 70% 40% at 75% 10%, #e9456020 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 px-5 pt-8 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-[10px] font-black uppercase tracking-[0.45em]"
                style={{ color: '#e94560aa' }}
              >
                ★ En cours ★
              </p>
              <h1 className="text-lg font-black text-white mt-0.5">
                {match.name ?? `Match ${match.code}`}
              </h1>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded-2xl border border-white/10 bg-white/6 px-3 py-2 text-xs font-bold text-white"
            >
              <Copy size={14} />
              {match.code}
            </button>
          </div>

          {/* Score board */}
          <motion.div
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
            <div className="flex items-center justify-between gap-2">
              {/* Team A */}
              <div className="flex-1 text-center">
                <p
                  className="text-[10px] font-black uppercase tracking-[0.35em] mb-2"
                  style={{ color: '#00b4d8' }}
                >
                  Équipe A
                </p>
                <motion.p
                  key={match.score_team_a}
                  className="text-7xl font-black leading-none"
                  style={{ color: '#00b4d8', filter: 'drop-shadow(0 0 20px #00b4d880)' }}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {match.score_team_a}
                </motion.p>
                <div className="mt-2 space-y-0.5">
                  {teamAPlayers.map((entry) => (
                    <p key={entry.player_id} className="text-xs text-muted truncate">
                      {entry.players?.username ?? '—'}
                    </p>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="flex flex-col items-center gap-1 shrink-0">
                <p className="text-2xl font-black text-white/20">vs</p>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-muted">
                  /{match.score_target}
                </p>
              </div>

              {/* Team B */}
              <div className="flex-1 text-center">
                <p
                  className="text-[10px] font-black uppercase tracking-[0.35em] mb-2"
                  style={{ color: '#e94560' }}
                >
                  Équipe B
                </p>
                <motion.p
                  key={match.score_team_b}
                  className="text-7xl font-black leading-none"
                  style={{ color: '#e94560', filter: 'drop-shadow(0 0 20px #e9456080)' }}
                  initial={{ scale: 1.4 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.25, ease: 'easeOut' }}
                >
                  {match.score_team_b}
                </motion.p>
                <div className="mt-2 space-y-0.5">
                  {teamBPlayers.map((entry) => (
                    <p key={entry.player_id} className="text-xs text-muted truncate">
                      {entry.players?.username ?? '—'}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress bars */}
            <div className="mt-5 grid grid-cols-2 gap-2">
              {(['A', 'B'] as Team[]).map((team) => {
                const score = team === 'A' ? match.score_team_a : match.score_team_b;
                const pct = Math.min(100, (score / match.score_target) * 100);
                const accent = TEAM_ACCENT[team];
                return (
                  <div key={team} className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: accent }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                    />
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Goal buttons */}
          {canRecordGoal ? (
            <motion.div
              className="grid grid-cols-2 gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              {(['A', 'B'] as Team[]).map((team) => {
                const accent = TEAM_ACCENT[team];
                const darkAccent = team === 'A' ? '#006e85' : '#9e1e35';
                return (
                  <button
                    key={team}
                    type="button"
                    onClick={() => recordGoal(team)}
                    disabled={isPending}
                    className="flex flex-col items-center justify-center rounded-[24px] py-5 font-black text-white transition-all active:scale-95 disabled:opacity-50"
                    style={{
                      background: `linear-gradient(145deg, ${accent}, ${accent}cc)`,
                      boxShadow: `0 6px 0 ${darkAccent}`,
                    }}
                  >
                    <span className="text-3xl leading-none mb-1">+</span>
                    <span className="text-xs uppercase tracking-[0.3em]">But {team}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : (
            <p className="text-sm text-muted text-center">
              {match.referee_id
                ? "Seul l'arbitre peut enregistrer les buts."
                : "En attente d'un but…"}
            </p>
          )}

          {feedback && <p className="text-sm font-medium text-green-400 text-center">{feedback}</p>}
          {error && <p className="text-sm font-medium text-red-400 text-center">{error}</p>}
        </div>
      </div>
    );
  }

  // ─── LOBBY VIEW ─────────────────────────────────────────────────────────────
  const isLobby = match.status === 'lobby';

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
              Statut: <span className="font-bold text-white">{isLobby ? 'Lobby' : 'En cours'}</span>
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
                        {currentPlayer ? 'Quitte d'abord ton slot actuel pour changer.' : 'Le match doit être en lobby pour rejoindre.'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
