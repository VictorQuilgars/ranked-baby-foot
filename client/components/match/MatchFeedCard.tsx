'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Swords, Trophy } from 'lucide-react';
import type { RankName } from '@/types/player';

type FeedPlayer = {
  team: 'A' | 'B';
  position: 'attacker' | 'goalkeeper';
  players: {
    id: string;
    username: string;
    avatar_url: string | null;
    rank: RankName;
    rank_tier: number;
    placement_matches_left: number;
  } | null;
};

export type FeedMatch = {
  id: string;
  code: string;
  name: string | null;
  status: string;
  score_team_a: number;
  score_team_b: number;
  winner_team: string | null;
  score_target: number;
  started_at: string | null;
  finished_at: string | null;
  created_at: string;
  match_players: FeedPlayer[];
};

export function MatchFeedCard({ match, index }: { match: FeedMatch; index: number }) {
  const isFinished = match.status === 'finished';
  const teamA = match.match_players.filter((p) => p.team === 'A');
  const teamB = match.match_players.filter((p) => p.team === 'B');
  const accentA = '#00b4d8';
  const accentB = '#e94560';
  const winnerAccent = match.winner_team === 'A' ? accentA : match.winner_team === 'B' ? accentB : '#f5a623';

  function renderTeam(players: FeedPlayer[], accent: string) {
    return (
      <div className="flex flex-col gap-1.5 flex-1">
        {players.map((p, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="flex-shrink-0 h-7 w-7 rounded-sm flex items-center justify-center text-xs font-black overflow-hidden"
              style={{ background: `${accent}18`, border: `1px solid ${accent}30`, color: accent }}
            >
              {p.players?.avatar_url
                ? <img src={p.players.avatar_url} alt="" className="h-7 w-7 object-cover" />
                : (p.players?.username[0].toUpperCase() ?? '?')
              }
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate leading-none">
                {p.players?.username ?? '—'}
              </p>
              <p className="text-[9px] uppercase tracking-wider" style={{ color: 'rgba(168,168,179,0.4)' }}>
                {p.position === 'attacker' ? 'ATK' : 'GK'}
              </p>
            </div>
          </div>
        ))}
        {players.length === 0 && (
          <p className="text-xs" style={{ color: 'rgba(168,168,179,0.3)' }}>—</p>
        )}
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.28 }}
    >
      <Link href={`/match/${match.id}`}>
        <div
          style={{
            background: 'rgba(255,255,255,0.025)',
            border: isFinished
              ? `1px solid ${winnerAccent}22`
              : '1px solid rgba(255,255,255,0.06)',
            borderLeft: isFinished
              ? `3px solid ${winnerAccent}88`
              : `3px solid rgba(255,255,255,0.12)`,
            borderRadius: 4,
            padding: '14px 16px',
          }}
        >
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {isFinished
                ? <Trophy size={12} style={{ color: winnerAccent }} />
                : <Swords size={12} style={{ color: '#e94560' }} />
              }
              <span
                className="text-[9px] font-black uppercase tracking-[0.4em]"
                style={{ color: isFinished ? `${winnerAccent}88` : 'rgba(168,168,179,0.6)' }}
              >
                {isFinished ? 'Terminé' : 'En cours'}
              </span>
            </div>
            <span className="text-[10px] font-bold" style={{ color: 'rgba(168,168,179,0.4)' }}>
              {match.name ?? match.code}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {renderTeam(teamA, accentA)}
            <div className="flex flex-col items-center flex-shrink-0 gap-0.5">
              <p className="text-2xl font-black text-white leading-none">
                {match.score_team_a}
                <span className="text-lg" style={{ color: 'rgba(255,255,255,0.3)' }}> — </span>
                {match.score_team_b}
              </p>
              {!isFinished && (
                <p
                  className="text-[9px] font-black uppercase tracking-wider"
                  style={{ color: 'rgba(168,168,179,0.4)' }}
                >
                  / {match.score_target}
                </p>
              )}
            </div>
            {renderTeam(teamB, accentB)}
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
