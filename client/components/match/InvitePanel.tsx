'use client';

import { useState, useTransition } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, UserPlus, Check } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';
import { RankBadge } from '@/components/rank/RankBadge';
import type { RankName } from '@/types/player';

type SearchedPlayer = {
  id: string;
  username: string;
  avatar_url: string | null;
  rank: RankName;
  rank_tier: number;
};

interface InvitePanelProps {
  matchId: string;
  currentUserId: string;
  alreadyInvited: string[];
}

async function getToken() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token ?? null;
}

export function InvitePanel({ matchId, currentUserId, alreadyInvited }: InvitePanelProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchedPlayer[]>([]);
  const [invited, setInvited] = useState<Set<string>>(new Set());
  const [, startSearch] = useTransition();
  const [isSending, startSend] = useTransition();

  function search(q: string) {
    setQuery(q);
    if (q.length < 2) {
      setResults([]);
      return;
    }
    startSearch(async () => {
      try {
        const token = await getToken();
        const res = await apiRequest<{ data: SearchedPlayer[] }>(
          `/api/players/search?q=${encodeURIComponent(q)}`,
          { token: token ?? undefined },
        );
        setResults((res.data ?? []).filter((p) => p.id !== currentUserId));
      } catch {
        setResults([]);
      }
    });
  }

  function invite(playerId: string) {
    startSend(async () => {
      try {
        const token = await getToken();
        await apiRequest('/api/invitations', {
          method: 'POST',
          token: token ?? undefined,
          body: { matchId, invitedId: playerId },
        });
      } catch {
        // silent — may already be invited
      } finally {
        setInvited((prev) => new Set(prev).add(playerId));
      }
    });
  }

  return (
    <div
      style={{
        background: 'rgba(255,255,255,0.025)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 4,
        padding: '16px',
      }}
    >
      <p
        className="text-[9px] font-black uppercase tracking-[0.5em] mb-3"
        style={{ color: 'rgba(168,168,179,0.7)' }}
      >
        Inviter des joueurs
      </p>

      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2"
          style={{ color: 'rgba(168,168,179,0.4)' }}
        />
        <input
          value={query}
          onChange={(e) => search(e.target.value)}
          placeholder="Rechercher un pseudo..."
          className="w-full pl-9 pr-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 3,
          }}
        />
      </div>

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            className="mt-2 flex flex-col gap-1"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {results.map((player) => {
              const isAlreadyIn = alreadyInvited.includes(player.id);
              const hasSent = invited.has(player.id);
              const disabled = isAlreadyIn || hasSent || isSending;
              return (
                <div
                  key={player.id}
                  className="flex items-center gap-3 px-3 py-2"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 3,
                  }}
                >
                  <div
                    className="flex h-8 w-8 items-center justify-center text-sm font-black flex-shrink-0 rounded-sm overflow-hidden"
                    style={{ background: 'rgba(255,255,255,0.06)', color: '#e94560' }}
                  >
                    {player.avatar_url
                      ? (
                          <img src={player.avatar_url} alt={player.username} className="h-8 w-8 object-cover" />
                        )
                      : player.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-white truncate">{player.username}</p>
                  </div>
                  <RankBadge rank={player.rank} tier={player.rank_tier} size="sm" showLabel={false} animated={false} />
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => invite(player.id)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-black"
                    style={{
                      background: disabled ? 'rgba(255,255,255,0.05)' : 'rgba(233,69,96,0.15)',
                      border: `1px solid ${disabled ? 'rgba(255,255,255,0.08)' : 'rgba(233,69,96,0.3)'}`,
                      borderRadius: 3,
                      color: disabled ? 'rgba(168,168,179,0.4)' : '#e94560',
                    }}
                  >
                    {disabled ? <Check size={13} /> : <UserPlus size={13} />}
                  </button>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
