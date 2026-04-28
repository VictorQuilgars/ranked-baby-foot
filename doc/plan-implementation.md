# Plan d'Implémentation — Ranked Baby Foot

> Feuille de route technique — Architecture 100% Next.js 15
> Version 2.0 — Mars 2026

---

## Vue d'Ensemble

```
v0.1  Phase 1 → Setup & Infrastructure (Next.js 15 + Supabase)
v0.2  Phase 2 → Auth & Profils
v0.3  Phase 3 → Matchs & Lobbies
v0.4  Phase 4 → Interface de Jeu & Arbitre
v1.0  Phase 5 → Algorithme SR & Rangs          ← MVP prod-ready
v1.1  Phase 6 → UI Clash Royale & Animations   ✅ Implémenté
v1.2  Phase 7 → QR Code, Invitations & Polish  ✅ Implémenté
v2.0  Nice-to-have → Auth Apple, Notifs push, Stats avancées
```

| Version | Phases | Livrable |
|---------|--------|----------|
| **v0.1** | Phase 1 | Infra prête, base de données initialisée |
| **v0.2** | Phase 2 | Connexion Google, profil joueur fonctionnel |
| **v0.3** | Phase 3 | Premier match jouable de bout en bout |
| **v0.4** | Phase 4 | Partie complète avec arbitre et écran de résultats |
| **v1.0** | Phase 5 | **MVP — SR calculé, rangs mis à jour, déployable en prod** |
| **v1.1** | Phase 6 | Polish UI, animations, leaderboard complet ✅ Implémenté |
| **v1.2** | Phase 7 | QR Code, invitations, feed d'activité ✅ Implémenté |
| **v2.0** | Nice-to-have | Auth Apple, notifications push, stats avancées |

**Architecture** : tout dans Next.js 15. Les Route Handlers (`app/api/`) remplacent Express. La `SUPABASE_SERVICE_ROLE_KEY` est utilisée uniquement dans ces handlers (jamais côté client).

---

## v0.1 — Phase 1 : Setup & Infrastructure

### 1.1 Structure du Projet

Le projet est un **monorepo simplifié** — une seule application Next.js 15 :

```
ranked-baby-foot/
└── app/                 ← dossier Next.js (ancien "client/")
    ├── app/
    │   ├── api/         ← Route Handlers (remplace Express)
    │   ├── (auth)/
    │   ├── (app)/
    │   └── auth/
    ├── components/
    ├── lib/
    │   ├── supabase/
    │   └── services/    ← rankService.ts, matchCode.ts (server-only)
    ├── hooks/
    ├── stores/
    ├── types/
    └── middleware.ts
```

### 1.2 Dépendances

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install framer-motion zustand zod lucide-react
npm install clsx tailwind-merge
npm install qrcode html5-qrcode canvas-confetti
npm install --save-dev @types/qrcode @types/canvas-confetti
```

### 1.3 Variables d'Environnement

**`.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

> `SUPABASE_SERVICE_ROLE_KEY` sans prefix `NEXT_PUBLIC_` → accessible uniquement dans les Route Handlers et Server Actions, jamais envoyée au navigateur.

### 1.4 Clients Supabase

**`lib/supabase/client.ts`** — navigateur (anon key)
```typescript
import { createBrowserClient } from '@supabase/ssr';

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
```

**`lib/supabase/server.ts`** — serveur (service role key)
```typescript
import { createClient } from '@supabase/supabase-js';

// Client avec service_role : contourne les RLS
// À utiliser UNIQUEMENT dans les Route Handlers et Server Actions
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}

// Client avec anon key + cookies (pour lire la session utilisateur)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSessionClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (toSet) => {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
          catch { /* Server Component */ }
        },
      },
    }
  );
}
```

**`lib/supabase/auth.ts`** — helper pour les Route Handlers
```typescript
import { NextRequest } from 'next/server';
import { createAdminClient } from './server';

// Vérifie le JWT depuis le header Authorization
// Retourne le user ou null
export async function getUserFromRequest(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  const { data: { user } } = await createAdminClient().auth.getUser(token);
  return user ?? null;
}

// Retourne le user ou throw 401
export async function requireUserFromRequest(req: NextRequest) {
  const user = await getUserFromRequest(req);
  if (!user) throw new Response(JSON.stringify({ error: 'Non authentifié' }), { status: 401 });
  return user;
}
```

### 1.5 Middleware

**`middleware.ts`** — protection des routes (Edge-safe, sans @supabase/ssr)
```typescript
import { type NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isAuthRoute = pathname.startsWith('/login');
  const isPublicRoute = pathname.startsWith('/auth') || pathname.startsWith('/api');

  const hasSession = request.cookies.getAll().some(
    (c) => c.name.includes('-auth-token') && c.value.length > 0
  );

  if (!hasSession && !isAuthRoute && !isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }
  if (hasSession && isAuthRoute) {
    return NextResponse.redirect(new URL('/home', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
};
```

### 1.6 Schéma Supabase

