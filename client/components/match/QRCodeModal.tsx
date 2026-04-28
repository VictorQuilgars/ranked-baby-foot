'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import QRCode from 'qrcode';
import { X } from 'lucide-react';

interface QRCodeModalProps {
  isOpen: boolean;
  code: string;
  matchId: string;
  onClose: () => void;
}

export function QRCodeModal({ isOpen, code, matchId, onClose }: QRCodeModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const url = `${window.location.origin}/match/join?code=${code}`;
    QRCode.toCanvas(canvasRef.current, url, {
      width: 260,
      margin: 2,
      color: { dark: '#ffffff', light: '#07080d' },
    }).catch(() => setError(true));
  }, [isOpen, code, matchId]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center px-8"
          style={{ background: 'rgba(0,0,0,0.92)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="flex flex-col items-center gap-5 w-full max-w-xs"
            initial={{ scale: 0.85, y: 20 }}
            animate={{ scale: 1, y: 0 }}
            exit={{ scale: 0.85, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full">
              <p
                className="text-[9px] font-black uppercase tracking-[0.5em]"
                style={{ color: 'rgba(168,168,179,0.7)' }}
              >
                Rejoindre le match
              </p>
              <button type="button" onClick={onClose} style={{ color: 'rgba(168,168,179,0.5)' }}>
                <X size={18} />
              </button>
            </div>

            <div
              style={{
                background: '#07080d',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: 6,
                padding: 16,
              }}
            >
              {error ? (
                <p className="text-sm text-red-400 text-center">Erreur de génération QR</p>
              ) : (
                <canvas ref={canvasRef} />
              )}
            </div>

            <p className="text-4xl font-black text-white tracking-[0.4em]">{code}</p>
            <p className="text-xs text-center" style={{ color: 'rgba(168,168,179,0.5)' }}>
              Scanne le QR ou entre le code manuellement
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
