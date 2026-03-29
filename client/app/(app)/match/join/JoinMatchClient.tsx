'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Search, ScanLine } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';

export function JoinMatchClient() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function lookupMatch() {
    const normalizedCode = code.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

    if (normalizedCode.length !== 6) {
      setError('Entre un code de 6 caractères.');
      return;
    }

    setError(null);

    startTransition(async () => {
      try {
        const response = await apiRequest<{ data: { id: string } }>(`/api/matches/code/${normalizedCode}`);
        router.push(`/match/${response.data.id}`);
      } catch (lookupError) {
        setError(lookupError instanceof Error ? lookupError.message : 'Match introuvable');
      }
    });
  }

  return (
    <div
      className="min-h-screen pb-28"
      style={{ background: '#07080d' }}
    >
      {/* Page header strip */}
      <div
        className="flex items-center gap-3 px-4"
        style={{
          height: 56,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <Link href="/home" className="flex items-center text-white/60 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-white">
          Rejoindre
        </span>
      </div>

      <div className="px-4 pt-5">
        <motion.div
          className="flex flex-col gap-4"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Code input panel */}
          <div
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 4,
              padding: '20px 16px',
            }}
          >
            <p
              className="text-[9px] font-black uppercase tracking-[0.5em]"
              style={{ color: 'rgba(168,168,179,0.7)' }}
            >
              Code du lobby
            </p>

            <input
              value={code}
              onChange={(event) =>
                setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
              }
              placeholder="AB12CD"
              style={{
                marginTop: 14,
                width: '100%',
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                padding: '18px 16px',
                color: '#fff',
                fontSize: 32,
                fontWeight: 900,
                textAlign: 'center',
                letterSpacing: '0.5em',
                textTransform: 'uppercase',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
              className="focus:border-accent placeholder:text-white/20"
            />

            <button
              type="button"
              onClick={lookupMatch}
              disabled={isPending}
              className="btn-cod-red justify-center gap-3 mt-5 w-full"
            >
              <Search size={17} />
              {isPending ? 'Recherche...' : 'Trouver le match'}
            </button>

            {error ? (
              <p className="mt-4 text-sm font-medium text-red-400">{error}</p>
            ) : null}
          </div>

          {/* QR / invitations info panel */}
          <div
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderLeft: '3px solid rgba(255,255,255,0.15)',
              borderRadius: 4,
              padding: '16px',
            }}
          >
            <div className="flex items-center gap-3">
              <ScanLine size={17} style={{ color: 'rgba(168,168,179,0.6)' }} />
              <p
                className="text-[9px] font-black uppercase tracking-[0.5em]"
                style={{ color: 'rgba(168,168,179,0.7)' }}
              >
                QR code &amp; invitations
              </p>
            </div>
            <p className="mt-3 text-sm" style={{ color: 'rgba(168,168,179,0.6)', lineHeight: 1.6 }}>
              Le scan QR et la gestion d&apos;invitations arrivent dans le prochain lot. Pour l&apos;instant, le code lobby est le chemin le plus direct.
            </p>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
