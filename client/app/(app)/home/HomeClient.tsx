'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, QrCode } from 'lucide-react';
import { RankBadge } from '@/components/rank/RankBadge';
import { SRBar } from '@/components/rank/SRBar';
import type { RankName } from '@/types/player';

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

  return (
    <div
      className="min-h-screen"
      style={{ background: 'radial-gradient(ellipse at top, #0f3460 0%, #1a1a2e 70%)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-12 pb-4">
        <div>
          <p className="text-muted text-sm">Bienvenue,</p>
          <h2 className="text-xl font-black text-white">{player.username}</h2>
        </div>
        {player.avatar_url ? (
          <img
            src={player.avatar_url}
            alt={player.username}
            className="w-10 h-10 rounded-full border-2 border-white/20"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-night-3 border-2 border-white/20 flex items-center justify-center text-lg font-black text-accent">
            {player.username[0].toUpperCase()}
          </div>
        )}
      </div>

      {/* Carte de rang principale — style Clash Royale */}
      <motion.div
        className="mx-5 rounded-3xl p-6 flex flex-col items-center gap-4"
        style={{
          background: 'linear-gradient(135deg, #16213e, #0f3460)',
          border: '1.5px solid rgba(255,255,255,0.1)',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Badge de rang — centré, grand */}
        <RankBadge
          rank={rank}
          tier={player.rank_tier}
          isPlacement={isPlacement}
          size="xl"
          showLabel={true}
          animated={true}
        />

        {/* SR + barre de progression */}
        {!isPlacement && (
          <div className="w-full">
            <SRBar
              sr={player.rank_points}
              rank={rank}
              tier={player.rank_tier}
              animated={true}
              showNumbers={true}
            />
          </div>
        )}

        {isPlacement && (
          <p className="text-muted text-sm text-center">
            {player.placement_matches_left} match{player.placement_matches_left > 1 ? 's' : ''} de placement restant{player.placement_matches_left > 1 ? 's' : ''}
          </p>
        )}

        {/* Stats rapides */}
        <div className="flex gap-6 mt-2">
          {[
            { label: 'Victoires', value: player.wins, color: '#22c55e' },
            { label: 'Défaites', value: player.losses, color: '#ef4444' },
            { label: 'Matchs', value: player.total_games, color: '#a8a8b3' },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col items-center gap-1">
              <span className="text-2xl font-black" style={{ color }}>{value}</span>
              <span className="text-xs text-muted">{label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Boutons d'action */}
      <div className="px-5 mt-6 flex flex-col gap-3">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href="/match/create"
            className="flex items-center justify-between w-full py-4 px-5 rounded-2xl active:scale-95 transition-all duration-150"
            style={{
              background: 'linear-gradient(135deg, #e94560, #c73652)',
              boxShadow: '0 8px 25px rgba(233, 69, 96, 0.4)',
            }}
          >
            <div>
              <p className="font-black text-white text-lg">Créer un match</p>
              <p className="text-white/70 text-sm">Lance une partie officielle</p>
            </div>
            <Plus size={28} strokeWidth={2.5} className="text-white" />
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Link
            href="/match/join"
            className="flex items-center justify-between w-full py-4 px-5 rounded-2xl active:scale-95 transition-all duration-150"
            style={{
              background: 'linear-gradient(135deg, #16213e, #0f3460)',
              border: '1.5px solid rgba(255,255,255,0.1)',
            }}
          >
            <div>
              <p className="font-black text-white text-lg">Rejoindre</p>
              <p className="text-muted text-sm">Code ou QR code</p>
            </div>
            <QrCode size={28} strokeWidth={1.8} className="text-muted" />
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
