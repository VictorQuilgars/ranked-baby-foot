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
      glow: '0 12px 32px rgba(245, 166, 35, 0.30)',
      icon: Crown,
      label: 'Meneur',
    };
  }

  if (index === 1) {
    return {
      height: '180px',
      accent: '#c0c0c0',
      glow: '0 12px 32px rgba(192, 192, 192, 0.22)',
      icon: Medal,
      label: 'Challenger',
    };
  }

  return {
    height: '160px',
    accent: '#cd7f32',
    glow: '0 12px 32px rgba(205, 127, 50, 0.22)',
    icon: Flame,
    label: 'Outsider',
  };
}

export function LeaderboardClient({ players }: LeaderboardClientProps) {
  const topThree = players.slice(0, 3);
  const remaining = players.slice(3);

  return (
    <div
      className="min-h-screen pb-28 relative"
      style={{ background: '#07080d' }}
    >
      {/* Gold atmospheric glow at top */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '600px',
          height: '320px',
          background: 'radial-gradient(ellipse at top, rgba(245,166,35,0.14) 0%, rgba(245,166,35,0.04) 45%, transparent 70%)',
          filter: 'blur(28px)',
        }}
      />

      {/* ── Page header strip ── */}
      <div
        className="relative flex items-center justify-between px-5"
        style={{
          height: '56px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center gap-3">
          <Crown size={14} style={{ color: '#f5a623' }} />
          <span
            className="text-[9px] font-black uppercase"
            style={{ color: 'rgba(168,168,179,0.7)', letterSpacing: '0.5em' }}
          >
            CLASSEMENT
          </span>
        </div>

        {/* Player count badge — sharp rectangle */}
        <div
          className="flex flex-col items-end px-3 py-1"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '3px',
          }}
        >
          <span
            className="text-[9px] font-black uppercase"
            style={{ color: 'rgba(168,168,179,0.55)', letterSpacing: '0.3em' }}
          >
            JOUEURS CLASSÉS
          </span>
          <span className="text-base font-black text-white leading-none mt-0.5">{players.length}</span>
        </div>
      </div>

      <div className="px-5 pt-6">

        {/* ── Podium top 3 ── */}
        {topThree.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            <p
              className="text-[9px] font-black uppercase mb-5"
              style={{ color: 'rgba(168,168,179,0.5)', letterSpacing: '0.5em' }}
            >
              TOP 3
            </p>

            <div className="grid grid-cols-3 items-end gap-2">
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
                    {/* Avatar above the column */}
                    <div className="mb-3 flex flex-col items-center gap-2">
                      {player.avatar_url ? (
                        <img
                          src={player.avatar_url}
                          alt={player.username}
                          className="h-14 w-14 rounded-full border-2 object-cover"
                          style={{ borderColor: podium.accent, boxShadow: podium.glow }}
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 items-center justify-center rounded-full border-2 text-xl font-black text-white"
                          style={{
                            borderColor: podium.accent,
                            background: `${podium.accent}28`,
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

                    {/* Podium column — sharp, angular */}
                    <div
                      className="w-full px-2 pt-4 pb-5 text-center"
                      style={{
                        height: podium.height,
                        background: `linear-gradient(180deg, ${podium.accent}18 0%, rgba(7,8,13,0.96) 65%)`,
                        border: `1px solid ${podium.accent}40`,
                        borderTop: `4px solid ${podium.accent}`,
                        borderRadius: '2px',
                        boxShadow: podium.glow,
                      }}
                    >
                      <div
                        className="mx-auto flex h-8 w-8 items-center justify-center text-white"
                        style={{
                          background: 'rgba(255,255,255,0.06)',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '2px',
                        }}
                      >
                        <Icon size={16} />
                      </div>
                      <p
                        className="mt-2 text-[9px] font-black uppercase"
                        style={{ color: podium.accent, letterSpacing: '0.22em' }}
                      >
                        {podium.label}
                      </p>
                      <p className="mt-1.5 truncate text-sm font-black text-white">{player.username}</p>
                      <p className="mt-1 text-2xl font-black text-white leading-none">{player.rank_points}</p>
                      <p
                        className="text-[9px] font-black uppercase"
                        style={{ color: 'rgba(168,168,179,0.5)', letterSpacing: '0.2em' }}
                      >
                        SR
                      </p>
                      <div className="mt-3 flex justify-center gap-2 text-[10px]" style={{ color: 'rgba(168,168,179,0.6)' }}>
                        <span>{player.wins}V</span>
                        <span>{player.losses}D</span>
                        <span>{getWinRate(player)}%</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="px-5 py-10 text-center"
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: '3px',
            }}
          >
            <p className="text-base font-black text-white uppercase tracking-widest">Aucun joueur classé</p>
            <p className="mt-2 text-sm" style={{ color: 'rgba(168,168,179,0.6)' }}>
              Termine les matchs de placement pour apparaître ici.
            </p>
          </motion.div>
        )}

        {/* ── Full list ── */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.45 }}
        >
          <p
            className="text-[9px] font-black uppercase mb-4"
            style={{ color: 'rgba(168,168,179,0.5)', letterSpacing: '0.5em' }}
          >
            CLASSEMENT COMPLET
          </p>

          <div className="flex flex-col gap-2">
            {players.map((player, index) => (
              <motion.div
                key={player.id}
                className="flex items-center gap-3 px-4 py-3"
                style={{
                  background: index < 3
                    ? 'rgba(245,166,35,0.06)'
                    : 'rgba(255,255,255,0.025)',
                  border: index < 3
                    ? '1px solid rgba(245,166,35,0.20)'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderLeft: index < 3
                    ? '3px solid rgba(245,166,35,0.70)'
                    : '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '2px',
                }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.03 * index, duration: 0.28 }}
              >
                {/* Rank number */}
                <div
                  className="w-8 text-center text-sm font-black"
                  style={{ color: index < 3 ? '#f5a623' : 'rgba(255,255,255,0.5)' }}
                >
                  {index + 1}
                </div>

                {/* Avatar */}
                {player.avatar_url ? (
                  <img
                    src={player.avatar_url}
                    alt={player.username}
                    className="h-11 w-11 object-cover flex-shrink-0"
                    style={{ borderRadius: '3px' }}
                  />
                ) : (
                  <div
                    className="flex h-11 w-11 items-center justify-center text-base font-black flex-shrink-0"
                    style={{
                      borderRadius: '3px',
                      background: 'rgba(255,255,255,0.06)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      color: '#e94560',
                    }}
                  >
                    {player.username.slice(0, 1).toUpperCase()}
                  </div>
                )}

                {/* Player info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="truncate text-sm font-black text-white uppercase tracking-wide">
                      {player.username}
                    </p>
                    {index === 0 ? <Crown size={12} style={{ color: '#f5a623', flexShrink: 0 }} /> : null}
                  </div>
                  <div className="mt-1.5 flex items-center gap-2.5">
                    <RankBadge
                      rank={player.rank}
                      tier={player.rank_tier}
                      size="sm"
                      showLabel={false}
                      animated={false}
                    />
                    <div
                      className="flex items-center gap-2.5 text-[10px] font-semibold"
                      style={{ color: 'rgba(168,168,179,0.6)' }}
                    >
                      <span>{player.wins}V</span>
                      <span>{player.losses}D</span>
                      <span>{player.mvp_count} MVP</span>
                      <span className="inline-flex items-center gap-1">
                        <Swords size={10} />
                        {player.total_games}
                      </span>
                    </div>
                  </div>
                </div>

                {/* SR */}
                <div className="text-right flex-shrink-0">
                  <p className="text-lg font-black text-white leading-none">{player.rank_points}</p>
                  <p
                    className="text-[9px] font-black uppercase mt-0.5"
                    style={{ color: 'rgba(168,168,179,0.5)', letterSpacing: '0.2em' }}
                  >
                    SR
                  </p>
                </div>
              </motion.div>
            ))}

            {remaining.length === 0 && players.length > 0 ? (
              <p
                className="px-2 pt-3 text-center text-[10px] font-semibold uppercase"
                style={{ color: 'rgba(168,168,179,0.4)', letterSpacing: '0.3em' }}
              >
                Le podium résume déjà tout le classement disponible.
              </p>
            ) : null}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
