'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { apiRequest } from '@/lib/api';

export type PendingInvitation = {
  id: string;
  status: string;
  created_at: string;
  expires_at: string;
  matches: { id: string; code: string; name: string | null } | null;
  inviter: { id: string; username: string; avatar_url: string | null; rank: string; rank_tier: number } | null;
};

export function useInvitations(userId: string | null) {
  const [invitations, setInvitations] = useState<PendingInvitation[]>([]);

  const fetchPending = useCallback(async () => {
    if (!userId) return;
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const result = await apiRequest<{ data: PendingInvitation[] }>('/api/invitations/pending', {
        token: session.access_token,
      });
      setInvitations(result.data ?? []);
    } catch {
      // silent
    }
  }, [userId]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel(`invitations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'invitations',
          filter: `invited_id=eq.${userId}`,
        },
        () => { fetchPending(); },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, fetchPending]);

  const dismissInvitation = useCallback(
    async (invitationId: string, action: 'accept' | 'decline') => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      try {
        await apiRequest(`/api/invitations/${invitationId}/${action}`, {
          method: 'POST',
          token: session.access_token,
        });
        setInvitations((prev) => prev.filter((inv) => inv.id !== invitationId));
      } catch {
        // silent
      }
    },
    [],
  );

  return { invitations, dismissInvitation, refetch: fetchPending };
}
