'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, Swords } from 'lucide-react';
import { useInvitations } from '@/hooks/useInvitations';

interface InvitationBannerProps {
  userId: string;
}

export function InvitationBanner({ userId }: InvitationBannerProps) {
  const router = useRouter();
  const { invitations, dismissInvitation } = useInvitations(userId);
  const first = invitations[0] ?? null;

  async function handleAccept() {
    if (!first) return;
    await dismissInvitation(first.id, 'accept');
    if (first.matches?.id) router.push(`/match/${first.matches.id}`);
  }

  async function handleDecline() {
    if (!first) return;
    await dismissInvitation(first.id, 'decline');
  }

  return (
    <AnimatePresence>
      {first && (
        <motion.div
          className="fixed top-0 left-0 right-0 z-40 px-4 pt-3 pb-2"
          style={{ background: 'rgba(7,8,13,0.97)', borderBottom: '1px solid rgba(233,69,96,0.3)' }}
          initial={{ y: -80 }}
          animate={{ y: 0 }}
          exit={{ y: -80 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div className="flex items-center gap-3 max-w-md mx-auto">
            <Swords size={16} style={{ color: '#e94560', flexShrink: 0 }} />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-white truncate">
                {first.inviter?.username ?? 'Quelqu\'un'} t&apos;invite
              </p>
              <p className="text-[10px]" style={{ color: 'rgba(168,168,179,0.6)' }}>
                {first.matches?.name ?? `Match ${first.matches?.code ?? ''}`}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAccept}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-black text-white"
              style={{ background: '#e94560', borderRadius: 3 }}
            >
              <Check size={13} />
              Rejoindre
            </button>
            <button
              type="button"
              onClick={handleDecline}
              style={{ color: 'rgba(168,168,179,0.5)' }}
            >
              <X size={18} />
            </button>
          </div>
          {invitations.length > 1 && (
            <p
              className="text-center text-[9px] mt-1 font-bold uppercase"
              style={{ color: 'rgba(168,168,179,0.4)', letterSpacing: '0.3em' }}
            >
              +{invitations.length - 1} autre{invitations.length > 2 ? 's' : ''} invitation{invitations.length > 2 ? 's' : ''}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
