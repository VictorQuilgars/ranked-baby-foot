'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Search, ScanLine, Ticket } from 'lucide-react';
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
      className="min-h-screen px-5 pt-10 pb-28"
      style={{
        background:
          'radial-gradient(circle at top, rgba(0,180,216,0.18) 0%, rgba(15,52,96,0.4) 24%, #1a1a2e 72%)',
      }}
    >
      <motion.section
        className="rounded-[32px] p-6"
        style={{
          background: 'linear-gradient(145deg, rgba(22,33,62,0.96), rgba(15,52,96,0.9))',
          border: '1px solid rgba(255,255,255,0.08)',
          boxShadow: '0 30px 80px rgba(0,0,0,0.35)',
        }}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00b4d8]">Rejoindre</p>
            <h1 className="mt-2 text-3xl font-black text-white">Entrer un code</h1>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Rejoins un lobby existant avec le code à 6 caractères partagé par l’hôte.
            </p>
          </div>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(0,180,216,0.25), rgba(123,47,255,0.22))',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Ticket size={24} className="text-white" />
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-white/8 bg-white/4 px-5 py-5">
          <div className="flex items-center gap-3 text-sm text-muted">
            <Search size={16} />
            <span>Code du lobby</span>
          </div>

          <input
            value={code}
            onChange={(event) =>
              setCode(event.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6))
            }
            placeholder="AB12CD"
            className="mt-4 w-full rounded-3xl border border-white/10 bg-night-2 px-5 py-5 text-center text-3xl font-black uppercase tracking-[0.4em] text-white outline-none transition focus:border-[#00b4d8]"
          />

          <button
            type="button"
            onClick={lookupMatch}
            disabled={isPending}
            className="mt-5 inline-flex w-full items-center justify-center gap-3 rounded-3xl px-5 py-4 text-base font-black text-white transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #00b4d8, #0f83a6)',
              boxShadow: '0 14px 30px rgba(0,180,216,0.3)',
            }}
          >
            <Search size={18} />
            {isPending ? 'Recherche...' : 'Trouver le match'}
          </button>

          {error ? <p className="mt-4 text-sm font-medium text-red-400">{error}</p> : null}
        </div>

        <div
          className="mt-5 rounded-[28px] px-5 py-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-3">
            <ScanLine size={18} className="text-gold-ui" />
            <h2 className="text-sm font-black text-white">QR code et invitations</h2>
          </div>
          <p className="mt-3 text-sm text-muted">
            Le scan QR et la gestion d’invitations arrivent dans le prochain lot. Pour l’instant, le code lobby est le chemin le plus direct.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
