'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Shield, Star, Target, TrendingUp, LogOut } from 'lucide-react';
import { RankBadge } from '@/components/rank/RankBadge';
import { SRBar } from '@/components/rank/SRBar';
import { apiRequest } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { RANK_COLORS, formatRankLabel, type RankName } from '@/types/player';

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

type Tab = 'stats' | 'profil' | 'historique';

const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'stats',      label: 'Stats' },
  { id: 'profil',     label: 'Profil' },
  { id: 'historique', label: 'Historique' },
];

const POSITION_OPTIONS: Array<{ value: PreferredPosition; label: string }> = [
  { value: 'attacker',   label: 'Attaquant' },
  { value: 'goalkeeper', label: 'Gardien' },
  { value: 'both',       label: 'Les deux' },
];

function getWinRate(player: PlayerProfile) {
  if (player.total_games === 0) return 0;
  return Math.round((player.wins / player.total_games) * 100);
}

function getHistoryOutcome(entry: MatchHistoryItem) {
  const match = entry.matches;
  if (!match?.winner_team) return { label: 'Incomplet', color: '#a8a8b3' };
  if (match.winner_team === 'draw') return { label: 'Égalité', color: '#f5a623' };
  return match.winner_team === entry.team
    ? { label: 'Victoire', color: '#22c55e' }
    : { label: 'Défaite',  color: '#ef4444' };
}

function formatSignedSr(value: number | null) {
  if (value === null) return '—';
  if (value > 0) return `+${value} SR`;
  if (value < 0) return `${value} SR`;
  return '±0 SR';
}

function getPositionLabel(position: PreferredPosition) {
  return POSITION_OPTIONS.find((o) => o.value === position)?.label ?? 'Les deux';
}

