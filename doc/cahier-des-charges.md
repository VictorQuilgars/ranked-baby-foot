# Cahier des Charges — Ranked Baby Foot

> Application web mobile-first de classement de baby-foot pour établissement scolaire
> Version 2.0 — Mars 2026

---

## 1. Contexte et Objectifs

### 1.1 Contexte

Au sein de l'école, le baby-foot est une activité pratiquée régulièrement par les élèves. L'absence d'un système de suivi officiel empêche la création d'une compétition structurée et engageante. Ce projet vise à combler ce manque en proposant une application dédiée aux parties officielles.

### 1.2 Objectifs

- Officialiser les parties de baby-foot au sein de l'établissement
- Créer un système de classement motivant, inspiré du mode Ranked de Call of Duty
- Offrir une expérience utilisateur engageante, inspirée de l'interface de Clash Royale
- Permettre le suivi détaillé des performances individuelles (buts, position, MVP)
- Fournir un outil accessible sur mobile avant tout

### 1.3 Cible Utilisateur

Élèves et personnel de l'établissement scolaire. L'application doit être simple, rapide à prendre en main et agréable à utiliser pendant les pauses.

---

## 2. Fonctionnalités

### 2.1 Authentification et Profil

**Authentification**
- Connexion via Google (obligatoire)
- Connexion via Apple (optionnelle)
- Gestion de session persistante via Supabase Auth

**Profil Joueur**
- Pseudo (unique, modifiable)
- Avatar (photo de profil depuis le compte Google/Apple)
- Rang actuel avec badge visuel
- SR (Skill Rating)
- Statistiques globales : parties jouées, victoires, défaites, ratio V/D, buts marqués, MVP obtenus
- Historique des 20 dernières parties
- Position préférée (Attaquant / Gardien / Les deux)

### 2.2 Système de Classement

**Structure des Rangs**

| Rang | Paliers | SR requis |
|------|---------|-----------|
| Bronze | I, II, III | 0 – 299 |
| Silver | I, II, III | 300 – 699 |
| Gold | I, II, III | 700 – 1 199 |
| Platinum | I, II, III | 1 200 – 1 999 |
| Diamond | I, II, III | 2 000 – 2 999 |
| Crimson | I, II, III | 3 000 – 4 499 |
| Iridescent | — | 4 500+ |

- Chaque palier (I → II → III) nécessite un seuil de SR interne
- La descente de rang est possible si les SR tombent en dessous du seuil minimal du palier actuel
- Un bouclier de protection empêche la descente lors des 3 premières parties suivant une montée de rang

**Badge Visuel**
- Chaque rang possède une icône unique et une couleur distinctive (style Clash Royale)
- Les badges sont affichés sur le profil, dans les lobbys de match et sur le leaderboard

**Leaderboard**
- Classement global de tous les joueurs de l'école
- Mise en avant du Top 3 (podium avec animation)

### 2.3 Création et Gestion de Match

**Création d'un Match**
1. Un joueur crée une session de match
2. Il définit le nom du match (optionnel) et le score cible (ex : premier à 10 buts)
3. Deux équipes sont automatiquement créées (Équipe A et Équipe B)
4. Le créateur choisit son équipe et sa position (Attaquant / Gardien)

**Composition des Équipes**
- Chaque équipe est composée de 2 joueurs : 1 Attaquant + 1 Gardien
- Un joueur peut rejoindre un match de trois façons :
  - **Rejoindre via code** : le créateur partage un code de lobby à 6 caractères
  - **Invitation directe** : recherche d'un joueur par pseudo et envoi d'une invitation
  - **QR Code** : le créateur génère un QR code scannable qui redirige vers le lobby
- L'hôte peut déplacer les joueurs entre les équipes ou changer leurs positions avant le début du match

**Arbitre (Optionnel)**
- L'hôte peut désigner un arbitre parmi les joueurs présents OU inviter un spectateur comme arbitre
- L'arbitre dispose d'une interface dédiée :
  - Boutons +1 pour chaque équipe
  - Sélection du buteur
  - Possibilité d'annuler le dernier but
