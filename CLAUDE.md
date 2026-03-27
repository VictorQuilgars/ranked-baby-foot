# CLAUDE.md — Ranked Baby Foot

> Fichier de contexte pour l'assistant IA. Contient toutes les conventions, décisions architecturales et règles du projet.

## Workflow — Avant et après chaque feature

### Avant
1. **Identifier l'issue GitHub correspondante** (si elle existe) pour bien cerner le scope attendu.
2. **Lire les fichiers concernés** avant de les modifier.

### Après
1. **Mettre à jour `doc/Plan d'implementation.md`** : cocher la tâche ou ajouter une nouvelle ligne si elle n'y figure pas.
2. **Commiter immédiatement les fichiers modifiés** — sans exception, que ce soit une feature, un fix, un refactor ou un changement de configuration. Un commit par unité de travail, avec un message clair.
3. **Gérer l'issue GitHub** :
   - Si une issue existante correspond → la fermer avec `gh issue close <id> --comment "Implémenté dans le commit <hash>"`.
   - Si aucune issue n'existe → créer une issue avec `gh issue create`, puis la fermer immédiatement.

---

## Présentation du Projet

**Ranked Baby Foot** est une application web mobile-first de classement pour les parties de baby-foot dans un établissement scolaire. Elle fonctionne comme un système de ranked inspiré de Call of Duty, avec une interface visuelle inspirée de Clash Royale.

**Objectif** : permettre des parties officielles avec un système de progression de rang (Bronze → Iridescent) et un algorithme de points intelligent.

---

## Stack Technique

| Couche | Technologie | Version |
|--------|-------------|---------|
| Frontend | Next.js (App Router) | 14+ |
| UI | React | 18 |
| Styling | Tailwind CSS | 3 |
| Animations | Framer Motion | 11+ |
| State | Zustand | 4+ |
| Backend | Express.js | 4 |
| Runtime | Node.js | 20+ LTS |
| Base de données | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth (Google, Apple) | — |
| Temps réel | Supabase Realtime | — |
| Validation | Zod (client + server) | 3+ |
| Langage | TypeScript (strict) | 5+ |

---

## Structure du Projet

```
ranked-baby-foot/
├── client/                          # Application Next.js
│   ├── app/
│   │   ├── (auth)/                  # Routes publiques (login)
│   │   │   └── login/page.tsx
│   │   ├── (app)/                   # Routes protégées (middleware auth)
│   │   │   ├── home/page.tsx        # Feed + bouton créer match
│   │   │   ├── leaderboard/page.tsx # Classement global
│   │   │   ├── match/
│   │   │   │   ├── create/page.tsx  # Formulaire création match
│   │   │   │   ├── join/page.tsx    # Rejoindre via code ou QR
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx     # Lobby + jeu (vue joueur)
│   │   │   │       └── referee/page.tsx  # Interface arbitre
│   │   │   └── profile/
│   │   │       ├── me/page.tsx      # Profil éditable
│   │   │       └── [id]/page.tsx    # Profil public
│   │   ├── auth/callback/route.ts   # Callback OAuth Supabase
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/                      # Composants génériques (Button, Card, Modal...)
│   │   ├── match/                   # Composants match (Lobby, ScoreBoard, GoalFeed...)
│   │   ├── rank/                    # RankBadge, SRBar, RankUpAnimation
│   │   ├── leaderboard/             # LeaderboardRow, Podium
│   │   └── profile/                 # PlayerCard, StatsGrid, MatchHistory
│   ├── hooks/
│   │   ├── useAuth.ts               # État auth Supabase
│   │   ├── useMatch.ts              # État du match en cours (Realtime)
│   │   ├── useInvitations.ts        # Invitations en attente (Realtime)
│   │   └── useLeaderboard.ts
│   ├── lib/
│   │   ├── supabase/
│   │   │   ├── client.ts            # Client Supabase browser
│   │   │   └── server.ts            # Client Supabase server-side (SSR)
│   │   ├── api.ts                   # Helpers fetch vers l'API Express
│   │   └── utils.ts
│   ├── stores/
│   │   ├── authStore.ts             # Zustand : user courant
│   │   └── matchStore.ts            # Zustand : état du match actif
│   └── middleware.ts                # Protection des routes (app)
│
├── server/                          # API Express
│   └── src/
│       ├── routes/
│       │   ├── auth.ts              # Routes auth (sync profil)
│       │   ├── matches.ts           # CRUD matchs, join, start, goal
│       │   ├── players.ts           # Profils, search, history
│       │   ├── leaderboard.ts       # Classement
│       │   └── invitations.ts       # Invitations entre joueurs
│       ├── middleware/
│       │   ├── auth.ts              # Vérification JWT Supabase (req.user)
│       │   └── validation.ts        # Wrapper Zod pour les body/params
│       ├── services/
│       │   ├── rankService.ts       # ⭐ Algorithme de calcul des SR
│       │   ├── matchService.ts      # Logique métier des matchs
│       │   └── notificationService.ts  # Notifications Realtime
│       ├── utils/
│       │   └── matchCode.ts         # Génération du code 6 chars
│       └── index.ts                 # Point d'entrée Express
│
├── cahier-des-charges.md
├── plan-implementation.md
├── CLAUDE.md                        # Ce fichier
└── README.md
```

