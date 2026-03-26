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
    <main
      className="min-h-screen flex flex-col items-center justify-between py-14 px-6 relative overflow-hidden"
      style={{ background: 'linear-gradient(180deg, #080c18 0%, #0d111e 50%, #0a0e1a 100%)' }}
    >
      {/* Glow d'ambiance */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none"
        style={{
          width: '600px',
          height: '400px',
          background: 'radial-gradient(ellipse, rgba(233,69,96,0.18) 0%, transparent 70%)',
          filter: 'blur(20px)',
        }}
      />

      {/* ── Logo ── */}
      <motion.div
        className="flex flex-col items-center gap-4 w-full"
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <img
          src="/logo/logo.png"
          alt="Ranked Baby Foot"
          className="w-72 h-72 object-contain"
          style={{
            maskImage: 'radial-gradient(circle, black 55%, transparent 75%)',
            WebkitMaskImage: 'radial-gradient(circle, black 55%, transparent 75%)',
          }}
        />
        <p className="text-[10px] font-black uppercase tracking-[0.45em] text-muted -mt-2">
          ★ Saison compétitive ★
        </p>
      </motion.div>

      {/* ── Tagline ── */}
      <motion.p
        className="text-lg font-black text-white text-center leading-snug"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.5 }}
      >
        Grimpe dans les rangs.<br />
        <span style={{ color: '#e94560' }}>Prouve ta valeur.</span>
      </motion.p>

      {/* ── Boutons de connexion ── */}
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