- Sans arbitre, les deux équipes confirment chaque but ensemble (vote à 3/4 joueurs)

**Déroulement du Match**
- Interface en temps réel avec affichage du score et du fil d'actions (buts)
- Fin de match déclenchée quand le score cible est atteint OU manuellement par l'hôte
- Écran de résultats : scores finaux, détail des buts, MVP, SR gagnés/perdus par joueur

### 2.4 Algorithme de Points (SR — Skill Rating)

**Formule Générale**

```
SR_final = clamp(SR_base × mod_hpr × mod_adversaires × mod_mvp × mod_ecart, -35, +50)
```

**Étape 0 — Matchs de Placement**

Les **5 premiers matchs** de chaque joueur sont des matchs de placement. Pendant cette phase :
- Le rang n'est pas encore attribué (badge "En placement" affiché)
- Le `mod_hpr` est fixé à ×2.5 : les SR gagnés/perdus sont amplifiés pour calibrer rapidement le joueur
- À l'issue du 5ème match, le rang de départ est assigné automatiquement

**Étape 1 — HPR (Hidden Performance Rating)**

Chaque joueur possède un `hidden_mmr`, jamais affiché dans l'interface. Il évolue plus vite que les SR visibles et pilote la vitesse de progression.

| Écart `hidden_mmr − rank_points` | `mod_hpr` |
|----------------------------------|-----------|
| > 400 SR | ×2.0 |
| 200 – 400 SR | ×1.5 |
| 50 – 200 SR | ×1.2 |
| −50 à +50 SR | ×1.0 |
| < −50 SR | ×0.8 |

**Étape 2 — SR de Base**

| Résultat | Points |
|----------|--------|
| Victoire | +25 SR |
| Défaite | -20 SR |
| Égalité | +5 SR |

**Étape 3 — Modificateur Adversaires**

| Écart de rang | Victoire | Défaite |
|---------------|----------|---------|
| Adversaires 2+ rangs supérieurs | ×1.5 | ×0.5 |
| Adversaires 1 rang supérieur | ×1.25 | ×0.75 |
| Rangs équivalents | ×1.0 | ×1.0 |
| Adversaires 1 rang inférieur | ×0.85 | ×1.1 |
| Adversaires 2+ rangs inférieurs | ×0.7 | ×1.25 |

**Étape 4 — Modificateur MVP**

`Score MVP = buts × (gardien ? 2 : 1)`

| Statut | Modificateur |
|--------|-------------|
| MVP du match | ×1.3 |
| Non-MVP | ×1.0 |

**Étape 5 — Modificateur Écart de Buts**

| Écart | Victoire | Défaite |
|-------|----------|---------|
| 1-2 buts | ×1.1 | ×0.9 |
| 3-4 buts | ×1.0 | ×1.0 |
| 5-6 buts | ×0.95 | ×1.05 |
| 7+ buts | ×0.85 | ×1.15 |

**Protections**
- **Première défaite du jour gratuite** : pas de perte de SR (reset à minuit)
- **Bouclier post-montée** : 3 matchs protégés après une montée de rang
- **Déconnexion coéquipier** : défaite non comptabilisée si un joueur quitte en cours de partie

**Limites globales**
- Gain maximum par match : +50 SR
- Perte maximale par match : -35 SR
- Un joueur ne peut pas tomber en dessous de 0 SR

---

## 3. Design et Expérience Utilisateur

### 3.1 Identité Visuelle

