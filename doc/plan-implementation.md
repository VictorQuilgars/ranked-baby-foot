# Plan d'Implémentation — Ranked Baby Foot

> Feuille de route technique détaillée pour le développement de l'application
> Version 1.0 — Mars 2026

---

## Vue d'Ensemble

Le projet est découpé en **7 phases** progressives, chacune livrant des fonctionnalités utilisables. L'ordre est pensé pour avoir une application testable dès la Phase 3.

```
Phase 1 → Setup & Infrastructure
Phase 2 → Auth & Profils
Phase 3 → Matchs & Lobbies (MVP testable)
Phase 4 → Interface de Jeu & Arbitre
Phase 5 → Algorithme de Points & Rangs
Phase 6 → UI Clash Royale & Animations
Phase 7 → QR Code, Invitations & Polish
```

---

## Phase 1 — Setup & Infrastructure

**Durée estimée : 1-2 jours**

### 1.1 Initialisation du Monorepo

```bash
ranked-baby-foot/
├── client/   # Next.js
└── server/   # Express
```

**Client (Next.js)**
- [ ] `npx create-next-app@latest client --typescript --tailwind --app`
- [ ] Installer les dépendances : `zustand`, `framer-motion`, `zod`, `@supabase/supabase-js`, `@supabase/ssr`, `qrcode`, `html5-qrcode`, `lucide-react`
- [ ] Configurer les variables d'environnement (`.env.local`) : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_API_URL`
- [ ] Configurer Tailwind avec la palette dark (couleurs custom dans `tailwind.config.ts`)
- [ ] Mettre en place la structure de dossiers (`app/`, `components/`, `hooks/`, `lib/`, `stores/`)

**Server (Express)**
- [ ] `mkdir server && cd server && npm init -y`
- [ ] Installer : `express`, `@supabase/supabase-js`, `zod`, `cors`, `helmet`, `express-rate-limit`, `dotenv`, `tsx` (dev), `typescript`
- [ ] Configurer TypeScript (`tsconfig.json`)
- [ ] Configurer les variables d'environnement (`.env`) : `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `PORT`
- [ ] Script de démarrage dev avec `nodemon` + `tsx`

### 1.2 Supabase Setup

- [ ] Créer un projet Supabase
- [ ] Activer l'authentification Google (OAuth App dans Google Cloud Console)
- [ ] Activer l'authentification Apple (nécessite compte Apple Developer)
- [ ] Créer les tables via l'éditeur SQL Supabase :
  - `players`
  - `matches`
  - `match_players`
  - `match_events`
- [ ] Configurer les **Row Level Security (RLS)** :
  - `players` : lecture publique, écriture uniquement sur son propre profil
  - `matches` : lecture publique, création authentifiée, modification restreinte
  - `match_players` : lecture publique, insertion via server-side uniquement
  - `match_events` : lecture publique, insertion via arbitre ou validation joueurs
- [ ] Activer **Supabase Realtime** sur les tables `matches`, `match_players`, `match_events`
- [ ] Créer les fonctions SQL utilitaires (calcul de rang depuis les SR)

### 1.3 Scripts SQL

