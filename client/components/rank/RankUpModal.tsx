'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { RankBadge } from './RankBadge';
import type { RankName } from '@/types/player';

interface RankUpModalProps {
  isOpen: boolean;
  newRank: RankName;
  newTier: number;
  onClose: () => void;
}

export function RankUpModal({ isOpen, newRank, newTier, onClose }: RankUpModalProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
            style={{
              width: 400,
              height: 300,
              background: 'radial-gradient(ellipse at top, rgba(245,166,35,0.25) 0%, transparent 70%)',
              filter: 'blur(30px)',
            }}
          />

          <motion.div
            className="relative flex flex-col items-center gap-6 px-8"
            initial={{ scale: 0.7, y: 40 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.7, y: 40 }}
            transition={{ type: 'spring', stiffness: 280, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
          >
            <p
              className="text-[9px] font-black uppercase tracking-[0.6em]"
              style={{ color: 'rgba(245,166,35,0.7)' }}
            >
              ◆ Promotion ◆
            </p>

            <motion.div
              animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <RankBadge rank={newRank} tier={newTier} size="hero" showLabel animated />
            </motion.div>

            <p className="text-2xl font-black text-white uppercase tracking-wide text-center">
              Rang supérieur !
            </p>

            <button
              type="button"
              onClick={onClose}
              className="mt-4 px-8 py-3 text-sm font-black uppercase tracking-widest text-white"
              style={{
                background: 'rgba(245,166,35,0.15)',
                border: '1px solid rgba(245,166,35,0.4)',
                borderRadius: 3,
              }}
            >
              Continuer
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
