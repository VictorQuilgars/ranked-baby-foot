'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flag, Goal, Shield, Sparkles, Swords } from 'lucide-react';
import { apiRequest } from '@/lib/api';
import { createClient } from '@/lib/supabase/client';

type Team = 'A' | 'B';
type Position = 'attacker' | 'goalkeeper';

const TEAM_OPTIONS: Array<{ value: Team; label: string; accent: string }> = [
  { value: 'A', label: 'Équipe A', accent: '#00b4d8' },
  { value: 'B', label: 'Équipe B', accent: '#e94560' },
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
      className="min-h-screen px-5 pt-10 pb-28"
      style={{
        background:
          'radial-gradient(circle at top, rgba(233,69,96,0.2) 0%, rgba(15,52,96,0.38) 26%, #1a1a2e 72%)',
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
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-accent">Nouveau Match</p>
            <h1 className="mt-2 text-3xl font-black text-white">Créer un lobby</h1>
            <p className="mt-2 max-w-sm text-sm text-muted">
              Choisis ton camp, ton poste et un score cible. Le code du match sera généré automatiquement.
            </p>
          </div>
          <div
            className="flex h-14 w-14 items-center justify-center rounded-3xl"
            style={{
              background: 'linear-gradient(135deg, rgba(233,69,96,0.25), rgba(123,47,255,0.24))',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <Swords size={24} className="text-white" />
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Nom du match</span>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={50}
              placeholder="Pause de midi, table centrale..."
              className="rounded-2xl border border-white/10 bg-night-2 px-4 py-3 text-white outline-none transition focus:border-accent"
            />
          </label>

          <div className="rounded-3xl border border-white/8 bg-white/4 px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Score cible</p>
                <p className="mt-2 text-3xl font-black text-white">{scoreTarget}</p>
              </div>
              <Flag size={22} className="text-gold-ui" />
            </div>
            <input
              type="range"
              min={3}
              max={20}
              value={scoreTarget}
              onChange={(event) => setScoreTarget(Number(event.target.value))}
              className="mt-4 w-full accent-accent"
            />
            <div className="mt-2 flex justify-between text-xs text-muted">
              <span>3</span>
              <span>20</span>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Choisir mon équipe</span>
            <div className="grid grid-cols-2 gap-3">
              {TEAM_OPTIONS.map((option) => {
                const isActive = team === option.value;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setTeam(option.value)}
                    className="rounded-3xl px-4 py-4 text-left transition-all"
                    style={{
                      background: isActive
                        ? `linear-gradient(135deg, ${option.accent}, ${option.accent}cc)`
                        : 'rgba(255,255,255,0.04)',
                      border: isActive ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <p className="text-sm font-black text-white">{option.label}</p>
                    <p className="mt-1 text-xs text-white/80">{option.value === 'A' ? 'Côté bleu' : 'Côté rouge'}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted">Choisir mon poste</span>
            <div className="grid grid-cols-2 gap-3">
              {POSITION_OPTIONS.map((option) => {
                const isActive = position === option.value;
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setPosition(option.value)}
                    className="rounded-3xl px-4 py-4 text-left transition-all"
                    style={{
                      background: isActive
                        ? 'linear-gradient(135deg, rgba(123,47,255,0.95), rgba(88,34,216,0.95))'
                        : 'rgba(255,255,255,0.04)',
                      border: isActive ? '1px solid rgba(123,47,255,0.55)' : '1px solid rgba(255,255,255,0.08)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-black text-white">{option.label}</p>
                      <Icon size={18} className="text-white" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {error ? <p className="text-sm font-medium text-red-400">{error}</p> : null}

          <button
            type="button"
            onClick={createMatch}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-3 rounded-3xl px-5 py-4 text-base font-black text-white transition-all disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #e94560, #c73652)',
              boxShadow: '0 14px 30px rgba(233,69,96,0.35)',
            }}
          >
            <Sparkles size={18} />
            {isPending ? 'Création...' : 'Créer le match'}
          </button>
        </div>
      </motion.section>
    </div>
  );
}
