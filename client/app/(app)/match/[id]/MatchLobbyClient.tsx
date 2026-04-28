'use client';

import { useState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Copy, LogOut, Pause, Play, PlayCircle, Shield, Square, Star, Swords, Trophy, Users, XCircle } from 'lucide-react';
import { ConfettiEffect } from '@/components/match/ConfettiEffect';
import { RankBadge } from '@/components/rank/RankBadge';
import { RankUpModal } from '@/components/rank/RankUpModal';
import { getRankFromSR } from '@/lib/services/rankService';
import { apiRequest } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { useMatch } from '@/hooks/useMatch';
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
    rank_points: number;
    placement_matches_left: number;
  } | null;
};

export type PendingGoal = {
  id: string;
  team: 'A' | 'B';
  scorer_id: string | null;
  created_at: string;
  goal_votes: Array<{
    player_id: string;
    team: string;
    vote: string;
  }>;
};

export type MatchLobby = {
  id: string;
  code: string;
  name: string | null;
  host_id: string | null;
  referee_id: string | null;
  status: 'lobby' | 'in_progress' | 'paused' | 'finished' | 'cancelled';
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
  pendingGoal: PendingGoal | null;
};

const SLOT_ORDER: Array<{ team: Team; position: Position; label: string; accent: string }> = [
  { team: 'A', position: 'attacker', label: 'ÉQUIPE A · ATK', accent: '#00b4d8' },
  { team: 'A', position: 'goalkeeper', label: 'ÉQUIPE A · GK', accent: '#00b4d8' },
  { team: 'B', position: 'attacker', label: 'ÉQUIPE B · ATK', accent: '#e94560' },
  { team: 'B', position: 'goalkeeper', label: 'ÉQUIPE B · GK', accent: '#e94560' },
];

const TEAM_ACCENT: Record<Team, string> = { A: '#00b4d8', B: '#e94560' };

