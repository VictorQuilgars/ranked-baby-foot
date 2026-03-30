'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { MatchLobby } from '@/app/(app)/match/[id]/MatchLobbyClient';

interface UseMatchReturn {
  match: MatchLobby;
}

/**
 * Gère l'état d'un match avec synchronisation Supabase Realtime.
 *
 * Subscriptions actives :
 * - `matches`       UPDATE → met à jour status, score, winner en local
 * - `match_players` *      → déclenche router.refresh() pour re-fetch les données joueurs
 */
export function useMatch(initialMatch: MatchLobby): UseMatchReturn {
  const router = useRouter();
  const [match, setMatch] = useState<MatchLobby>(initialMatch);

  // Resync quand le Server Component re-rend (après router.refresh())
  useEffect(() => {
    setMatch(initialMatch);
  }, [initialMatch]);

  // Realtime
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`match:${initialMatch.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${initialMatch.id}`,
        },
        (payload) => {
          setMatch((prev) => ({
            ...prev,
            status:       payload.new.status,
            score_team_a: payload.new.score_team_a,
            score_team_b: payload.new.score_team_b,
            winner_team:  payload.new.winner_team  ?? null,
            finished_at:  payload.new.finished_at  ?? null,
          }));
        },
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'match_players',
          filter: `match_id=eq.${initialMatch.id}`,
        },
        () => {
          router.refresh();
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [initialMatch.id, router]);

  return { match };
}
