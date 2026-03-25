'use client';

import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const supabase = createClient();

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  async function signInWithApple() {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }

  return (
    <main className="min-h-screen bg-night flex flex-col items-center justify-between py-16 px-6"
      style={{
        background: 'radial-gradient(ellipse at top, #0f3460 0%, #1a1a2e 60%)',
      }}
    >
      {/* Logo + titre */}
      <motion.div
        className="flex flex-col items-center gap-5 mt-8"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <motion.div
          className="w-24 h-24 rounded-3xl flex items-center justify-center text-5xl"
          style={{
            background: 'radial-gradient(circle at 35% 30%, rgba(233,69,96,0.5), rgba(15,52,96,0.8))',
            border: '3px solid rgba(233,69,96,0.6)',
            boxShadow: '0 0 40px rgba(233,69,96,0.35), 0 8px 0 rgba(0,0,0,0.4), inset 0 1px 0 rgba(233,69,96,0.5)',
          }}
          animate={{ rotate: [0, -5, 5, -3, 3, 0] }}
          transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
        >
          ⚽
        </motion.div>
        <div className="flex flex-col items-center gap-1">
          <h1 className="text-4xl font-black text-white tracking-tight text-center leading-none">
            RANKED
          </h1>
          <h1
            className="text-5xl font-black tracking-tight text-center leading-none"
            style={{
              background: 'linear-gradient(135deg, #ff5c70, #e94560)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textShadow: 'none',
              filter: 'drop-shadow(0 0 20px rgba(233,69,96,0.5))',
            }}
          >
            BABY FOOT
          </h1>
        </div>
        <p className="text-muted text-sm text-center font-semibold tracking-wide uppercase">
          Grimpe dans les rangs. Prouve ta valeur.
        </p>
      </motion.div>

      {/* Rangs preview (décoratif) */}
      <motion.div
        className="flex gap-3 items-end"
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        {[
          { emoji: '🥉', color: '#cd7f32', label: 'Bronze', delay: 0, size: 'w-11 h-11 text-2xl' },
          { emoji: '💠', color: '#00b4d8', label: 'Platine', delay: 0.1, size: 'w-12 h-12 text-2xl' },
          { emoji: '💎', color: '#7b2fff', label: 'Diamond', delay: 0.2, size: 'w-14 h-14 text-3xl' },
          { emoji: '🔴', color: '#dc143c', label: 'Crimson', delay: 0.3, size: 'w-12 h-12 text-2xl' },
          { emoji: '✨', color: '#ff00ff', label: 'Iridescent', delay: 0.4, size: 'w-11 h-11 text-2xl' },
        ].map(({ emoji, color, label, delay, size }) => (
          <motion.div
            key={label}
            className="flex flex-col items-center gap-1.5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 + delay, duration: 0.4 }}
          >
            <div
              className={`${size} rounded-2xl flex items-center justify-center relative`}
              style={{
                background: `radial-gradient(circle at 35% 30%, ${color}55, ${color}15)`,
                border: `2.5px solid ${color}`,
                boxShadow: `0 0 18px ${color}55, 0 4px 0 rgba(0,0,0,0.4), inset 0 1px 0 ${color}77`,
              }}
            >
              {emoji}
            </div>
            <span className="text-[9px] font-black uppercase tracking-widest" style={{ color }}>
              {label}
            </span>
          </motion.div>
        ))}
      </motion.div>

      {/* Boutons de connexion */}
      <motion.div
        className="w-full flex flex-col gap-3 max-w-sm"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <button onClick={signInWithGoogle} className="btn-cr-dark justify-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          <span className="font-black uppercase tracking-wide">Continuer avec Google</span>
        </button>

        <button onClick={signInWithApple} className="btn-cr-dark justify-center gap-3">
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="white">
            <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
          </svg>
          <span className="font-black uppercase tracking-wide">Continuer avec Apple</span>
        </button>

        <p className="text-center text-xs text-muted mt-1 font-medium">
          En continuant, tu acceptes les règles du classement.
        </p>
      </motion.div>
    </main>
  );
}