```sql
-- Fonction pour obtenir le rang depuis les SR
CREATE OR REPLACE FUNCTION get_rank_from_sr(sr integer)
RETURNS text AS $$
BEGIN
  IF sr >= 4500 THEN RETURN 'Iridescent';
  ELSIF sr >= 3000 THEN RETURN 'Crimson';
  ELSIF sr >= 2000 THEN RETURN 'Diamond';
  ELSIF sr >= 1200 THEN RETURN 'Platinum';
  ELSIF sr >= 700 THEN RETURN 'Gold';
  ELSIF sr >= 300 THEN RETURN 'Silver';
  ELSE RETURN 'Bronze';
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Trigger pour mettre à jour rank et rank_tier automatiquement
CREATE OR REPLACE FUNCTION update_player_rank()
RETURNS TRIGGER AS $$
BEGIN
  NEW.rank := get_rank_from_sr(NEW.rank_points);
  -- Calcul du tier (I, II, III) selon la position dans le palier
  -- [logique détaillée à implémenter dans rankService]
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## Phase 2 — Authentification & Profils

**Durée estimée : 2-3 jours**

### 2.1 Auth (Client)

- [ ] Créer le client Supabase SSR (`lib/supabase/server.ts` et `lib/supabase/client.ts`)
- [ ] Implémenter les pages auth :
  - `/login` : boutons "Continuer avec Google" + "Continuer avec Apple" + formulaire email
  - `/auth/callback` : route de callback OAuth
- [ ] Middleware Next.js pour protéger les routes (`middleware.ts`) — redirect vers `/login` si non authentifié
- [ ] Hook `useAuth()` : état utilisateur courant, loading, logout
- [ ] Création automatique du profil `players` lors du premier login (via Supabase Database Webhook ou trigger SQL sur `auth.users`)

### 2.2 Profils (Client + Server)

**Endpoints Express**
```
GET  /api/players/:id        → Profil public d'un joueur
PUT  /api/players/me         → Mise à jour du profil (username, avatar, position préférée)
GET  /api/players/me/history → Historique des 20 derniers matchs
```

**Pages Next.js**
- [ ] `/profile/me` : profil personnel éditable
  - Avatar (upload ou depuis OAuth)
  - Changement de pseudo (validation unicité en temps réel)
  - Carte de rang animée (badge + RP + barre de progression)
  - Statistiques en grille (victoires, défaites, buts, MVP)
  - Liste des derniers matchs
- [ ] `/profile/[id]` : profil public d'un autre joueur (read-only)

**Composants à créer**
- [ ] `<RankBadge />` : badge animé avec icône du rang, couleur, et tier (I/II/III)
- [ ] `<StatsGrid />` : grille de statistiques
- [ ] `<MatchHistory />` : liste des matchs passés avec résultat coloré

---

## Phase 3 — Matchs & Lobbies

**Durée estimée : 3-4 jours** ← *Application testable à partir d'ici*

### 3.1 Création de Match (Server)

```
POST /api/matches             → Créer un match (génère le code 6 chars)
GET  /api/matches/:id         → Détails d'un match
GET  /api/matches/code/:code  → Trouver un match via son code
POST /api/matches/:id/join    → Rejoindre un match (équipe + position)
POST /api/matches/:id/leave   → Quitter le lobby
POST /api/matches/:id/start   → Démarrer le match (hôte uniquement)
PUT  /api/matches/:id/teams   → Déplacer joueurs entre équipes (hôte)
POST /api/matches/:id/referee → Désigner l'arbitre
```

### 3.2 Lobby en Temps Réel (Client)

- [ ] Page `/match/create` :
  - Formulaire : nom du match (optionnel), score cible, choix équipe & position
  - Bouton "Créer" → génère le match et redirige vers le lobby
- [ ] Page `/match/[id]` (Lobby) :
  - Affichage des 4 slots (2 par équipe) avec avatars + positions
  - Slot vide = carte grise avec "En attente..."
  - Code de lobby affiché en gros avec bouton copier
  - Bouton QR Code (ouvre un modal plein écran avec le QR)
  - Bouton "Rejoindre comme arbitre" (si pas déjà arbitre désigné)
  - Bouton "Démarrer" (hôte uniquement, actif si 4 joueurs présents)
  - Mise à jour en temps réel via Supabase Realtime (subscription sur `match_players`)

- [ ] Page `/match/join` :
  - Champ pour entrer le code à 6 caractères
  - Choix équipe et position si des slots sont disponibles
  - Scanner QR code (ouvre la caméra avec `html5-qrcode`)

### 3.3 Génération du Code & QR

```typescript
// server/src/utils/matchCode.ts
export function generateMatchCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // sans I, O, 0, 1 pour lisibilité
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}
```

---

## Phase 4 — Interface de Jeu & Arbitre

**Durée estimée : 3-4 jours**

### 4.1 Endpoints de Match en Cours (Server)

```
POST /api/matches/:id/goal          → Enregistrer un but (arbitre ou validation joueurs)
POST /api/matches/:id/goal/cancel   → Annuler le dernier but
POST /api/matches/:id/finish        → Terminer le match manuellement
GET  /api/matches/:id/events        → Liste des événements du match
```

**Validation d'un but sans arbitre** : le serveur attend une confirmation de 3 joueurs sur 4 (vote avec timeout de 30s). Si pas de consensus → but refusé.

### 4.2 Interface de Jeu (Client)

**Page `/match/[id]/play`** (vue joueur)
- [ ] Tableau de score central (Score A — Score B) en très grand
- [ ] Noms et avatars des joueurs de chaque équipe
- [ ] Feed d'événements : liste des buts avec horodatage et icône du buteur
- [ ] Si sans arbitre : bouton "But pour nous" → déclenche le processus de vote
- [ ] Écran de vote : notification push aux autres joueurs, 30s pour confirmer/infirmer

**Page `/match/[id]/referee`** (vue arbitre)
- [ ] Score en haut (mis en avant)
- [ ] Deux gros boutons : **⚽ But Équipe A** / **⚽ But Équipe B**
- [ ] Après appui : modal de sélection du buteur (liste des 4 joueurs + indication de position)
- [ ] Bouton "Annuler le dernier but" (avec confirmation) en bas
- [ ] Historique des buts scrollable

### 4.3 Écran de Fin de Match

- [ ] Animation de victoire / défaite (confettis ou effet dramatique Clash Royale)
- [ ] Scores finaux
- [ ] Détail des buts par joueur
- [ ] MVP mis en avant avec couronne animée
- [ ] Points gagnés/perdus pour chaque joueur (+25 SR, -18 SR…) avec animation compteur
- [ ] Si montée de rang : animation de rang up spéciale
- [ ] Bouton "Retour à l'accueil"

---

## Phase 5 — Algorithme de Points & Rangs

**Durée estimée : 3-4 jours**

### 5.1 Service de Calcul (Server)

**`server/src/services/rankService.ts`**

```typescript
interface MatchResult {
  players: PlayerMatchData[];
  scoreA: number;
  scoreB: number;
  winnerTeam: 'A' | 'B' | 'draw';
}

