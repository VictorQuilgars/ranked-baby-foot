'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ChevronRight, QrCode } from 'lucide-react';
import { useState } from 'react';
import { RankBadge } from '@/components/rank/RankBadge';
import { SRBar } from '@/components/rank/SRBar';
import { RANK_COLORS, formatRankLabel, type RankName } from '@/types/player';
import { MatchFeedCard, type FeedMatch } from '@/components/match/MatchFeedCard';

interface HomeClientProps {
  player: {
    id: string;
    username: string;
    avatar_url: string | null;
    rank_points: number;
    rank: string;
    rank_tier: number;
    placement_matches_left: number;
    wins: number;
    losses: number;
    total_games: number;
  } | null;
  activeMatches: FeedMatch[];
  recentMatches: FeedMatch[];
}

export function HomeClient({ player, activeMatches, recentMatches }: HomeClientProps) {
  if (!player) return (
    <div className="min-h-screen flex items-center justify-center bg-night">
      <p className="text-[#4a4a5a] text-sm uppercase tracking-widest">Erreur de chargement</p>
    </div>
  );

  const isPlacement = player.placement_matches_left > 0;
  const rank = player.rank as RankName;
  const rankColor = RANK_COLORS[rank];
  const winRate = player.total_games > 0
    ? Math.round((player.wins / player.total_games) * 100)
    : 0;

  const stats = [
    { label: 'Victoires', value: player.wins },
    { label: 'Défaites', value: player.losses },
    { label: 'Win Rate', value: `${winRate}%` },
  ];

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: '#07080d' }}
    >
      {/* Glow atmosphérique couleur du rang */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: '8%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '380px',
          height: '380px',
          background: `radial-gradient(circle, ${rankColor}14 0%, transparent 65%)`,
          filter: 'blur(50px)',
        }}
      />

      {/* Ligne décorative haut */}
      <div
        className="absolute top-0 left-0 right-0 h-px pointer-events-none"
        style={{ background: `linear-gradient(90deg, transparent, ${rankColor}40, transparent)` }}
      />

      {/* ── Header identité joueur ── */}
      <header
        className="relative z-10 flex items-center justify-between px-4"
        style={{
          height: 56,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <div className="flex items-center gap-2.5">
          {player.avatar_url ? (
            <img
              src={player.avatar_url}
              alt={player.username}
              className="w-8 h-8 rounded-full object-cover"
              style={{ border: `1.5px solid ${rankColor}55` }}
            />
          ) : (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black"
              style={{
                background: `${rankColor}18`,
                border: `1.5px solid ${rankColor}55`,
                color: rankColor,
              }}
            >
              {player.username[0].toUpperCase()}
            </div>
          )}
          <span className="text-sm font-black uppercase tracking-wider text-white/90">
            {player.username}
          </span>
        </div>

        {/* Badge saison */}
        <div
          className="flex items-center gap-1 px-2.5 py-1"
          style={{
            border: `1px solid ${rankColor}30`,
            background: `${rankColor}0c`,
          }}
        >
          <span
            className="text-[9px] font-black uppercase tracking-[0.35em]"
            style={{ color: `${rankColor}bb` }}
          >
            Saison 1
          </span>
        </div>
      </header>

      {/* ── Zone centrale rang ── */}
      <div className="relative z-10 flex-1 flex flex-col items-center px-5 pt-6 pb-4">

        {/* Micro label RANKED PLAY */}
        <motion.p
          className="text-[9px] font-black uppercase tracking-[0.55em] mb-7"
          style={{ color: `${rankColor}60` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.05 }}
        >
          ◆ Ranked Play ◆
        </motion.p>

        {/* Badge avec décorations HUD */}
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.88 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          {/* Brackets angulaires */}
          <div
            className="absolute pointer-events-none"
            style={{
              top: -12, left: -12,
              width: 28, height: 28,
              borderTop: `2px solid ${rankColor}55`,
              borderLeft: `2px solid ${rankColor}55`,
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              top: -12, right: -12,
              width: 28, height: 28,
              borderTop: `2px solid ${rankColor}55`,
              borderRight: `2px solid ${rankColor}55`,
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: -12, left: -12,
              width: 28, height: 28,
              borderBottom: `2px solid ${rankColor}55`,
              borderLeft: `2px solid ${rankColor}55`,
            }}
          />
          <div
            className="absolute pointer-events-none"
            style={{
              bottom: -12, right: -12,
              width: 28, height: 28,
              borderBottom: `2px solid ${rankColor}55`,
              borderRight: `2px solid ${rankColor}55`,
            }}
          />

          <RankBadge
            rank={rank}
            tier={player.rank_tier}
            isPlacement={isPlacement}
            size="hero"
            showLabel={false}
            animated
          />
        </motion.div>

        {/* Rang + SR */}
        <motion.div
          className="flex flex-col items-center mt-8 gap-1"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.35 }}
        >
          {isPlacement ? (
            <>
              <p
                className="text-[9px] font-black uppercase tracking-[0.5em]"
                style={{ color: `${rankColor}70` }}
              >
                En placement
              </p>
              <p className="text-4xl font-black text-white mt-1">
                {player.placement_matches_left}
                <span className="text-lg font-black text-white/40 ml-2 tracking-wider">restants</span>
              </p>
            </>
          ) : (
            <>
              <h1
                className="text-5xl font-black uppercase tracking-wider leading-none"
                style={{
                  color: rankColor,
                  textShadow: `0 0 32px ${rankColor}55`,
                }}
              >
                {formatRankLabel(rank, player.rank_tier)}
              </h1>
              <div className="flex items-baseline gap-1.5 mt-2">
                <span className="text-3xl font-black text-white">
                  {player.rank_points.toLocaleString()}
                </span>
                <span
                  className="text-[10px] font-black uppercase tracking-[0.4em]"
                  style={{ color: `${rankColor}70` }}
                >
                  SR
                </span>
              </div>
            </>
          )}
        </motion.div>

        {/* Barre SR */}
        {!isPlacement && (
          <motion.div
            className="w-full mt-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
          >
            <SRBar
              sr={player.rank_points}
              rank={rank}
              tier={player.rank_tier}
              animated
              showNumbers
            />
          </motion.div>
        )}

        {/* ── Stats ── */}
        <motion.div
          className="w-full mt-6 grid grid-cols-3"
          style={{
            border: '1px solid rgba(255,255,255,0.06)',
            background: 'rgba(255,255,255,0.025)',
          }}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.38 }}
        >
          {stats.map((stat, i) => (
            <div
              key={stat.label}
              className="flex flex-col items-center py-3.5"
              style={{
                borderLeft: i > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none',
              }}
            >
              <span className="text-2xl font-black text-white leading-none">
                {stat.value}
              </span>
              <span
                className="text-[9px] font-black uppercase tracking-widest mt-1"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              >
                {stat.label}
              </span>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ── Boutons d'action + Feed ── */}
      <div className="relative z-10 px-4 pb-28 flex flex-col gap-2.5">
        {/* Séparateur */}
        <div
          className="h-px mb-1"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.07), transparent)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45 }}
        >
          <Link href="/match/create" className="btn-cod-red">
            <div>
              <p className="font-black text-white uppercase tracking-widest text-sm">Créer un match</p>
              <p className="text-white/55 text-xs font-medium mt-0.5">Lance une partie officielle</p>
            </div>
            <ChevronRight size={20} strokeWidth={2.5} className="text-white/60 flex-shrink-0" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.52 }}
        >
          <Link href="/match/join" className="btn-cod-dark">
            <div>
              <p className="font-black text-white uppercase tracking-widest text-sm">Rejoindre</p>
              <p className="text-white/35 text-xs font-medium mt-0.5">Code ou QR code</p>
            </div>
            <QrCode size={18} strokeWidth={1.5} className="text-white/25 flex-shrink-0" />
          </Link>
        </motion.div>

        {/* Feed */}
        <div className="w-full mt-6 pb-6">
          <p
            className="text-[9px] font-black uppercase tracking-[0.5em] mb-4"
            style={{ color: 'rgba(168,168,179,0.5)' }}
          >
            Matchs
          </p>
          <FeedTabs activeMatches={activeMatches} recentMatches={recentMatches} />
        </div>
      </div>
    </div>
  );
}

