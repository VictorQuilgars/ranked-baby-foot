'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ChevronLeft, Flag, Goal, Shield, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { apiRequest } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

type Team = 'A' | 'B';
type Position = 'attacker' | 'goalkeeper';

const TEAM_OPTIONS: Array<{ value: Team; label: string; accent: string; sub: string }> = [
  { value: 'A', label: 'Équipe A', accent: '#00b4d8', sub: 'Côté bleu' },
  { value: 'B', label: 'Équipe B', accent: '#e94560', sub: 'Côté rouge' },
];

const POSITION_OPTIONS: Array<{ value: Position; label: string; icon: typeof Goal }> = [
  { value: 'attacker', label: 'Attaquant', icon: Goal },
  { value: 'goalkeeper', label: 'Gardien', icon: Shield },
];

export function CreateMatchClient() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [scoreTarget, setScoreTarget] = useState(10);
  const [team, setTeam] = useState<Team>('A');
  const [position, setPosition] = useState<Position>('attacker');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function createMatch() {
    setError(null);

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const token = session?.access_token;

      if (!token) {
        setError('Session introuvable, reconnecte-toi.');
        return;
      }

      try {
        const response = await apiRequest<{ data: { id: string } }>('/api/matches', {
          method: 'POST',
          token,
          body: {
            name: name.trim() || undefined,
            scoreTarget,
            team,
            position,
          },
        });

        router.push(`/match/${response.data.id}`);
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : 'Création impossible');
      }
    });
  }

  return (
    <div
      className="min-h-screen pb-28"
      style={{ background: '#07080d' }}
    >
      {/* Atmospheric glow */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '480px',
          height: '320px',
          background: 'radial-gradient(ellipse at top, rgba(233,69,96,0.18) 0%, transparent 70%)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* Page header strip */}
      <div
        className="relative z-10 flex items-center gap-3 px-4"
        style={{
          height: 56,
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          background: 'rgba(0,0,0,0.3)',
        }}
      >
        <Link href="/home" className="flex items-center text-white/60 hover:text-white transition-colors">
          <ChevronLeft size={20} />
        </Link>
        <span
          className="text-[11px] font-black uppercase tracking-[0.4em] text-white"
        >
          Créer un match
        </span>
      </div>

      <div className="relative z-10 px-4 pt-5">
        <motion.div
          className="flex flex-col gap-5"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
        >
          {/* Name input */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[9px] font-black uppercase tracking-[0.5em]"
              style={{ color: 'rgba(168,168,179,0.7)' }}
            >
              Nom du match
            </span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              placeholder="Pause de midi, table centrale..."
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 4,
                padding: '12px 14px',
                color: '#fff',
                fontSize: 14,
                outline: 'none',
                width: '100%',
                transition: 'border-color 0.2s',
              }}
              className="focus:border-accent placeholder:text-white/30"
            />
          </div>

          {/* Score target panel */}
          <div
            style={{
              background: 'rgba(255,255,255,0.025)',
              border: '1px solid rgba(255,255,255,0.06)',
              borderRadius: 4,
              padding: '16px',
            }}
          >
            <div className="flex items-center justify-between gap-4">
              <div>
                <p
                  className="text-[9px] font-black uppercase tracking-[0.5em]"
                  style={{ color: 'rgba(168,168,179,0.7)' }}
                >
                  Score cible
                </p>
                <p className="mt-2 text-4xl font-black text-white">{scoreTarget}</p>
              </div>
              <Flag size={20} style={{ color: '#f5a623', opacity: 0.8 }} />
            </div>
            <input
              type="range"
              min={3}
              max={20}
              value={scoreTarget}
              onChange={(event) => setScoreTarget(Number(event.target.value))}
              className="mt-4 w-full accent-accent"
            />
            <div
              className="mt-2 flex justify-between text-[10px] font-bold"
              style={{ color: 'rgba(168,168,179,0.5)' }}
            >
              <span>3</span>
              <span>20</span>
            </div>
          </div>

          {/* Team selector */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[9px] font-black uppercase tracking-[0.5em]"
              style={{ color: 'rgba(168,168,179,0.7)' }}
            >
              Choisir mon équipe
            </span>
            <div className="grid grid-cols-2 gap-2">
              {TEAM_OPTIONS.map((option) => {
                const isActive = team === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTeam(option.value)}
                    className="px-4 py-4 text-left transition-all"
                    style={{
                      borderRadius: 4,
                      background: isActive ? option.accent : 'rgba(255,255,255,0.04)',
                      border: isActive
                        ? `1px solid ${option.accent}`
                        : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <p className="text-sm font-black uppercase tracking-wider text-white">
                      {option.label}
                    </p>
                    <p className="mt-1 text-[11px] text-white/70">{option.sub}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Position selector */}
          <div className="flex flex-col gap-2">
            <span
              className="text-[9px] font-black uppercase tracking-[0.5em]"
              style={{ color: 'rgba(168,168,179,0.7)' }}
            >
              Choisir mon poste
            </span>
            <div className="grid grid-cols-2 gap-2">
              {POSITION_OPTIONS.map((option) => {
                const isActive = position === option.value;
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPosition(option.value)}
                    className="px-4 py-4 text-left transition-all"
                    style={{
                      borderRadius: 4,
                      background: isActive
                        ? 'rgba(233,69,96,0.12)'
                        : 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      borderLeft: isActive
                        ? '3px solid #e94560'
                        : '1px solid rgba(255,255,255,0.07)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black uppercase tracking-wider text-white">
                        {option.label}
                      </p>
                      <Icon size={17} style={{ color: isActive ? '#e94560' : 'rgba(255,255,255,0.5)' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? (
            <p className="text-sm font-medium text-red-400">{error}</p>
          ) : null}

          <button
            type="button"
            onClick={createMatch}
            disabled={isPending}
            className="btn-cod-red justify-center gap-3"
          >
            <Sparkles size={17} />
            {isPending ? 'Création...' : 'Créer le match'}
          </button>
        </motion.div>
      </div>
    </div>
  );
}