async function getAccessToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function MatchLobbyClient({ match: initialMatch, currentUserId, pendingGoal }: MatchLobbyClientProps) {
  const router = useRouter();
  const { match } = useMatch(initialMatch);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [countdown, setCountdown] = useState<number | null>(null);
  const [showRankUp, setShowRankUp] = useState(false);
  const rankUpShownRef = useRef(false);

  const currentPlayer = match.match_players.find((e) => e.player_id === currentUserId) ?? null;
  const isHost = match.host_id === currentUserId;
  const isReferee = match.referee_id === currentUserId;
  const isHostOrReferee = isHost || isReferee;
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

  function pauseMatch() {
    handleAction(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Session introuvable, reconnecte-toi.');
      await apiRequest(`/api/matches/${match.id}/pause`, { method: 'POST', token });
    });
  }

  function resumeMatch() {
    handleAction(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Session introuvable, reconnecte-toi.');
      await apiRequest(`/api/matches/${match.id}/resume`, { method: 'POST', token });
    });
  }

  function finishMatch() {
    handleAction(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Session introuvable, reconnecte-toi.');
      await apiRequest(`/api/matches/${match.id}/finish`, { method: 'POST', token });
    });
  }

  function voteGoal(vote: 'confirm' | 'reject') {
    if (!pendingGoal) return;
    handleAction(async () => {
      const token = await getAccessToken();
      if (!token) throw new Error('Session introuvable, reconnecte-toi.');
      await apiRequest(`/api/matches/${match.id}/goal/vote`, {
        method: 'POST',
        token,
        body: { eventId: pendingGoal.id, vote },
      });
    });
  }

  // Compte à rebours 30s pour les buts en attente
  useEffect(() => {
    if (!pendingGoal) { setCountdown(null); return; }
    const expiresAt = new Date(pendingGoal.created_at).getTime() + 30_000;
    const tick = () => {
      const remaining = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) voteGoal('reject'); // auto-rejet à l'expiration
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingGoal?.id]);

  useEffect(() => {
    if (match.status !== 'finished' || rankUpShownRef.current) return;
    const myEntry = match.match_players.find((p) => p.player_id === currentUserId);
    if (!myEntry || myEntry.sr_change === null) return;
    const playerData = myEntry.players;
    if (!playerData) return;
    const currentSR = playerData.rank_points ?? 0;
    const oldSR = Math.max(0, currentSR - myEntry.sr_change);
    const { rank: oldRank } = getRankFromSR(oldSR);
    const rankOrder = ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond', 'Crimson', 'Iridescent'];
    const rankChanged = rankOrder.indexOf(playerData.rank) > rankOrder.indexOf(oldRank);
    if (rankChanged) {
      rankUpShownRef.current = true;
      const timeoutId = setTimeout(() => setShowRankUp(true), 1200);
      return () => clearTimeout(timeoutId);
    }
  }, [match.status, match.match_players, currentUserId]);

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
    const currentPlayerTeam = match.match_players.find(
      (p) => p.player_id === currentUserId
    )?.team ?? null;
    const isDraw = match.winner_team === 'draw';
    const winner = match.winner_team as Team | 'draw' | null;
    const winnerAccent = !isDraw && winner && winner !== 'draw' ? TEAM_ACCENT[winner as Team] : '#f5a623';

    return (
      <div
        className="min-h-screen flex flex-col pb-28 relative overflow-hidden"
        style={{ background: '#07080d' }}
      >
        <ConfettiEffect
          active={!isDraw && winner === currentPlayerTeam}
          color={winnerAccent}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 80% 45% at 50% 15%, ${winnerAccent}22 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 px-5 pt-10 flex flex-col gap-4">
          {/* Winner banner */}
          <motion.div
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: `1px solid rgba(255,255,255,0.06)`,
              borderLeft: `4px solid ${winnerAccent}`,
              borderRadius: 4,
              padding: '20px 20px 20px 18px',
            }}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Trophy size={20} style={{ color: winnerAccent }} />
              <p className="text-[9px] font-black uppercase tracking-[0.5em]" style={{ color: `${winnerAccent}99` }}>
                Résultat final
              </p>
            </div>
            <h1 className="text-2xl font-black text-white uppercase tracking-wide mb-1">
              {isDraw ? 'Match nul' : `Victoire Équipe ${winner}`}
            </h1>
            <p className="text-5xl font-black mt-3" style={{ color: winnerAccent }}>
              {match.score_team_a} — {match.score_team_b}
            </p>
          </motion.div>

          {/* SR Results */}
          <motion.div
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 4,
              padding: '20px',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
          >
            <h2 className="text-[9px] font-black uppercase tracking-[0.5em] text-muted mb-4">Résultats SR</h2>

            {(['A', 'B'] as Team[]).map((team) => {
              const players = team === 'A' ? teamAPlayers : teamBPlayers;
              const accent = TEAM_ACCENT[team];
              const isWinner = !isDraw && winner === team;
              return (
                <div key={team} className="mb-4 last:mb-0">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="h-px flex-1" style={{ background: `linear-gradient(90deg, ${accent}44, transparent)` }} />
                    <span className="text-[9px] font-black uppercase tracking-[0.5em]" style={{ color: accent }}>
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
                        style={{
                          borderColor: 'rgba(255,255,255,0.06)',
                          borderLeft: `3px solid ${accent}`,
                          paddingLeft: 10,
                          marginLeft: -2,
                        }}
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
                          <div className="w-9 h-9 bg-white/5" style={{ borderRadius: 2 }} />
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
            className="btn-cod-dark justify-center"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.4 }}
          >
            Retour à l&apos;accueil
          </motion.button>
        </div>

        <RankUpModal
          isOpen={showRankUp}
          newRank={(match.match_players.find((p) => p.player_id === currentUserId)?.players?.rank ?? 'Bronze') as RankName}
          newTier={match.match_players.find((p) => p.player_id === currentUserId)?.players?.rank_tier ?? 1}
          onClose={() => setShowRankUp(false)}
        />
      </div>
    );
  }

  // ─── PAUSED VIEW ───────────────────────────────────────────────────────────
  if (match.status === 'paused') {
    return (
      <div
        className="min-h-screen flex flex-col pb-28 relative overflow-hidden"
        style={{ background: '#07080d' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 40% at 50% 5%, #f5a62318 0%, transparent 60%)',
          }}
        />

        <div className="relative z-10 px-5 pt-8 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.5em]" style={{ color: '#f5a623aa' }}>
                ◆ Pause ◆
              </p>
              <h1 className="text-lg font-black text-white mt-0.5 uppercase tracking-wide">
                {match.name ?? `Match ${match.code}`}
              </h1>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white"
              style={{ borderRadius: 3, border: '1px solid rgba(255,255,255,0.10)', background: 'rgba(255,255,255,0.06)' }}
            >
              <Copy size={14} />
              {match.code}
            </button>
          </div>

          {/* Score */}
          <motion.div
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: '4px solid #f5a623',
              borderRadius: 4,
              padding: '24px',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-2" style={{ color: '#00b4d8' }}>Équipe A</p>
                <motion.span
                  key={`score-a-${match.score_team_a}`}
                  className="text-7xl font-black leading-none"
                  style={{ color: '#00b4d8', display: 'inline-block' }}
                  initial={{ scale: 1.5, color: '#f5a623' }}
                  animate={{ scale: 1, color: '#00b4d8' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  {match.score_team_a}
                </motion.span>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <Pause size={20} style={{ color: '#f5a623' }} />
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted">/{match.score_target}</p>
              </div>
              <div className="flex-1 text-center">
                <p className="text-[9px] font-black uppercase tracking-[0.5em] mb-2" style={{ color: '#e94560' }}>Équipe B</p>
                <motion.span
                  key={`score-b-${match.score_team_b}`}
                  className="text-7xl font-black leading-none"
                  style={{ color: '#e94560', display: 'inline-block' }}
                  initial={{ scale: 1.5, color: '#f5a623' }}
                  animate={{ scale: 1, color: '#e94560' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  {match.score_team_b}
                </motion.span>
              </div>
            </div>
          </motion.div>

          {/* Host controls */}
          {isHostOrReferee && (
            <motion.div
              className="flex flex-col gap-3"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              <button
                type="button"
                onClick={resumeMatch}
                disabled={isPending}
                className="btn-cod-red justify-center gap-2 w-full disabled:opacity-50"
              >
                <PlayCircle size={16} />
                Reprendre le match
              </button>
              <button
                type="button"
                onClick={finishMatch}
                disabled={isPending}
                className="btn-cod-dark justify-center gap-2 w-full disabled:opacity-50"
              >
                <Square size={16} />
                Terminer le match
              </button>
            </motion.div>
          )}

          {feedback && <p className="text-sm font-medium text-green-400 text-center">{feedback}</p>}
          {error && <p className="text-sm font-medium text-red-400 text-center">{error}</p>}
        </div>
      </div>
    );
  }

  // ─── IN-PROGRESS VIEW ──────────────────────────────────────────────────────
  if (match.status === 'in_progress') {
    return (
      <div
        className="min-h-screen flex flex-col pb-28 relative overflow-hidden"
        style={{ background: '#07080d' }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: 'radial-gradient(ellipse 70% 40% at 20% 5%, #00b4d818 0%, transparent 55%), radial-gradient(ellipse 70% 40% at 80% 5%, #e9456018 0%, transparent 55%)',
          }}
        />

        <div className="relative z-10 px-5 pt-8 flex flex-col gap-5">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <p
                className="text-[9px] font-black uppercase tracking-[0.5em]"
                style={{ color: '#e94560aa' }}
              >
                ◆ En cours ◆
              </p>
              <h1 className="text-lg font-black text-white mt-0.5 uppercase tracking-wide">
                {match.name ?? `Match ${match.code}`}
              </h1>
            </div>
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white"
              style={{
                borderRadius: 3,
                border: '1px solid rgba(255,255,255,0.10)',
                background: 'rgba(255,255,255,0.06)',
              }}
            >
              <Copy size={14} />
              {match.code}
            </button>
          </div>

          {/* Score board */}
          <motion.div
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 4,
              padding: '24px',
            }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center justify-between gap-2">
              {/* Team A */}
              <div className="flex-1 text-center">
                <p
                  className="text-[9px] font-black uppercase tracking-[0.5em] mb-2"
                  style={{ color: '#00b4d8' }}
                >
                  Équipe A
                </p>
                <motion.span
                  key={`score-a-${match.score_team_a}`}
                  className="text-7xl font-black leading-none"
                  style={{ color: '#00b4d8', filter: 'drop-shadow(0 0 18px #00b4d870)', display: 'inline-block' }}
                  initial={{ scale: 1.5, color: '#f5a623' }}
                  animate={{ scale: 1, color: '#00b4d8' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  {match.score_team_a}
                </motion.span>
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
                <p className="text-2xl font-black uppercase tracking-widest text-white/20">VS</p>
                <p className="text-[9px] font-black uppercase tracking-[0.4em] text-muted">
                  /{match.score_target}
                </p>
              </div>

              {/* Team B */}
              <div className="flex-1 text-center">
                <p
                  className="text-[9px] font-black uppercase tracking-[0.5em] mb-2"
                  style={{ color: '#e94560' }}
                >
                  Équipe B
                </p>
                <motion.span
                  key={`score-b-${match.score_team_b}`}
                  className="text-7xl font-black leading-none"
                  style={{ color: '#e94560', filter: 'drop-shadow(0 0 18px #e9456070)', display: 'inline-block' }}
                  initial={{ scale: 1.5, color: '#f5a623' }}
                  animate={{ scale: 1, color: '#e94560' }}
                  transition={{ duration: 0.4, ease: 'easeOut' }}
                >
                  {match.score_team_b}
                </motion.span>
                <div className="mt-2 space-y-0.5">
                  {teamBPlayers.map((entry) => (
                    <p key={entry.player_id} className="text-xs text-muted truncate">
                      {entry.players?.username ?? '—'}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Progress bars — single-row sharp track */}
            <div className="mt-5 flex gap-1 h-2" style={{ borderRadius: 2, overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}>
              {(['A', 'B'] as Team[]).map((team) => {
                const score = team === 'A' ? match.score_team_a : match.score_team_b;
                const pct = Math.min(50, (score / match.score_target) * 50);
                const accent = TEAM_ACCENT[team];
                return (
                  <motion.div
                    key={team}
                    className="h-full"
                    style={{ background: accent, width: `${pct}%`, marginLeft: team === 'B' ? 'auto' : undefined }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                );
              })}
            </div>
          </motion.div>

          {/* Pending goal banner */}
          {pendingGoal && (() => {
            const goalAccent = TEAM_ACCENT[pendingGoal.team];
            const myVote = pendingGoal.goal_votes.find((v) => v.player_id === currentUserId);
            const teamAConfirmed = pendingGoal.goal_votes.some((v) => v.team === 'A' && v.vote === 'confirm');
            const teamBConfirmed = pendingGoal.goal_votes.some((v) => v.team === 'B' && v.vote === 'confirm');
            return (
              <motion.div
                style={{
                  background: `${goalAccent}12`,
                  border: `1px solid ${goalAccent}44`,
                  borderLeft: `4px solid ${goalAccent}`,
                  borderRadius: 4,
                  padding: '16px',
                }}
                initial={{ opacity: 0, scale: 0.97 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3 }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.5em]" style={{ color: `${goalAccent}aa` }}>
                      But en attente
                    </p>
                    <p className="text-base font-black text-white mt-0.5">
                      Équipe {pendingGoal.team} — validation requise
                    </p>
                  </div>
                  {countdown !== null && (
                    <span
                      className="text-2xl font-black tabular-nums"
                      style={{ color: countdown <= 10 ? '#f87171' : 'rgba(255,255,255,0.5)' }}
                    >
                      {countdown}s
                    </span>
                  )}
                </div>

                {/* État de validation par équipe */}
                <div className="flex gap-3 mb-4">
                  {(['A', 'B'] as Team[]).map((t) => {
                    const confirmed = t === 'A' ? teamAConfirmed : teamBConfirmed;
                    return (
                      <div
                        key={t}
                        className="flex items-center gap-1.5 text-xs font-bold"
                        style={{ color: confirmed ? '#4ade80' : 'rgba(255,255,255,0.4)' }}
                      >
                        {confirmed
                          ? <CheckCircle size={13} />
                          : <div className="w-3 h-3 rounded-full border border-white/20" />
                        }
                        Équipe {t}
                      </div>
                    );
                  })}
                </div>

                {/* Boutons vote (cachés si déjà voté) */}
                {!myVote ? (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => voteGoal('confirm')}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black text-white uppercase tracking-wide disabled:opacity-50"
                      style={{ borderRadius: 3, background: '#16a34a', boxShadow: '0 3px 0 #0f6b2e' }}
                    >
                      <CheckCircle size={14} />
                      Valider
                    </button>
                    <button
                      type="button"
                      onClick={() => voteGoal('reject')}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-black text-white uppercase tracking-wide disabled:opacity-50"
                      style={{ borderRadius: 3, background: '#dc2626', boxShadow: '0 3px 0 #7f1d1d' }}
                    >
                      <XCircle size={14} />
                      Contester
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-center font-bold" style={{ color: myVote.vote === 'confirm' ? '#4ade80' : '#f87171' }}>
                    {myVote.vote === 'confirm' ? 'Tu as validé ce but' : 'Tu as contesté ce but'}
                  </p>
                )}
              </motion.div>
            );
          })()}

          {/* Goal buttons */}
          {canRecordGoal && !pendingGoal ? (
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
                    className="flex flex-col items-center justify-center py-6 font-black text-white transition-all disabled:opacity-50"
                    style={{
                      borderRadius: 4,
                      background: accent,
                      boxShadow: `0 5px 0 ${darkAccent}`,
                      transform: 'translateY(0)',
                    }}
                    onMouseDown={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 3px 0 ${darkAccent}`; }}
                    onMouseUp={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${darkAccent}`; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${darkAccent}`; }}
                    onTouchStart={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(2px)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 3px 0 ${darkAccent}`; }}
                    onTouchEnd={(e) => { (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(0)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 5px 0 ${darkAccent}`; }}
                  >
                    <span className="text-3xl leading-none mb-1">+</span>
                    <span className="text-[10px] uppercase tracking-[0.4em]">But {team}</span>
                  </button>
                );
              })}
            </motion.div>
          ) : !pendingGoal ? (
            <p className="text-sm text-muted text-center">
              {match.referee_id
                ? "Seul l'arbitre peut enregistrer les buts."
                : "En attente d'un but…"}
            </p>
          ) : null}

          {/* Host/referee: pause + finish controls */}
          {isHostOrReferee && (
            <motion.div
              className="flex gap-3"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
            >
              <button
                type="button"
                onClick={pauseMatch}
                disabled={isPending}
                className="btn-cod-dark flex-1 justify-center gap-2 disabled:opacity-50"
              >
                <Pause size={14} />
                Pause
              </button>
              <button
                type="button"
                onClick={finishMatch}
                disabled={isPending}
                className="btn-cod-dark flex-1 justify-center gap-2 disabled:opacity-50"
              >
                <Square size={14} />
                Terminer
              </button>
            </motion.div>
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
      className="min-h-screen px-5 pt-10 pb-28 relative overflow-hidden"
      style={{ background: '#07080d' }}
    >
      {/* Atmospheric dual glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 30% at 20% 5%, #00b4d814 0%, transparent 60%), radial-gradient(ellipse 60% 30% at 80% 5%, #e9456014 0%, transparent 60%)',
        }}
      />

      {/* Header strip */}
      <motion.div
        className="relative z-10 flex items-center justify-between gap-4 mb-4"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-muted">Match</p>
          <h1 className="mt-1 truncate text-2xl font-black text-white uppercase tracking-wide">
            {match.name ?? `Lobby ${match.code}`}
          </h1>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="shrink-0 inline-flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-white"
          style={{
            borderRadius: 3,
            border: '1px solid rgba(255,255,255,0.10)',
            background: 'rgba(255,255,255,0.06)',
          }}
        >
          <Copy size={14} />
          {match.code}
        </button>
      </motion.div>

      {/* Info strip — 3 sharp stat panels */}
      <motion.div
        className="relative z-10 grid grid-cols-3 gap-2 mb-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05, duration: 0.3 }}
      >
        {[
          { label: 'Joueurs', value: `${match.match_players.length}/4`, icon: Users },
          { label: 'Objectif', value: `${match.score_target}`, icon: Swords },
          { label: 'Score', value: `${match.score_team_a}-${match.score_team_b}`, icon: Shield },
        ].map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="px-3 py-3"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 4,
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-muted">{label}</span>
              <Icon size={13} className="text-white/40" />
            </div>
            <p className="text-xl font-black text-white">{value}</p>
          </div>
        ))}
      </motion.div>

      {/* Slot grid */}
      <motion.div
        className="relative z-10 grid grid-cols-2 gap-3 mb-5"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.35 }}
      >
        {SLOT_ORDER.map((slot) => {
          const occupant = match.match_players.find(
            (entry) => entry.team === slot.team && entry.position === slot.position
          );
          const isCurrentSlot = occupant?.player_id === currentUserId;
          const canJoinSlot = isLobby && !occupant && !currentPlayer;

          return (
            <div
              key={`${slot.team}-${slot.position}`}
              style={{
                background: 'rgba(255,255,255,0.025)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderLeft: `3px solid ${slot.accent}`,
                borderRadius: 4,
                padding: '14px 14px 14px 12px',
              }}
            >
              {/* Slot header */}
              <p
                className="text-[9px] font-black uppercase tracking-[0.45em] mb-3"
                style={{ color: slot.accent }}
              >
                {slot.label}
              </p>

              {occupant ? (
                <div className="flex items-center gap-2.5">
                  {occupant.players?.avatar_url ? (
                    <img
                      src={occupant.players.avatar_url}
                      alt={occupant.players.username}
                      className="h-10 w-10 object-cover shrink-0"
                      style={{ borderRadius: 3 }}
                    />
                  ) : (
                    <div
                      className="flex h-10 w-10 items-center justify-center shrink-0 text-base font-black text-white"
                      style={{ borderRadius: 3, background: `${slot.accent}22` }}
                    >
                      {occupant.players?.username.slice(0, 1).toUpperCase() ?? '?'}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black text-white leading-tight">{occupant.players?.username ?? '—'}</p>
                    <div className="mt-1.5 flex items-center gap-2">
                      {occupant.players && (
                        <RankBadge
                          rank={occupant.players.rank}
                          tier={occupant.players.rank_tier}
                          size="sm"
                          showLabel={false}
                          isPlacement={occupant.players.placement_matches_left > 0}
                          animated={false}
                        />
                      )}
                      {isCurrentSlot ? (
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-accent">Toi</span>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-muted mb-2">Slot libre</p>
                  {canJoinSlot ? (
                    <button
                      type="button"
                      onClick={() => joinSlot(slot.team, slot.position)}
                      disabled={isPending}
                      className={cn(
                        'inline-flex items-center gap-1.5 px-3 py-2 text-xs font-black text-white uppercase tracking-wide transition-all',
                        isPending && 'opacity-60'
                      )}
                      style={{
                        borderRadius: 3,
                        background: `${slot.accent}cc`,
                        boxShadow: `0 3px 0 ${slot.team === 'A' ? '#006e85' : '#9e1e35'}`,
                      }}
                    >
                      <Users size={13} />
                      Rejoindre
                    </button>
                  ) : (
                    <p className="text-xs text-muted">
                      {currentPlayer ? "Quitte d'abord ton slot." : 'Lobby requis.'}
                    </p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </motion.div>

      {/* Action buttons */}
      <motion.div
        className="relative z-10 flex flex-col gap-3"
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.3 }}
      >
        {isLobby && !currentPlayer ? (
          <p className="text-sm text-muted">Choisis un slot libre pour rejoindre la partie.</p>
        ) : null}

        {currentPlayer ? (
          <button
            type="button"
            onClick={leaveMatch}
            disabled={!isLobby || isPending}
            className="btn-cod-dark inline-flex items-center gap-2 disabled:opacity-50"
            style={{ alignSelf: 'flex-start' }}
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
            className="btn-cod-red justify-center gap-2 w-full disabled:opacity-50"
          >
            <Play size={16} />
            Démarrer le match
          </button>
        ) : null}

        {feedback ? <p className="text-sm font-medium text-green-400">{feedback}</p> : null}
        {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}
      </motion.div>
    </div>
  );
}