Exécuter `doc/supabase-init.sql` dans l'éditeur SQL Supabase.

---

## v0.2 — Phase 2 : Authentification & Profils

### 2.1 Pages Auth

**`app/(auth)/login/page.tsx`** — Client Component
- Bouton "Continuer avec Google" → `supabase.auth.signInWithOAuth({ provider: 'google' })`
- Redirect vers `/auth/callback` après login

**`app/auth/callback/route.ts`** — Route Handler
```typescript
import { createSessionClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get('code');
  if (code) {
    const supabase = await createSessionClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(new URL('/home', request.url));
}
```

### 2.2 Création automatique du profil

Dans `app/(app)/home/page.tsx` (Server Component) :
```typescript
// Si le joueur n'a pas de profil → le créer automatiquement
if (!player) {
  await createAdminClient()
    .from('players')
    .insert({ id: user.id, username: ..., avatar_url: ... });
}
```

### 2.3 Route Handlers — Joueurs

**`app/api/players/me/route.ts`**
```typescript
// GET  → profil de l'utilisateur connecté
// PUT  → modifier username, avatar_url, preferred_position
```

**`app/api/players/me/history/route.ts`**
```typescript
// GET → 20 derniers matchs de l'utilisateur
```

**`app/api/players/search/route.ts`**
```typescript
// GET ?q=pseudo → recherche par username (min 2 chars, max 10 résultats)
```

**`app/api/players/[id]/route.ts`**
```typescript
// GET → profil public d'un joueur
```

