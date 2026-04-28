'use client';

import { useEffect, useRef } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

interface QRScannerProps {
  isOpen: boolean;
  onResult: (code: string) => void;
  onClose: () => void;
}

export function QRScanner({ isOpen, onResult, onClose }: QRScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const onResultRef = useRef(onResult);
  const SCANNER_ID = 'qr-reader';

  useEffect(() => {
    onResultRef.current = onResult;
  });

  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(() => {
      const scanner = new Html5Qrcode(SCANNER_ID);
      scannerRef.current = scanner;

      scanner
        .start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            let code = decodedText.trim().toUpperCase();
            const urlMatch = code.match(/[?&]CODE=([A-Z0-9]{6})/i);
            if (urlMatch) code = urlMatch[1].toUpperCase();
            else code = code.replace(/[^A-Z0-9]/g, '').slice(0, 6);

            if (code.length === 6) {
              scanner.stop().catch(() => null);
              onResultRef.current(code);
            }
          },
          () => null,
        )
        .catch(() => null);
    }, 200);

    return () => {
      clearTimeout(timer);
      scannerRef.current?.stop().catch(() => null);
      scannerRef.current = null;
    };
  }, [isOpen]);

  function handleClose() {
    scannerRef.current?.stop().catch(() => null);
    onClose();
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex flex-col"
          style={{ background: '#07080d' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div
            className="flex items-center justify-between px-4 flex-shrink-0"
            style={{
              height: 56,
              borderBottom: '1px solid rgba(255,255,255,0.07)',
              background: 'rgba(0,0,0,0.4)',
            }}
          >
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white">
              Scanner QR
            </p>
            <button type="button" onClick={handleClose} style={{ color: 'rgba(168,168,179,0.6)' }}>
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 flex flex-col items-center justify-center gap-6 px-6">
            <div
              id={SCANNER_ID}
              style={{
                width: '100%',
                maxWidth: 320,
                borderRadius: 4,
                overflow: 'hidden',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
            <p className="text-sm text-center" style={{ color: 'rgba(168,168,179,0.6)' }}>
              Pointe la caméra vers le QR code du lobby
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