type FeedTabId = 'live' | 'recent';

function FeedTabs({ activeMatches, recentMatches }: { activeMatches: FeedMatch[]; recentMatches: FeedMatch[] }) {
  const [tab, setTab] = useState<FeedTabId>('live');
  const matches = tab === 'live' ? activeMatches : recentMatches;

  return (
    <div>
      <div
        className="flex mb-4"
        style={{ gap: 2, background: 'rgba(255,255,255,0.04)', borderRadius: 4, padding: 3 }}
      >
        {(['live', 'recent'] as FeedTabId[]).map((id) => {
          const label = id === 'live' ? 'En cours' : 'Terminés';
          return (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className="flex-1 py-1.5 text-[10px] font-black uppercase tracking-widest"
              style={{
                borderRadius: 3,
                background: tab === id ? 'rgba(255,255,255,0.07)' : 'transparent',
                color: tab === id ? '#e94560' : 'rgba(168,168,179,0.5)',
                border: tab === id ? '1px solid rgba(233,69,96,0.3)' : '1px solid transparent',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {matches.length === 0 ? (
        <p
          className="text-center text-xs py-6 uppercase tracking-widest"
          style={{ color: 'rgba(168,168,179,0.3)' }}
        >
          Aucun match {tab === 'live' ? 'en cours' : 'récent'}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((match, i) => (
            <MatchFeedCard key={match.id} match={match} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