L'interface s'inspire de **Clash Royale** :
- Fond sombre (dark theme) avec des accents colorés vifs
- Badge de rang centré et proéminent (élément principal de la page d'accueil)
- Effets de brillance/lustre sur les badges de rang
- Typographie bold et impactante
- Animations fluides (montée de rang, fin de match, attribution MVP)

**Palette de couleurs**
- Fond principal : `#1a1a2e`
- Accent primaire : `#e94560`
- Accent secondaire : `#f5a623`
- Texte principal : `#ffffff`
- Texte secondaire : `#a8a8b3`

### 3.2 Navigation

- **Onglet Accueil** : Rang du joueur en grand + boutons "Créer" / "Rejoindre"
- **Onglet Classement** : Leaderboard global
- **Onglet Match** : Rejoindre via code ou QR code
- **Onglet Profil** : Stats personnelles, historique, badges

### 3.3 Mobile First

- Toutes les interactions pensées pour le pouce (boutons en bas de l'écran)
- Safe area iOS gérée
- QR code affiché en plein écran pour le scan
- Interface arbitre optimisée pour une utilisation à une main

---

## 4. Architecture Technique

### 4.1 Stack

| Composant | Technologie |
|-----------|-------------|
| Framework | Next.js 15 (App Router) |
| Langage | TypeScript 5 strict |
| UI | React 19 |
| Styling | Tailwind CSS 3 |
| Animations | Framer Motion 11 |
| State | Zustand 5 |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth (Google OAuth) |
| Temps réel | Supabase Realtime |
| API | Next.js Route Handlers (`app/api/`) |
| Logique métier | Server Actions + Services (`lib/services/`) |
| Validation | Zod 3 |
| Déploiement | Vercel |

> **Pas de serveur séparé.** Toute la logique backend est dans les Route Handlers et Server Actions de Next.js 15. La `SUPABASE_SERVICE_ROLE_KEY` est utilisée uniquement côté serveur (jamais exposée au client).

### 4.2 Structure du Projet

```
ranked-baby-foot/
└── app/                          # Projet Next.js 15 (unique)
    ├── app/
    │   ├── api/                  # Route Handlers (remplace Express)
    │   │   ├── matches/
    │   │   │   ├── route.ts              # POST /api/matches
    │   │   │   └── [id]/
    │   │   │       ├── route.ts          # GET /api/matches/:id
    │   │   │       ├── join/route.ts
    │   │   │       ├── leave/route.ts
    │   │   │       ├── start/route.ts
    │   │   │       ├── goal/route.ts
    │   │   │       └── finish/route.ts
    │   │   ├── matches/code/[code]/route.ts
    │   │   ├── players/
    │   │   │   ├── me/route.ts
    │   │   │   ├── me/history/route.ts
    │   │   │   ├── search/route.ts
    │   │   │   └── [id]/route.ts
    │   │   ├── leaderboard/route.ts
    │   │   └── invitations/
    │   │       ├── route.ts
    │   │       └── [id]/
    │   │           ├── accept/route.ts
    │   │           └── decline/route.ts
    │   ├── (auth)/
    │   │   └── login/page.tsx
    │   ├── (app)/
    │   │   ├── layout.tsx
    │   │   ├── home/page.tsx
    │   │   ├── leaderboard/page.tsx
    │   │   ├── match/
    │   │   │   ├── create/page.tsx
    │   │   │   ├── join/page.tsx
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx          # Lobby + jeu
    │   │   │       └── referee/page.tsx
    │   │   └── profile/
    │   │       ├── me/page.tsx
    │   │       └── [id]/page.tsx
    │   ├── auth/callback/route.ts
    │   └── layout.tsx
    ├── components/
    │   ├── ui/
    │   ├── match/
    │   ├── rank/
    │   └── leaderboard/
    ├── hooks/
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts         # createBrowserClient (anon key)
    │   │   └── server.ts         # createServerClient (service role)
    │   ├── services/
    │   │   ├── rankService.ts    # Algorithme SR (server-only)
    │   │   └── matchCode.ts      # Générateur de code 6 chars
    │   └── utils.ts
    ├── stores/
    ├── types/
    ├── middleware.ts
    └── .env.local
```

### 4.3 Modèle de Données

**Table `players`**
```sql
id                      uuid PRIMARY KEY  -- = auth.users.id
username                text UNIQUE NOT NULL
avatar_url              text
rank_points             integer DEFAULT 0          -- SR visibles
rank                    text DEFAULT 'Bronze'
rank_tier               integer DEFAULT 1
hidden_mmr              integer DEFAULT 0          -- HPR caché
placement_matches_left  integer DEFAULT 5
preferred_position      text DEFAULT 'both'
total_games             integer DEFAULT 0
wins                    integer DEFAULT 0
losses                  integer DEFAULT 0
goals_scored            integer DEFAULT 0
mvp_count               integer DEFAULT 0
rank_shield             integer DEFAULT 0
daily_loss_forgiven     boolean DEFAULT false
created_at              timestamptz DEFAULT now()
updated_at              timestamptz DEFAULT now()
```

**Table `matches`**
```sql
id              uuid PRIMARY KEY
code            text UNIQUE (6 chars)
name            text
host_id         uuid REFERENCES players
referee_id      uuid REFERENCES players
status          text DEFAULT 'lobby'  -- lobby | in_progress | finished | cancelled
score_target    integer DEFAULT 10
score_team_a    integer DEFAULT 0
score_team_b    integer DEFAULT 0
winner_team     text  -- A | B | draw | null
created_at      timestamptz
started_at      timestamptz
finished_at     timestamptz
```

**Table `match_players`**
```sql
id            uuid PRIMARY KEY
match_id      uuid REFERENCES matches ON DELETE CASCADE
player_id     uuid REFERENCES players
team          text  -- A | B
position      text  -- attacker | goalkeeper
goals_scored  integer DEFAULT 0
is_mvp        boolean DEFAULT false
sr_change     integer  -- null jusqu'à la fin
joined_at     timestamptz DEFAULT now()
UNIQUE (match_id, player_id)
UNIQUE (match_id, team, position)
```

**Table `match_events`**
```sql
id              uuid PRIMARY KEY
match_id        uuid REFERENCES matches ON DELETE CASCADE
event_type      text  -- goal | goal_cancelled
team            text  -- A | B
scorer_id       uuid REFERENCES players
scorer_position text  -- attacker | goalkeeper
created_at      timestamptz DEFAULT now()
created_by      uuid REFERENCES players
```

**Table `invitations`**
```sql
id          uuid PRIMARY KEY
match_id    uuid REFERENCES matches ON DELETE CASCADE
inviter_id  uuid REFERENCES players
invited_id  uuid REFERENCES players
status      text DEFAULT 'pending'  -- pending | accepted | declined | expired
created_at  timestamptz DEFAULT now()
expires_at  timestamptz  -- 15 min après création
```

---

## 5. Sécurité

### 5.1 Règles Métier

- Un joueur ne peut participer qu'à un match en cours à la fois
- Le score ne peut être modifié que par l'arbitre désigné, ou validé par 3/4 des joueurs
- Un match ne peut démarrer que si les 4 slots sont remplis
- Les résultats ne sont pris en compte que si le match est marqué "finished"

### 5.2 Sécurité Technique

- Toute logique sensible (calcul SR, modification score) est dans les **Route Handlers** (serveur uniquement)
- La `SUPABASE_SERVICE_ROLE_KEY` n'est jamais exposée au client (variable sans prefix `NEXT_PUBLIC_`)
- Chaque Route Handler vérifie le JWT via `supabase.auth.getUser()` avant d'agir
- RLS Supabase activé sur toutes les tables comme filet de sécurité supplémentaire
- Rate limiting implémenté dans les Route Handlers sensibles

---

## 6. Variables d'Environnement

```env
# .env.local (jamais commité)
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...      # Clé publique (lecture)
SUPABASE_SERVICE_ROLE_KEY=eyJ...          # Clé privée (écriture) — server only
```

---

## 7. Déploiement

- **Plateforme** : Vercel (Next.js natif)
- **Base de données** : Supabase (hébergé)
- **Pas de serveur séparé** : les Route Handlers sont déployés en fonctions serverless Vercel

---

## 8. Contraintes Non-Fonctionnelles

- **Performance** : Temps de chargement initial < 3s sur mobile 4G
- **Disponibilité** : Application accessible 24/7
- **Responsive** : Mobile (375px) prioritaire, tablette en bonus
- **Langue** : Interface en français

---

*Document mis à jour le 25 mars 2026 — Version 2.0 (migration full Next.js)*