interface PlayerMatchData {
  playerId: string;
  team: 'A' | 'B';
  position: 'attacker' | 'goalkeeper';
  goalsScored: number;
  currentSR: number;
  currentRank: string;
  currentTier: number;
  hiddenMmr: number;          // HPR : niveau réel estimé
  placementMatchesLeft: number; // 0 = placement terminé
  rankShield: number;          // Matchs de protection post-montée restants
  dailyLossForgiven: boolean;  // Première défaite du jour déjà utilisée
}

export function calculateSRChanges(result: MatchResult): SRChange[] {
  // 1. Identifier les joueurs en placement (placementMatchesLeft > 0)
  // 2. Calculer le rang moyen de chaque équipe (getRankValue)
  // 3. Calculer le modificateur adversaires (rankDiff)
  // 4. Identifier le MVP (score MVP = buts × (gardien ? 2 : 1))
  // 5. Calculer l'écart de buts
  // 6. Calculer le mod_hpr pour chaque joueur (écart hiddenMmr - rankPoints)
  // 7. Appliquer la formule : RP_base × mod_hpr × mod_adversaires × mod_mvp × mod_ecart
  // 8. Appliquer loss forgiveness si applicable
  // 9. Clamp entre -35 et +50
}
```

**Calcul du Rang Moyen**
```typescript
function getRankValue(rank: string, tier: number): number {
  const rankValues = { Bronze: 0, Silver: 1, Gold: 2, Platinum: 3, Diamond: 4, Crimson: 5, Iridescent: 6 };
  return rankValues[rank] * 3 + (tier - 1); // Valeur de 0 à 20
}
```

### 5.2 Calcul du Hidden MMR

Le `hidden_mmr` est mis à jour après chaque match via une formule Elo simplifiée :

```typescript
function updateHiddenMmr(currentMmr: number, result: MatchResult, opponentAvgRankValue: number): number {
  // Base : +40 victoire, -30 défaite, +10 égalité
  const base = result === 'win' ? 40 : result === 'loss' ? -30 : 10;
  // Facteur qualité adversaires : normalisé autour de 1.0 (rang 10 = neutre)
  const opponentFactor = Math.min(2.0, Math.max(0.5, opponentAvgRankValue / 10));
  const delta = Math.round(base * opponentFactor);
  return Math.max(0, currentMmr + delta);
}
```

### 5.3 Modificateur HPR

```typescript
function getHprModifier(hiddenMmr: number, rankPoints: number, isPlacement: boolean): number {
  if (isPlacement) return 2.5; // Phase de placement : accélération maximale
  const gap = hiddenMmr - rankPoints;
  if (gap > 400) return 2.0;
  if (gap > 200) return 1.5;
  if (gap > 50)  return 1.2;
  if (gap > -50) return 1.0;
  return 0.8; // Au-dessus du vrai niveau : le système freine
}
```

### 5.4 Application des Changements (Server)

Après calcul, le serveur met à jour **en transaction atomique** :
- `players.rank_points` ± delta
- `players.hidden_mmr` (mise à jour selon la formule Elo)
- `players.rank` et `players.rank_tier` (recalculés depuis les nouveaux SR)
- `players.placement_matches_left` (décrémenté si > 0)
- `players.rank_shield` (décrémenté si > 0, ou remis à 3 en cas de montée de rang)
- `players.daily_loss_forgiven` (mis à `true` si la protection a été utilisée)
- `players.total_games`, `players.wins` / `losses`
- `players.goals_scored`, `players.mvp_count`
- `match_players.sr_change` et `match_players.is_mvp`

### 5.5 Cron Job — Reset Quotidien

Un job Supabase (ou Edge Function schedulée) tourne chaque nuit à minuit pour remettre `daily_loss_forgiven = false` pour tous les joueurs :

```sql
-- Via Supabase pg_cron (à configurer dans le dashboard)
SELECT cron.schedule(
  'reset-daily-loss-forgiven',
  '0 0 * * *',  -- minuit chaque jour
  $$ UPDATE players SET daily_loss_forgiven = false $$
);
```

### 5.6 Tests Unitaires

- [ ] Test placement : 5 premiers matchs → `mod_hpr` = 2.5, rang attribué au 5ème
- [ ] Test HPR élevé : `hidden_mmr` = 800, `rank_points` = 100 → `mod_hpr` = 2.0
- [ ] Test HPR équilibré : `hidden_mmr` ≈ `rank_points` → `mod_hpr` = 1.0
- [ ] Test HPR négatif : joueur au-dessus de son niveau → `mod_hpr` = 0.8
- [ ] Test victoire contre équipe supérieure → bonus correct
- [ ] Test défaite serrée contre équipe supérieure → malus réduit
- [ ] Test gardien MVP → calcul ×2 correct
- [ ] Test loss forgiveness jour 1 → pas de perte
- [ ] Test loss forgiveness jour 2 → perte normale
- [ ] Test bouclier post-montée → pas de descente sur 3 matchs
- [ ] Test limite max/min SR (+50 / -35)
- [ ] Test montée de rang automatique

---

## Phase 6 — UI Clash Royale & Animations

**Durée estimée : 3-4 jours**

### 6.1 Design System

**`tailwind.config.ts`** — couleurs custom
```javascript
colors: {
  'night': '#1a1a2e',
  'night-2': '#16213e',
  'night-3': '#0f3460',
  'accent': '#e94560',
  'gold-ui': '#f5a623',
  // Couleurs de rangs
  'rank-bronze': '#cd7f32',
  'rank-silver': '#c0c0c0',
  'rank-gold': '#ffd700',
  'rank-platinum': '#00b4d8',
  'rank-diamond': '#7b2fff',
  'rank-crimson': '#dc143c',
  'rank-iridescent': '#ff00ff', // gradient arc-en-ciel animé en prod
}
```

**Composants UI à créer**
- [ ] `<Card />` : carte générique avec effet glassmorphism et bordure lumineuse
- [ ] `<RankBadge />` : badge animé (pulsation + glow selon rang)
- [ ] `<SRBar />` : barre de progression SR avec animation de remplissage
- [ ] `<PlayerCard />` : carte joueur style Clash Royale (avatar, pseudo, rang)
- [ ] `<MatchCard />` : carte de match dans le feed (score, rangs, résultat)
- [ ] `<Button />` : bouton avec variantes (primary/secondary/danger) et animations

### 6.2 Animations Framer Motion

- [ ] **Lobby** : apparition des joueurs au join (fade + slide up)
- [ ] **But** : flash sur le score + animation +1 qui monte
- [ ] **Fin de match** :
  - Victoire : écran doré + confettis (`canvas-confetti`)
  - Défaite : écran sombre + tremblement subtil
- [ ] **MVP** : couronne qui tombe sur l'avatar du MVP
- [ ] **Rank Up** : animation épique (lumière, nouveau badge, texte "RANG SUPÉRIEUR!")
- [ ] **Leaderboard** : entrées qui se classent avec animation de réordonnancement

### 6.3 Layout Global

- [ ] Navigation bas d'écran (style app mobile) avec 4 icônes
- [ ] Header contextuel (titre de la page + avatar en haut à droite)
- [ ] Splash screen au lancement (logo + fond animé)
- [ ] Dark theme par défaut (pas de toggle light/dark dans un premier temps)

---

## Phase 7 — QR Code, Invitations & Polish

**Durée estimée : 2-3 jours**

### 7.1 QR Code

- [ ] Génération côté client avec `qrcode` : URL = `https://app.com/match/join?code=XXXXXX`
- [ ] Affichage en modal plein écran (fond noir, QR blanc, très lisible)
- [ ] Scanner côté client avec `html5-qrcode` :
  - Demande de permission caméra
  - Overlay de scan avec cadre clignotant
  - Redirect automatique vers le lobby au scan