---

## Modèle de Données (Supabase)

### Table `players`
```sql
id              uuid PRIMARY KEY  -- = auth.users.id
username        text UNIQUE NOT NULL
avatar_url      text
rank_points     integer DEFAULT 0
rank            text DEFAULT 'Bronze'     -- Bronze/Silver/Gold/Platinum/Diamond/Crimson/Iridescent
rank_tier       integer DEFAULT 1          -- 1, 2 ou 3
hidden_mmr      integer DEFAULT 0          -- ⭐ Niveau réel estimé (jamais affiché au joueur)
placement_matches_left integer DEFAULT 5  -- Matchs de placement restants (5 au total)
preferred_position text DEFAULT 'both'    -- 'attacker' | 'goalkeeper' | 'both'
total_games     integer DEFAULT 0
wins            integer DEFAULT 0
losses          integer DEFAULT 0
goals_scored    integer DEFAULT 0
mvp_count       integer DEFAULT 0
rank_shield     integer DEFAULT 0          -- Nombre de matchs protégés post-montée
daily_loss_forgiven boolean DEFAULT false  -- Reset chaque jour à minuit
created_at      timestamptz DEFAULT now()
updated_at      timestamptz DEFAULT now()
```

### Table `matches`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
code            text UNIQUE NOT NULL      -- 6 chars, ex: "KR4BX2"
name            text                       -- Optionnel
host_id         uuid REFERENCES players
referee_id      uuid REFERENCES players    -- Nullable
status          text DEFAULT 'lobby'       -- 'lobby' | 'in_progress' | 'finished' | 'cancelled'
score_target    integer DEFAULT 10
score_team_a    integer DEFAULT 0
score_team_b    integer DEFAULT 0
winner_team     text                       -- 'A' | 'B' | 'draw' | null
created_at      timestamptz DEFAULT now()
started_at      timestamptz
finished_at     timestamptz
```

### Table `match_players`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
match_id        uuid REFERENCES matches ON DELETE CASCADE
player_id       uuid REFERENCES players
team            text NOT NULL              -- 'A' | 'B'
position        text NOT NULL              -- 'attacker' | 'goalkeeper'
goals_scored    integer DEFAULT 0
is_mvp          boolean DEFAULT false
sr_change       integer                    -- Null jusqu'à la fin du match
joined_at       timestamptz DEFAULT now()
UNIQUE(match_id, player_id)
UNIQUE(match_id, team, position)          -- Max 1 attaquant + 1 gardien par équipe
```

