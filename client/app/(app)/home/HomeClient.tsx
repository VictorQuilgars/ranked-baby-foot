'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, QrCode } from 'lucide-react';
import { RankBadge } from '@/components/rank/RankBadge';
import { SRBar } from '@/components/rank/SRBar';
import { RANK_COLORS, formatRankLabel, type RankName } from '@/types/player';

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
}

export function HomeClient({ player }: HomeClientProps) {
  if (!player) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-muted text-sm">Erreur lors du chargement du profil.</p>
    </div>
  );

  const isPlacement = player.placement_matches_left > 0;
  const rank = player.rank as RankName;
  const rankColor = RANK_COLORS[rank];

  return (
    <div
      className="min-h-screen flex flex-col relative overflow-hidden"
      style={{ background: '#0d111e' }}
    >
      {/* Fond atmosphérique — glow couleur du rang */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 70% 45% at 50% 38%, ${rankColor}22 0%, transparent 70%)`,
        }}
      />
      {/* Ligne de séparation subtile en haut */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${rankColor}55, transparent)` }}
      />

      {/* Zone centrale — Blason héro */}
      <div className="relative z-10 flex-1 flex flex-col items-center justify-start pt-14 px-5">

        {/* Label RANKED PLAY style CoD */}
        <motion.p
          className="text-[10px] font-black uppercase tracking-[0.5em] mb-6"
          style={{ color: `${rankColor}aa` }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          ★ Ranked Play ★
        </motion.p>

        {/* Blason — grand, sans cadre */}
        <motion.div
          className="relative flex items-center justify-center"
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        >
          {/* Glow derrière le badge */}
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              width: '260px',
              height: '260px',
              background: `radial-gradient(circle, ${rankColor}30 0%, transparent 70%)`,
              filter: 'blur(20px)',
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
          className="flex flex-col items-center gap-1 mt-4"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          {isPlacement ? (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted">En placement</p>
              <p className="text-3xl font-black text-white">
                {player.placement_matches_left} matchs restants
              </p>
            </>
          ) : (
            <>
              <p className="text-[10px] font-black uppercase tracking-[0.35em] text-muted">Rang</p>
              <h1
                className="text-4xl font-black uppercase tracking-widest"
                style={{ color: rankColor, filter: `drop-shadow(0 0 16px ${rankColor}88)` }}
              >
                {formatRankLabel(rank, player.rank_tier)}
              </h1>
              <p className="text-2xl font-black text-white mt-1">
                {player.rank_points}{' '}
                <span className="text-sm font-black uppercase tracking-widest text-muted">SR</span>
              </p>
            </>
          )}
        </motion.div>

        {/* Barre SR */}
        {!isPlacement && (
          <motion.div
            className="w-full mt-5"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
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
      </div>

      {/* Boutons d'action — ancrés en bas */}
      <div className="relative z-10 px-5 pb-28 flex flex-col gap-4 mt-6">
        {/* Séparateur */}
        <div
          className="h-px w-full mb-2"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)' }}
        />

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <Link href="/match/create" className="btn-cr-red">
            <div>
              <p className="font-black text-white text-lg uppercase tracking-wide">Créer un match</p>
              <p className="text-white/70 text-sm font-medium">Lance une partie officielle</p>
            </div>
            <Plus size={28} strokeWidth={2.5} className="text-white" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.48 }}
        >
          <Link href="/match/join" className="btn-cr-dark">
            <div>
              <p className="font-black text-white text-lg uppercase tracking-wide">Rejoindre</p>
              <p className="text-muted text-sm font-medium">Code ou QR code</p>
            </div>
            <QrCode size={28} strokeWidth={1.8} className="text-muted" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