### 2.4 Pattern standard des Route Handlers

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireUserFromRequest } from '@/lib/supabase/auth';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const user = await requireUserFromRequest(request);
    const body = await request.json();

    const schema = z.object({ ... });
    const data = schema.parse(body);

    const supabase = createAdminClient();
    const { data: result, error } = await supabase
      .from('...')
      .insert({ ... })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: result }, { status: 201 });

  } catch (e) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: 'Données invalides', details: e.errors }, { status: 400 });
    }
    if (e instanceof Response) return e as unknown as NextResponse;
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
```

---

## v0.3 — Phase 3 : Matchs & Lobbies

### 3.1 Route Handlers — Matchs

```
POST   /api/matches                    → Créer un match
GET    /api/matches/[id]               → Détails d'un match
GET    /api/matches/code/[code]        → Trouver via code
POST   /api/matches/[id]/join          → Rejoindre (équipe + position)
POST   /api/matches/[id]/leave         → Quitter le lobby
POST   /api/matches/[id]/start         → Démarrer (hôte uniquement)
POST   /api/matches/[id]/referee       → Désigner l'arbitre
```

### 3.2 Générateur de Code

**`lib/services/matchCode.ts`**
```typescript
export function generateMatchCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1
  return Array.from({ length: 6 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join('');
}
```

### 3.3 Pages

- `app/(app)/match/create/page.tsx` — formulaire + appel POST `/api/matches`
- `app/(app)/match/join/page.tsx` — saisie code + scan QR
- `app/(app)/match/[id]/page.tsx` — lobby Realtime

### 3.4 Realtime dans le Lobby

```typescript
// Dans un Client Component
useEffect(() => {
  const channel = supabase
    .channel(`match:${matchId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'match_players',
      filter: `match_id=eq.${matchId}`,
    }, (payload) => {
      // Mettre à jour l'état du lobby
    })
    .subscribe();

  return () => { supabase.removeChannel(channel); };
}, [matchId]);
```

---

## v0.4 — Phase 4 : Interface de Jeu & Arbitre

### 4.1 Route Handlers — Jeu

```
POST /api/matches/[id]/goal         → Enregistrer un but
POST /api/matches/[id]/goal/cancel  → Annuler le dernier but
POST /api/matches/[id]/finish       → Terminer le match
GET  /api/matches/[id]/events       → Liste des événements
```

### 4.2 Fin de Match — Déclenchement du Calcul SR

Dans `app/api/matches/[id]/finish/route.ts` :
```typescript
// 1. Marquer le match comme finished
// 2. Appeler rankService.calculateSRChanges(matchData)
// 3. Mettre à jour players et match_players en transaction
// (utiliser createAdminClient() qui contourne les RLS)
```

### 4.3 Pages

- `app/(app)/match/[id]/page.tsx` — vue joueur (score, events, votes)
- `app/(app)/match/[id]/referee/page.tsx` — interface arbitre

---

## v1.0 — Phase 5 : Algorithme SR & Rangs

### 5.1 rankService.ts

**`lib/services/rankService.ts`** — server-only (importé uniquement dans les Route Handlers)

```typescript
export type RankName = 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | 'Diamond' | 'Crimson' | 'Iridescent';

export interface PlayerMatchData {
  playerId: string;
  team: 'A' | 'B';
  position: 'attacker' | 'goalkeeper';
  goalsScored: number;
  currentSR: number;
  hiddenMmr: number;
  placementMatchesLeft: number;
  rankShield: number;
  dailyLossForgiven: boolean;
  rank: RankName;
  rankTier: number;
}

export interface SRChange {
  playerId: string;
  srDelta: number;        // Valeur finale après clamp
  newSR: number;
  newRank: RankName;
  newTier: number;
  isMvp: boolean;
  newHiddenMmr: number;
  rankUp: boolean;        // true si montée de rang
  rankDown: boolean;      // true si descente de rang
  shieldUsed: boolean;
  forgiven: boolean;      // true si loss forgiveness appliqué
}

export function calculateSRChanges(
  players: PlayerMatchData[],
  scoreA: number,
  scoreB: number,
  winnerTeam: 'A' | 'B' | 'draw'
): SRChange[] { ... }
```

**Valeur de rang**
```typescript
export function getRankValue(rank: RankName, tier: number): number {
  const base = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3, Diamond: 4, Crimson: 5, Iridescent: 6 };
  return base[rank] * 3 + (rank === 'Iridescent' ? 0 : tier - 1);
}
```

**Seuils SR → Rang**
```typescript
export function getRankFromSR(sr: number): RankName {
  if (sr >= 4500) return 'Iridescent';
  if (sr >= 3000) return 'Crimson';
  if (sr >= 2000) return 'Diamond';
  if (sr >= 1200) return 'Platinum';
  if (sr >= 700)  return 'Gold';
  if (sr >= 300)  return 'Silver';
  return 'Bronze';
}
```

### 5.2 Cron — Reset daily_loss_forgiven

Dans Supabase → Extensions → pg_cron :
```sql
SELECT cron.schedule(
  'reset-daily-loss-forgiven',
  '0 0 * * *',
  $$ UPDATE players SET daily_loss_forgiven = false $$
);
```

---

## v1.1 — Phase 6 : UI Clash Royale & Animations

### 6.1 Design System (déjà partiellement en place)

**`tailwind.config.ts`** — couleurs custom
```javascript
colors: {
  'night': '#1a1a2e',
  'night-2': '#16213e',
  'night-3': '#0f3460',
  'accent': '#e94560',
  'gold-ui': '#f5a623',
  'rank-bronze': '#cd7f32',
  'rank-silver': '#c0c0c0',
  'rank-gold': '#ffd700',
  'rank-platinum': '#00b4d8',
  'rank-diamond': '#7b2fff',
  'rank-crimson': '#dc143c',
  'rank-iridescent': '#ff00ff',
}
```

### 6.2 Composants

- `<RankBadge />` — badge animé avec glow, taille sm/md/lg/xl
- `<SRBar />` — barre de progression SR avec animation
- `<BottomNav />` — navigation bas d'écran (safe area iOS)
- `<PlayerCard />` — carte joueur style Clash Royale
- `<MatchCard />` — carte de match dans le feed

### 6.3 Animations Framer Motion

- **Lobby** : apparition des joueurs (fade + slide up)
- **But** : flash sur le score + animation +1
- **Fin de match** : victoire (confettis) / défaite (tremblement)
- **MVP** : couronne animée
- **Rank Up** : animation épique avec nouveau badge

---

## v1.2 — Phase 7 : QR Code, Invitations & Polish

### 7.1 QR Code

- Génération avec `qrcode` dans un Client Component
- URL : `https://app.com/match/join?code=XXXXXX`
- Modal plein écran (fond noir, QR blanc)
- Scanner avec `html5-qrcode` (nécessite HTTPS en prod)

### 7.2 Route Handlers — Invitations

```
POST /api/invitations                    → Inviter un joueur
GET  /api/invitations/pending            → Mes invitations en attente
POST /api/invitations/[id]/accept
POST /api/invitations/[id]/decline
```

Notification en temps réel via Supabase Realtime (subscription sur `invitations`).

### 7.3 Feed d'Accueil

- Derniers matchs de l'école (en cours + terminés)
- Filtres : En cours / Terminés / Mes matchs

---

## Variables d'Environnement

**`.env.local`** (jamais commité)
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Vercel** : ajouter ces 3 variables dans Settings → Environment Variables.

> Plus de `NEXT_PUBLIC_API_URL` — l'API est dans le même projet Next.js.

---

## Commandes de Développement

```bash
# Depuis le dossier du projet Next.js
npm run dev     # port 3000 (client + API)
npm run build   # build de production
npm run lint    # vérification TypeScript + ESLint
```

---

## Ordre des Priorités

### v0.1 – v1.0 : Must-Have (MVP)
1. Auth Google + création profil automatique
2. Home page avec badge de rang
3. Création / Rejoindre un match via code
4. Interface arbitre pour saisir les scores
5. Calcul SR et mise à jour des rangs
6. Leaderboard

### v1.1 – v1.2 : Should-Have
7. QR Code
8. Invitations entre joueurs
9. Animations UI (rank up, fin de match)
10. Profil éditable

### v2.0 : Nice-to-Have
11. Auth Apple
12. Feed d'activité
13. Statistiques avancées
14. Notifications push (PWA)

---

*Plan mis à jour le 25 mars 2026 — Version 2.0 (migration full Next.js 15)*