### 7.2 Invitations

**Endpoints**
```
POST /api/invitations          → Inviter un joueur (matchId + invitedPlayerId)
GET  /api/invitations/pending  → Mes invitations en attente
POST /api/invitations/:id/accept
POST /api/invitations/:id/decline
```

**Table `invitations`**
```sql
id uuid PRIMARY KEY
match_id uuid REFERENCES matches
inviter_id uuid REFERENCES players
invited_id uuid REFERENCES players
status text DEFAULT 'pending' (pending | accepted | declined | expired)
created_at timestamp
expires_at timestamp (15 min après création)
```

**Notifications** (Supabase Realtime)
- [ ] Le joueur invité reçoit une notification en temps réel
- [ ] Banner en haut de l'écran : "Tu as été invité à un match par [pseudo]" avec boutons Accepter/Refuser

### 7.3 Recherche de Joueurs

- [ ] Endpoint `GET /api/players/search?q=pseudo` (minimum 2 caractères, limite 10 résultats)
- [ ] Composant `<PlayerSearch />` avec debounce (300ms)

### 7.4 Feed d'Accueil

- [ ] Liste des matchs récents dans l'école (en cours + terminés)
- [ ] Filtres : "En cours" / "Terminés" / "Mes matchs"
- [ ] Bouton "Créer un Match" proéminent en haut (FAB style)

