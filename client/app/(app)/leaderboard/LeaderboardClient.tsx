'use client';

import { motion } from 'framer-motion';
import { Crown, Flame, Medal, Swords } from 'lucide-react';
import { RankBadge } from '@/components/rank/RankBadge';
import { type RankName } from '@/types/player';

type LeaderboardPlayer = {
  id: string;
  username: string;
  avatar_url: string | null;
  rank: RankName;
  rank_tier: number;
  rank_points: number;
  placement_matches_left: number;
  total_games: number;
  wins: number;
  losses: number;
  mvp_count: number;
};

type LeaderboardClientProps = {
  players: LeaderboardPlayer[];
};

const PODIUM_ORDER = [1, 0, 2];

function getWinRate(player: LeaderboardPlayer) {
  if (player.total_games === 0) return 0;
  return Math.round((player.wins / player.total_games) * 100);
}

function getPodiumStyle(index: number) {
  if (index === 0) {
    return {
      height: '220px',
      accent: '#f5a623',
      glow: '0 18px 40px rgba(245, 166, 35, 0.35)',
      icon: Crown,
      label: 'Meneur',
    };
  }

  if (index === 1) {
    return {
      height: '180px',
      accent: '#c0c0c0',
      glow: '0 18px 40px rgba(192, 192, 192, 0.28)',
      icon: Medal,
      label: 'Challenger',
    };
  }

  return {
    height: '160px',
    accent: '#cd7f32',
    glow: '0 18px 40px rgba(205, 127, 50, 0.28)',
    icon: Flame,
    label: 'Outsider',
  };
}