export function ProfileClient({ initialPlayer, history }: ProfileClientProps) {
  const [player, setPlayer]                     = useState(initialPlayer);
  const [activeTab, setActiveTab]               = useState<Tab>('stats');
  const [username, setUsername]                 = useState(initialPlayer.username);
  const [preferredPosition, setPreferredPosition] = useState<PreferredPosition>(initialPlayer.preferred_position);
  const [feedback, setFeedback]                 = useState<string | null>(null);
  const [error, setError]                       = useState<string | null>(null);
  const [isPending, startTransition]            = useTransition();
  const router                                  = useRouter();

  const isPlacement = player.placement_matches_left > 0;
  const rankColor   = RANK_COLORS[player.rank];

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
  }

  function saveProfile() {
    setFeedback(null);
    setError(null);
    startTransition(async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      if (!token) { setError('Session introuvable, reconnecte-toi.'); return; }
      try {
        const response = await apiRequest<{ data: PlayerProfile }>('/api/players/me', {
          method: 'PUT',
          token,
          body: { username: username.trim(), preferredPosition },
        });
        setPlayer(response.data);
        setUsername(response.data.username);
        setPreferredPosition(response.data.preferred_position);
        setFeedback('Profil mis à jour.');
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Mise à jour impossible');
      }
    });
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#07080d' }}>

      {/* Atmospheric rank glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: `radial-gradient(ellipse 70% 35% at 50% 0%, ${rankColor}18 0%, transparent 65%)` }}
      />

      {/* ── Header ── */}
      <div className="relative z-10 px-5 pt-12 pb-5 flex items-center gap-4">
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.username}
            className="w-16 h-16 object-cover border-2"
            style={{ borderRadius: 4, borderColor: `${rankColor}66` }}
          />
        ) : (
          <div
            className="w-16 h-16 flex items-center justify-center text-2xl font-black text-white"
            style={{ borderRadius: 4, background: `${rankColor}33`, border: `2px solid ${rankColor}55` }}
          >
            {player.username[0].toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-black uppercase tracking-[0.5em] text-muted">Profil joueur</p>
          <h1 className="text-2xl font-black text-white truncate uppercase tracking-wide">{player.username}</h1>
          {!isPlacement && (
            <p className="text-sm font-bold mt-0.5" style={{ color: rankColor }}>
              {formatRankLabel(player.rank, player.rank_tier)} · {player.rank_points} SR
            </p>
          )}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="relative z-10 px-5 mb-1">
        <div
          className="flex gap-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="flex-1 py-3 text-sm font-black uppercase tracking-widest transition-colors duration-200 relative"
                style={{
                  color: isActive ? '#ffffff' : '#a8a8b3',
                  background: 'transparent',
                  borderBottom: isActive ? `2px solid ${rankColor}` : '2px solid transparent',
                  marginBottom: -1,
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Content ── */}
      <div className="relative z-10 flex-1 px-5 pt-4 pb-28 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* ── Tab : Stats ── */}
          {activeTab === 'stats' && (
            <motion.div
              key="stats"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-4"
            >
              {/* Badge + bar */}
              <div className="flex flex-col items-center pt-4 pb-6 gap-3">
                <div className="relative flex items-center justify-center">
                  <div
                    className="absolute rounded-full pointer-events-none"
                    style={{
                      width: '200px', height: '200px',
                      background: `radial-gradient(circle, ${rankColor}25 0%, transparent 70%)`,
                      filter: 'blur(16px)',
                    }}
                  />
                  <RankBadge rank={player.rank} tier={player.rank_tier} size="xl" showLabel={false} isPlacement={isPlacement} animated />
                </div>
                <div className="text-center">
                  <p className="text-[9px] font-black uppercase tracking-[0.5em] text-muted">Rang</p>
                  <h2 className="text-3xl font-black uppercase tracking-wide mt-0.5" style={{ color: rankColor }}>
                    {isPlacement ? 'En placement' : formatRankLabel(player.rank, player.rank_tier)}
                  </h2>
                </div>
                {!isPlacement && (
                  <div className="w-full">
                    <SRBar sr={player.rank_points} rank={player.rank} tier={player.rank_tier} animated showNumbers />
                  </div>
                )}
                {isPlacement && (
                  <p className="text-sm text-muted text-center">
                    {player.placement_matches_left} match{player.placement_matches_left > 1 ? 's' : ''} de placement restant{player.placement_matches_left > 1 ? 's' : ''}
                  </p>
                )}
              </div>

              {/* Stats grid */}
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Winrate',  value: `${getWinRate(player)}%`, icon: TrendingUp, color: '#22c55e' },
                  { label: 'Buts',     value: player.goals_scored,       icon: Target,     color: '#f5a623' },
                  { label: 'MVP',      value: player.mvp_count,           icon: Star,       color: '#7b2fff' },
                  { label: 'Bouclier', value: isPlacement ? 'Placement' : player.rank_shield, icon: Shield, color: '#e94560' },
                  { label: 'Victoires',value: player.wins,                icon: TrendingUp, color: '#22c55e' },
                  { label: 'Défaites', value: player.losses,              icon: TrendingUp, color: '#ef4444' },
                ].map(({ label, value, icon: Icon, color }) => (
                  <div
                    key={label}
                    className="px-4 py-4"
                    style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4 }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[9px] font-black uppercase tracking-[0.5em] text-muted">{label}</span>
                      <Icon size={14} style={{ color }} />
                    </div>
                    <p className="text-2xl font-black text-white">{value}</p>
                  </div>
                ))}
              </div>

              {/* Total matches */}
              <div
                className="px-5 py-4 flex items-center justify-between"
                style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4 }}
              >
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-muted">Total matchs joués</span>
                <span className="text-2xl font-black text-white">{player.total_games}</span>
              </div>
            </motion.div>
          )}

          {/* ── Tab : Profil ── */}
          {activeTab === 'profil' && (
            <motion.div
              key="profil"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-5"
            >
              <label className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-muted">Pseudo</span>
                <input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  maxLength={20}
                  className="border border-white/10 bg-white/5 px-4 py-3.5 text-white outline-none transition focus:border-accent text-base font-bold"
                  style={{ borderRadius: 4 }}
                  placeholder="ton_pseudo"
                />
              </label>

              <div className="flex flex-col gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.5em] text-muted">Position préférée</span>
                <div className="grid grid-cols-3 gap-2">
                  {POSITION_OPTIONS.map((option) => {
                    const isActive = preferredPosition === option.value;
                    return (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setPreferredPosition(option.value)}
                        className="py-3 text-sm font-black uppercase tracking-wide transition-all"
                        style={{
                          borderRadius: 3,
                          background: isActive ? `${rankColor}22` : 'rgba(255,255,255,0.025)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderLeft: isActive ? `3px solid ${rankColor}` : '3px solid transparent',
                          color: isActive ? rankColor : '#a8a8b3',
                        }}
                      >
                        {option.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {feedback && <p className="text-sm font-bold text-green-400">{feedback}</p>}
              {error    && <p className="text-sm font-bold text-red-400">{error}</p>}

              <button
                type="button"
                onClick={saveProfile}
                disabled={isPending}
                className="btn-cod-red justify-center gap-2 mt-2 w-full"
              >
                <Save size={18} />
                <span className="font-black uppercase tracking-wide">
                  {isPending ? 'Sauvegarde...' : 'Sauvegarder'}
                </span>
              </button>

              {/* Separator */}
              <div className="h-px w-full" style={{ background: 'rgba(255,255,255,0.06)' }} />

              {/* Sign out */}
              <button
                type="button"
                onClick={signOut}
                className="flex items-center justify-center gap-2 w-full py-3.5 text-sm font-black uppercase tracking-widest transition-all active:scale-95"
                style={{
                  borderRadius: 3,
                  color: '#ef4444',
                  border: '1px solid rgba(239,68,68,0.25)',
                  background: 'rgba(239,68,68,0.07)',
                }}
              >
                <LogOut size={16} strokeWidth={2.5} />
                Déconnexion
              </button>
            </motion.div>
          )}

          {/* ── Tab : Historique ── */}
          {activeTab === 'historique' && (
            <motion.div
              key="historique"
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 16 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col gap-3"
            >
              {history.length === 0 ? (
                <div
                  className="px-4 py-12 text-center mt-4"
                  style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 4 }}
                >
                  <p className="text-white font-black uppercase tracking-wide">Aucun match</p>
                  <p className="mt-2 text-sm text-muted">Tes parties terminées apparaîtront ici.</p>
                </div>
              ) : (
                history.map((entry, i) => {
                  const outcome = getHistoryOutcome(entry);
                  const score   = entry.matches
                    ? `${entry.matches.score_team_a} — ${entry.matches.score_team_b}`
                    : '—';
                  return (
                    <motion.div
                      key={entry.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="px-4 py-4"
                      style={{
                        background: 'rgba(255,255,255,0.025)',
                        border: `1px solid ${outcome.color}22`,
                        borderLeft: `3px solid ${outcome.color}`,
                        borderRadius: 4,
                      }}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-black text-white truncate">
                            {entry.matches?.name ?? `Match ${entry.matches?.code ?? '—'}`}
                          </p>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted">
                            <span>Équipe {entry.team}</span>
                            <span>·</span>
                            <span>{getPositionLabel(entry.position)}</span>
                            <span>·</span>
                            <span>{entry.goals_scored} but{entry.goals_scored > 1 ? 's' : ''}</span>
                            {entry.is_mvp && <span className="text-gold-ui font-black">· MVP</span>}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-white">{score}</p>
                          <p className="text-xs font-black uppercase tracking-wide" style={{ color: outcome.color }}>
                            {outcome.label}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-between text-xs">
                        <span className="text-muted">
                          {entry.matches?.finished_at
                            ? new Date(entry.matches.finished_at).toLocaleDateString('fr-FR')
                            : 'Match non terminé'}
                        </span>
                        <span
                          className="font-black text-sm"
                          style={{
                            color: entry.sr_change === null ? '#a8a8b3'
                              : entry.sr_change >= 0 ? '#22c55e' : '#ef4444',
                          }}
                        >
                          {formatSignedSr(entry.sr_change)}
                        </span>
                      </div>
                    </motion.div>
                  );
                })
              )}
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