### 7.5 Tests End-to-End & Corrections

- [ ] Scénario complet : création match → join × 3 → arbitre → jeu → fin → calcul RP
- [ ] Test sur différentes tailles d'écran (375px, 390px, 414px)
- [ ] Correction des bugs remontés
- [ ] Optimisation des performances (lazy loading, image optimization Next.js)

---

## Ordre des Priorités de Développement

### Must-Have (MVP)
1. Auth Google
2. Profil joueur basique
3. Création / Rejoindre un match via code
4. Interface arbitre pour saisir les scores
5. Calcul des RP et mise à jour des rangs
6. Leaderboard

### Should-Have
7. QR Code scan
8. Invitations entre joueurs
9. Animations UI (rang up, fin de match)
10. Badges de rang avec design Clash Royale

### Nice-to-Have
11. Auth Apple
12. Feed d'activité
13. Statistiques avancées (graphiques, évolution du rang)
14. Notifications push (PWA)
15. Mode spectateur

---

## Variables d'Environnement

**`client/.env.local`**
```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
NEXT_PUBLIC_API_URL=http://localhost:3001
```

**`server/.env`**
```env
PORT=3001
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
CLIENT_URL=http://localhost:3000
```

---

## Commandes de Développement

```bash
# Client
cd client && npm run dev          # Démarrer Next.js (port 3000)

# Server
cd server && npm run dev          # Démarrer Express avec hot-reload (port 3001)

# Les deux en parallèle (depuis la racine)
# Utiliser concurrently ou deux terminaux
```

---

*Plan rédigé le 25 mars 2026*