### Table `match_events`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
match_id        uuid REFERENCES matches ON DELETE CASCADE
event_type      text NOT NULL              -- 'goal' | 'goal_cancelled'
team            text NOT NULL              -- Équipe qui marque
scorer_id       uuid REFERENCES players    -- Nullable (si non identifié)
scorer_position text                       -- 'attacker' | 'goalkeeper'
created_at      timestamptz DEFAULT now()
created_by      uuid REFERENCES players    -- Arbitre ou joueur qui valide
```

### Table `invitations`
```sql
id              uuid PRIMARY KEY DEFAULT gen_random_uuid()
match_id        uuid REFERENCES matches ON DELETE CASCADE
inviter_id      uuid REFERENCES players
invited_id      uuid REFERENCES players
status          text DEFAULT 'pending'     -- 'pending' | 'accepted' | 'declined' | 'expired'
created_at      timestamptz DEFAULT now()
expires_at      timestamptz               -- 15 min après created_at
```

---

## Algorithme de Points (rankService.ts)

### Formule Complète

```
RP_final = clamp(RP_base × mod_hpr × mod_adversaires × mod_mvp × mod_ecart, -35, +50)
```

> Le `mod_hpr` est le modificateur le plus impactant : il accélère la progression quand le joueur est loin de son vrai niveau, et la freine quand il est à sa juste place.

---

### 1. Matchs de Placement (5 premiers matchs)

Les 5 premiers matchs d'un joueur sont des **matchs de placement**. Pendant cette phase :
- Le `mod_hpr` est fixé à **×2.5** (gains/pertes amplifiés au maximum)
- Un badge "En placement" s'affiche à la place du rang sur l'interface
- À l'issue du 5ème match, le rang de départ est calculé depuis le `hidden_mmr` accumulé
- L'objectif : placer rapidement le joueur dans le bon rang

---

### 2. HPR — Hidden Performance Rating

Le `hidden_mmr` est une estimation du vrai niveau du joueur, **jamais affichée dans l'interface**. Il évolue plus vite que les `rank_points` et pilote la vitesse de progression.

**Calcul du `hidden_mmr` après chaque match :**
```
delta_mmr = résultat_base × qualité_adversaires
résultat_base : Victoire = +40, Défaite = -30, Égalité = +10
qualité_adversaires : rang moyen de l'équipe adverse (valeur 0–20)
→ normalisé en facteur : (rang_adverse / 10), min 0.5, max 2.0
```

Le `hidden_mmr` se met à jour immédiatement après chaque match, indépendamment des `rank_points`.

**Modificateur HPR** (écart entre `hidden_mmr` et `rank_points`) :

| Écart `hidden_mmr - rank_points` | Effet | Signification |
|----------------------------------|-------|---------------|
| > 400 SR | **×2.0** | Très en dessous du vrai niveau → accélération forte |
| 200 – 400 SR | **×1.5** | En dessous du vrai niveau → accélération modérée |
| 50 – 200 SR | **×1.2** | Légèrement en dessous → léger coup de pouce |
| -50 – +50 SR | **×1.0** | À son vrai niveau → progression normale |
| < -50 SR | **×0.8** | Au-dessus du vrai niveau → le système freine |

> Exemple concret : un joueur très fort commence Bronze I. Son `hidden_mmr` est estimé à 800 (niveau Or) après ses placements. L'écart de 800 – 0 = 800 → ×2.0 : il gagne le double de RP à chaque victoire jusqu'à se rapprocher de son vrai rang.

---

### 3. SR de Base

| Résultat | Points |
|----------|--------|
| Victoire | +25 SR |
| Défaite  | -20 SR |
| Égalité  | +5 SR  |

---

### 4. Modificateur Adversaires

Basé sur la différence entre le rang moyen de son équipe et celui de l'équipe adverse.

| Écart (en valeurs de rang) | Victoire | Défaite |
|---------------------------|----------|---------|
| +6 ou plus (adversaires bien supérieurs) | ×1.5 | ×0.5 |
| +3 à +5 | ×1.25 | ×0.75 |
| -2 à +2 (équivalent) | ×1.0 | ×1.0 |
| -3 à -5 | ×0.85 | ×1.1 |
| -6 ou moins | ×0.7 | ×1.25 |

Valeur de rang : Bronze I = 0, Bronze II = 1, Bronze III = 2, Silver I = 3... Iridescent = 20

---

### 5. Modificateur MVP

**Score MVP** (calculé avant les modificateurs) :
```
score_mvp = buts × (position === 'goalkeeper' ? 2 : 1)
```
Le joueur avec le plus haut `score_mvp` dans l'équipe gagnante est MVP.

| Statut | Modificateur |
|--------|-------------|
| MVP    | ×1.3 |
| Non-MVP | ×1.0 |

---

### 6. Modificateur Écart de Buts

| Écart | Victoire | Défaite |
|-------|----------|---------|
| 1-2 buts | ×1.1 | ×0.9 |
| 3-4 buts | ×1.0 | ×1.0 |
| 5-6 buts | ×0.95 | ×1.05 |
| 7+ buts | ×0.85 | ×1.15 |

---

### Règles Spéciales
- Jamais en dessous de 0 SR total
- **Bouclier de protection** : 3 matchs après une montée de rang (pas de descente possible)
- **Première défaite du jour gratuite** : `daily_loss_forgiven` remis à `false` chaque nuit à minuit via une cron Supabase
- **Déconnexion coéquipier** : si un joueur quitte en cours de match, la défaite ne compte pas pour ses coéquipiers
- Le calcul se fait UNIQUEMENT côté serveur (`rankService.ts`)

---

## Système de Rangs

```
Bronze     I/II/III   :   0 –  299 SR
Silver     I/II/III   : 300 –  699 SR
Gold       I/II/III   : 700 – 1199 SR
Platinum   I/II/III   : 1200 – 1999 SR
Diamond    I/II/III   : 2000 – 2999 SR
Crimson    I/II/III   : 3000 – 4499 SR
Iridescent             : 4500+ SR
```

Pour les rangs à paliers (I/II/III), le tier se calcule en divisant la plage du rang en 3 parties égales.
Iridescent n'a pas de division.

---

## Conventions de Code

### TypeScript
- `strict: true` dans `tsconfig.json`
- Pas de `any` — utiliser `unknown` si nécessaire et affiner avec des guards
- Les types d'entités sont dans `types/` (ex: `types/match.ts`, `types/player.ts`)
- Préférer les interfaces aux types pour les objets, les types pour les unions

### React / Next.js
- Composants en PascalCase (`<MatchCard />`)
- Hooks custom en camelCase préfixés par `use` (`useMatch`)
- Server Components par défaut, `'use client'` uniquement si nécessaire
- Les appels API (vers Express) se font dans les Server Components ou Server Actions
- Les abonnements Realtime (Supabase) se font dans des Client Components avec `useEffect`

### Express
- Routes en kebab-case (`/api/match-players`)
- Toujours valider le body avec Zod avant de traiter la requête
- Le middleware `auth.ts` injecte `req.user` (depuis le JWT Supabase)
- Toutes les réponses d'erreur : `{ error: string, details?: unknown }`
- Toutes les réponses de succès : `{ data: T }`

### Nommage des Variables
- Français pour les commentaires, anglais pour le code
- `teamA` / `teamB` (pas `team1` / `team2`)
- `goalScored` (pas `goal_scored`) dans le code TypeScript (snake_case réservé à SQL)
- `srChange` (pas `skillRatingChange`)

### Supabase Realtime
- Les subscriptions Realtime sont créées dans des hooks custom (`useMatch`, `useInvitations`)
- Toujours cleanup avec `subscription.unsubscribe()` dans le return du `useEffect`
- Les mutations (insert/update) passent TOUJOURS par l'API Express, jamais directement depuis le client

---

## Variables d'Environnement

### Client (`client/.env.local`)
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Server (`server/.env`)
```
PORT=3001
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
CLIENT_URL=http://localhost:3000
NODE_ENV=development
```

> ⚠️ Ne jamais commiter les fichiers `.env` — ils sont dans `.gitignore`
> La `SERVICE_ROLE_KEY` contourne les RLS — elle ne doit JAMAIS être exposée côté client

---

## Sécurité

- **Jamais de logique de score côté client** — tout passe par Express
- **Authentification** : chaque requête Express vérifie le JWT via `supabase.auth.getUser(token)`
- **Row Level Security (RLS)** activé sur toutes les tables Supabase
- **Rate limiting** : 10 créations de match par heure par utilisateur
- **Validation Zod** sur tous les inputs (client + server)
- Le `referee_id` est vérifié côté server avant d'autoriser les actions d'arbitre

---

## Temps Réel (Supabase Realtime)

Les tables suivantes ont Realtime activé :

| Table | Événements | Utilisé pour |
|-------|------------|--------------|
| `match_players` | INSERT, UPDATE, DELETE | Mise à jour du lobby en direct |
| `match_events` | INSERT | Feed des buts en temps réel |
| `matches` | UPDATE | Changement de statut (lobby → in_progress → finished) |
| `invitations` | INSERT | Notification d'invitation reçue |

---

## Design System

### Palette
```
--color-bg-primary:   #1a1a2e   /* Fond principal */
--color-bg-secondary: #16213e   /* Cartes, panels */
--color-bg-tertiary:  #0f3460   /* Éléments surélevés */
--color-crimson:      #e94560   /* Accent principal, boutons danger */
--color-gold:         #f5a623   /* Or, MVP, victoire */
--color-text:         #ffffff
--color-text-muted:   #a8a8b3
```

### Couleurs des Rangs
```
Bronze     : #cd7f32
Silver     : #c0c0c0
Gold       : #ffd700
Platinum   : #00b4d8
Diamond    : #7b2fff
Crimson    : #dc143c
Iridescent : #ff00ff  /* gradient arc-en-ciel animé en prod */
```

### Principes UI
- **Mobile first** : toutes les décisions de layout commencent par 375px
- Navigation fixée en bas (safe area iOS gérée)
- Aucune action critique à plus de 2 taps
- Feedback visuel immédiat sur chaque interaction (boutons qui s'enfoncent, loaders)
- Animations via Framer Motion — pas d'animations CSS pures pour les éléments complexes

---

## Scripts Utiles

```bash
# Lancer le dev complet
cd client && npm run dev   # port 3000
cd server && npm run dev   # port 3001

# Générer les types TypeScript depuis Supabase
cd client && npx supabase gen types typescript --project-id <ref> > lib/supabase/database.types.ts

# Build production
cd client && npm run build
cd server && npm run build
```

---

## Points d'Attention

1. **Unicité des positions** : un seul attaquant et un seul gardien par équipe — géré par une contrainte UNIQUE en base + validation côté serveur
2. **Match en cours** : un joueur ne peut avoir qu'un seul `match_players` actif à la fois (status match = `in_progress`)
3. **Score sans arbitre** : système de vote à 3/4 joueurs avec timeout 30s côté serveur
4. **iOS Safari** : tester l'auth OAuth Apple sur un vrai appareil (comportement différent du simulateur)
5. **QR Code** : `html5-qrcode` nécessite HTTPS en production pour accéder à la caméra
6. **Rang Iridescent** : pas de tier (I/II/III), afficher juste "Iridescent" — prévoir un effet gradient arc-en-ciel animé

---

*Dernière mise à jour : 25 mars 2026*