export function LeaderboardClient({ players }: LeaderboardClientProps) {
  const topThree = players.slice(0, 3);
  const remaining = players.slice(3);

  return (
    <div
      className="min-h-screen px-5 pt-10 pb-28"
      style={{
        background:
          'radial-gradient(circle at top, rgba(245,166,35,0.18) 0%, rgba(15,52,96,0.42) 28%, #1a1a2e 70%)',
      }}
    >
      <motion.section
        className="rounded-[32px] p-6"
        style={{
          background: 'linear-gradient(145deg, rgba(22,33,62,0.96), rgba(15,52,96,0.88))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gold-ui">
              Classement Officiel
            </p>
            <h1 className="mt-2 text-3xl font-black text-white">Top joueurs</h1>
            <p className="mt-2 max-w-xs text-sm text-muted">
              Les joueurs en placement sont exclus jusqu&apos;à la fin de leurs 5 matchs de calibrage.
            </p>
          </div>
          <div
            className="rounded-2xl px-4 py-3 text-right"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-muted">Joueurs classés</p>
            <p className="mt-1 text-2xl font-black text-white">{players.length}</p>
          </div>
        </div>

        {topThree.length > 0 ? (
          <div className="mt-8 grid grid-cols-3 items-end gap-3">
            {PODIUM_ORDER.map((slot, visualIndex) => {
              const player = topThree[slot];

              if (!player) {
                return <div key={`empty-${visualIndex}`} />;
              }

              const podium = getPodiumStyle(slot);
              const Icon = podium.icon;

              return (
                <motion.div
                  key={player.id}
                  className="flex flex-col items-center"
                  initial={{ opacity: 0, y: 28 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.12 * (visualIndex + 1), duration: 0.35 }}
                >
                  <div className="mb-3 flex flex-col items-center gap-2">
                    {player.avatar_url ? (
                      <img
                        src={player.avatar_url}
                        alt={player.username}
                        className="h-16 w-16 rounded-full border-2 object-cover"
                        style={{ borderColor: podium.accent, boxShadow: podium.glow }}
                      />
                    ) : (
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-full border-2 text-xl font-black text-white"
                        style={{
                          borderColor: podium.accent,
                          background: `${podium.accent}33`,
                          boxShadow: podium.glow,
                        }}
                      >
                        {player.username.slice(0, 1).toUpperCase()}
                      </div>
                    )}

                    <RankBadge
                      rank={player.rank}
                      tier={player.rank_tier}
                      size="md"
                      showLabel={false}
                      animated={slot === 0}
                    />
                  </div>

                  <div
                    className="w-full rounded-t-[28px] px-3 pt-4 pb-5 text-center"
                    style={{
                      height: podium.height,
                      background: `linear-gradient(180deg, ${podium.accent}26 0%, rgba(22,33,62,0.94) 68%)`,
                      border: `1px solid ${podium.accent}55`,
                      boxShadow: podium.glow,
                    }}
                  >
                    <div className="mx-auto flex h-9 w-9 items-center justify-center rounded-full bg-night text-white">
                      <Icon size={18} />
                    </div>
                    <p className="mt-3 text-[11px] font-bold uppercase tracking-[0.24em]" style={{ color: podium.accent }}>
                      {podium.label}
                    </p>
                    <p className="mt-2 truncate text-base font-black text-white">{player.username}</p>
                    <p className="mt-1 text-3xl font-black text-white">{player.rank_points}</p>
                    <p className="text-xs uppercase tracking-[0.18em] text-muted">SR</p>
                    <div className="mt-4 flex justify-center gap-3 text-xs text-muted">
                      <span>{player.wins}V</span>
                      <span>{player.losses}D</span>
                      <span>{getWinRate(player)}%</span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div
            className="mt-8 rounded-3xl px-5 py-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <p className="text-lg font-bold text-white">Aucun joueur classé pour le moment</p>
            <p className="mt-2 text-sm text-muted">
              Termine les matchs de placement pour apparaître ici.
            </p>
          </div>
        )}
      </motion.section>

      <motion.section
        className="mt-5 rounded-[32px] p-4"
        style={{
          background: 'linear-gradient(180deg, rgba(12,18,33,0.98), rgba(22,33,62,0.9))',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45 }}
      >
        <div className="flex items-center justify-between px-2 pb-3">
          <div>
            <h2 className="text-lg font-black text-white">Classement complet</h2>
            <p className="text-xs text-muted">Trié par SR décroissant</p>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {players.map((player, index) => (
            <motion.div
              key={player.id}
              className="flex items-center gap-3 rounded-3xl px-4 py-4"
              style={{
                background:
                  index < 3
                    ? 'linear-gradient(135deg, rgba(245,166,35,0.12), rgba(22,33,62,0.96))'
                    : 'rgba(255,255,255,0.04)',
                border:
                  index < 3
                    ? '1px solid rgba(245,166,35,0.24)'
                    : '1px solid rgba(255,255,255,0.06)',
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.03 * index, duration: 0.28 }}
            >
              <div className="w-9 text-center text-lg font-black text-white">{index + 1}</div>

              {player.avatar_url ? (
                <img
                  src={player.avatar_url}
                  alt={player.username}
                  className="h-12 w-12 rounded-2xl object-cover"
                />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-night-3 text-lg font-black text-accent">
                  {player.username.slice(0, 1).toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-black text-white">{player.username}</p>
                  {index === 0 ? <Crown size={14} className="text-gold-ui" /> : null}
                </div>
                <div className="mt-2 flex items-center gap-3">
                  <RankBadge
                    rank={player.rank}
                    tier={player.rank_tier}
                    size="sm"
                    showLabel={false}
                    animated={false}
                  />
                  <div className="flex items-center gap-3 text-[11px] text-muted">
                    <span>{player.wins}V</span>
                    <span>{player.losses}D</span>
                    <span>{player.mvp_count} MVP</span>
                    <span className="inline-flex items-center gap-1">
                      <Swords size={12} />
                      {player.total_games}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <p className="text-xl font-black text-white">{player.rank_points}</p>
                <p className="text-[11px] uppercase tracking-[0.2em] text-muted">SR</p>
              </div>
            </motion.div>
          ))}

          {remaining.length === 0 && players.length > 0 ? (
            <p className="px-2 pt-2 text-center text-xs text-muted">
              Le podium résume déjà tout le classement disponible.
            </p>
          ) : null}
        </div>
      </motion.section>
    </div>
  );
}
