# Cahier des Charges — Ranked Baby Foot

> Application web mobile-first de classement de baby-foot pour établissement scolaire
> Version 1.0 — Mars 2026

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
- Connexion via Apple (obligatoire)
- Connexion via email/mot de passe (optionnelle)
- Gestion de session persistante via Supabase Auth

**Profil Joueur**
- Pseudo (unique, modifiable)
- Avatar (photo de profil depuis le compte Google/Apple ou upload manuel)
- Rang actuel avec badge visuel
- Points de rang (RP — Rank Points)
- Statistiques globales : parties jouées, victoires, défaites, ratio V/D, buts marqués, buts encaissés, MVP obtenus
- Historique des 20 dernières parties
- Position préférée (Attaquant / Gardien / Les deux)

### 2.2 Système de Classement

**Structure des Rangs**

| Rang | Paliers | Points requis |
|------|---------|---------------|
| Bronze | I, II, III | 0 – 299 |
| Argent | I, II, III | 300 – 699 |
| Or | I, II, III | 700 – 1 199 |
| Platine | I, II, III | 1 200 – 1 999 |
| Diamant | I, II, III | 2 000 – 2 999 |
| Champion | — | 3 000 – 4 499 |
| Légende | — | 4 500+ |

- Chaque palier (I → II → III) nécessite un seuil de points interne
- La descente de rang est possible si les points tombent en dessous du seuil minimal du palier actuel
- Un bouclier de protection empêche la descente lors des 3 premières parties suivant une montée de rang

**Badge Visuel**
- Chaque rang possède une icône unique et une couleur distinctive (style Clash Royale / League of Legends)
- Les badges sont affichés sur le profil, dans les lobbys de match et sur le leaderboard

**Leaderboard**
- Classement global de tous les joueurs de l'école
- Filtres : global / par semaine / par mois
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
  - **Invitation directe** : recherche d'un joueur par pseudo et envoi d'une invitation push
  - **QR Code** : le créateur génère un QR code scannable qui redirige vers le lobby
- L'hôte peut déplacer les joueurs entre les équipes ou changer leurs positions avant le début du match

**Arbitre (Optionnel)**
- L'hôte peut désigner un arbitre parmi les joueurs présents OU inviter un spectateur comme arbitre
- L'arbitre dispose d'une interface dédiée (différente de celle des joueurs) :
  - Boutons +1 pour chaque équipe
  - Sélection du buteur (liste des attaquants + option "Gardien adverse" pour CSC)
  - Sélection de la position de l'action (attaquant / gardien)
  - Possibilité d'annuler le dernier but
- Sans arbitre, les deux équipes confirment chaque but ensemble (vote à 3/4 joueurs)

**Déroulement du Match**
- Interface en temps réel avec affichage du score, du chronomètre et du fil d'actions (buts)
- Fin de match déclenchée quand le score cible est atteint OU manuellement par l'hôte
- Écran de résultats : scores finaux, détail des buts, MVP, points gagnés/perdus par joueur

### 2.4 Interface Arbitre

L'arbitre dispose d'un panneau de contrôle accessible depuis le match :

- Score actuel des deux équipes en gros
- Liste des joueurs de chaque équipe avec leur position
- Bouton **"But Équipe A"** / **"But Équipe B"** (large, facilement cliquable)
- Après chaque but : pop-up de sélection du buteur (attaquant A, gardien A, attaquant B, gardien B — pour les CSC)
- Bouton **"Annuler le dernier but"** avec confirmation
- Historique scrollable des buts

### 2.5 Algorithme de Points (RP)

L'algorithme calcule les points gagnés ou perdus à la fin de chaque match pour chaque joueur. Il est inspiré du système SR de Call of Duty, avec un concept central : le **HPR (Hidden Performance Rating)**.

**Formule Générale**

```
RP_final = clamp(RP_base × mod_hpr × mod_adversaires × mod_mvp × mod_ecart, -35, +50)
```

---

**Étape 0 — Matchs de Placement**

Les **5 premiers matchs** de chaque joueur sont des matchs de placement. Pendant cette phase :
- Le rang n'est pas encore attribué (badge "En placement" affiché)
- Le `mod_hpr` est fixé à **×2.5** : les RP gagnés/perdus sont amplifiés au maximum pour calibrer rapidement le joueur
- À l'issue du 5ème match, le rang de départ est assigné automatiquement en fonction du `hidden_mmr` accumulé

---

**Étape 1 — HPR (Hidden Performance Rating)**

Chaque joueur possède un `hidden_mmr`, son niveau réel estimé par le serveur, jamais affiché dans l'interface. Il évolue plus vite que les RP visibles et sert à calculer le `mod_hpr`.

La logique : si un joueur très fort commence au Bronze, le système le détecte et lui fait gagner beaucoup plus de RP par victoire jusqu'à ce qu'il atteigne son vrai rang.

| Écart `hidden_mmr − rank_points` | `mod_hpr` | Signification |
|----------------------------------|-----------|---------------|
| > 400 RP | ×2.0 | Très en dessous du vrai niveau → accélération forte |
| 200 – 400 RP | ×1.5 | En dessous du vrai niveau → accélération modérée |
| 50 – 200 RP | ×1.2 | Légèrement en dessous → léger coup de pouce |
| −50 à +50 RP | ×1.0 | À son vrai niveau → progression normale |
| < −50 RP | ×0.8 | Au-dessus du vrai niveau → le système freine |

---

**Étape 2 — RP de Base**

| Résultat | Points de base |
|----------|---------------|
| Victoire | +25 RP |
| Défaite | -20 RP |
| Égalité | +5 RP |

---

**Étape 3 — Modificateur Adversaires**

Basé sur la différence de rang moyen entre les deux équipes.

| Écart de rang | Victoire | Défaite |
|---------------|----------|---------|
| Adversaires 2+ rangs supérieurs | ×1.5 | ×0.5 |
| Adversaires 1 rang supérieur | ×1.25 | ×0.75 |
| Rangs équivalents | ×1.0 | ×1.0 |
| Adversaires 1 rang inférieur | ×0.85 | ×1.1 |
| Adversaires 2+ rangs inférieurs | ×0.7 | ×1.25 |

---

**Étape 4 — Modificateur MVP**

Le gardien marque structurellement moins de buts qu'un attaquant : ses buts comptent ×2 dans le calcul du score MVP pour ne pas pénaliser ce rôle.

`Score MVP = buts × (gardien ? 2 : 1)`

Le joueur avec le meilleur score MVP dans l'équipe gagnante obtient le titre.

| Statut | Modificateur |
|--------|-------------|
| MVP du match | ×1.3 |
| Non-MVP | ×1.0 |

---

**Étape 5 — Modificateur Écart de Buts**

| Écart de buts | Victoire | Défaite |
|---------------|----------|---------|
| 1-2 buts | ×1.1 | ×0.9 |
| 3-4 buts | ×1.0 | ×1.0 |
| 5-6 buts | ×0.95 | ×1.05 |
| 7+ buts | ×0.85 | ×1.15 |

> La logique : une victoire écrasante contre une équipe faible rapporte peu. Une défaite serrée contre une équipe forte coûte peu.

---

**Protections (Loss Forgiveness)**

- **Première défaite du jour gratuite** : pas de perte de RP (ne se cumule pas)
- **Bouclier post-montée** : 3 matchs protégés après une montée de rang (pas de descente possible)
- **Déconnexion coéquipier** : défaite non comptabilisée si un joueur quitte en cours de partie

**Limites globales**
- Gain maximum par match : +50 RP
- Perte maximale par match : -35 RP
- Un joueur ne peut pas tomber en dessous de 0 RP

---

## 3. Design et Expérience Utilisateur

### 3.1 Identité Visuelle

L'interface s'inspire de **Clash Royale** :
- Fond sombre (dark theme) avec des accents colorés vifs
- Cartes animées pour les profils et les rangs
- Effets de brillance/lustre sur les badges de rang
- Typographie bold et impactante
- Animations fluides sur les transitions (montée de rang, fin de match, attribution MVP)

**Palette de couleurs indicative**
- Fond principal : `#1a1a2e` (bleu nuit)
- Accent primaire : `#e94560` (rouge/rose vif)
- Accent secondaire : `#f5a623` (or)
- Texte principal : `#ffffff`
- Texte secondaire : `#a8a8b3`

### 3.2 Navigation

- **Onglet Accueil** : Feed des derniers matchs + bouton "Créer un Match" proéminent
- **Onglet Classement** : Leaderboard global + rang personnel mis en avant
- **Onglet Match** : Rejoindre un match via code ou QR code
- **Onglet Profil** : Stats personnelles, historique, badges

### 3.3 Mobile First

- Toutes les interactions pensées pour le pouce (boutons en bas de l'écran)
- Cartes swipables pour l'historique des matchs
- QR code affiché en plein écran pour le scan
- Interface arbitre optimisée pour une utilisation à une main

---

## 4. Architecture Technique

### 4.1 Stack

| Composant | Technologie |
|-----------|-------------|
| Frontend | Next.js 14+ (App Router) + React 18 |
| Backend | Node.js + Express.js |
| Base de données | Supabase (PostgreSQL) |
| Authentification | Supabase Auth (OAuth Google, Apple, email) |
| Temps réel | Supabase Realtime (WebSockets) |
| QR Code | `qrcode` (génération) + `html5-qrcode` (scan) |
| Styling | Tailwind CSS + Framer Motion (animations) |
| State management | Zustand |
| Validation | Zod (front et back) |

### 4.2 Structure du Projet

```
ranked-baby-foot/
├── client/                  # Application Next.js
│   ├── app/
│   │   ├── (auth)/          # Pages auth (login, register)
│   │   ├── (app)/           # Pages protégées
│   │   │   ├── home/
│   │   │   ├── leaderboard/
│   │   │   ├── match/
│   │   │   │   ├── create/
│   │   │   │   ├── [id]/    # Lobby + interface de jeu
│   │   │   │   └── referee/ # Interface arbitre
│   │   │   └── profile/
│   │   │       └── [id]/
│   │   └── layout.tsx
│   ├── components/
│   │   ├── ui/              # Composants de base
│   │   ├── match/           # Composants match
│   │   ├── rank/            # Badges, cartes de rang
│   │   └── leaderboard/
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utils, supabase client
│   └── stores/              # Zustand stores
│
├── server/                  # API Express
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.ts
│   │   │   ├── matches.ts
│   │   │   ├── players.ts
│   │   │   └── leaderboard.ts
│   │   ├── middleware/
│   │   │   ├── auth.ts      # Vérification JWT Supabase
│   │   │   └── validation.ts
│   │   ├── services/
│   │   │   ├── rankService.ts      # Calcul des RP
│   │   │   ├── matchService.ts
│   │   │   └── notificationService.ts
│   │   ├── utils/
│   │   └── index.ts
│   └── package.json
│
└── README.md
```

### 4.3 Modèle de Données

**Table `players`**
```sql
id uuid PRIMARY KEY (= auth.users.id)
username text UNIQUE NOT NULL
avatar_url text
rank_points integer DEFAULT 0
rank text DEFAULT 'Bronze'
rank_tier integer DEFAULT 1
preferred_position text DEFAULT 'both'
total_games integer DEFAULT 0
wins integer DEFAULT 0
losses integer DEFAULT 0
goals_scored integer DEFAULT 0
mvp_count integer DEFAULT 0
created_at timestamp
updated_at timestamp
```

**Table `matches`**
```sql
id uuid PRIMARY KEY
code text UNIQUE (6 chars)
name text
host_id uuid REFERENCES players
referee_id uuid REFERENCES players (nullable)
status text (lobby | in_progress | finished)
score_target integer DEFAULT 10
score_team_a integer DEFAULT 0
score_team_b integer DEFAULT 0
winner_team text (A | B | draw | null)
created_at timestamp
started_at timestamp
finished_at timestamp
```

**Table `match_players`**
```sql
id uuid PRIMARY KEY
match_id uuid REFERENCES matches
player_id uuid REFERENCES players
team text (A | B)
position text (attacker | goalkeeper)
goals_scored integer DEFAULT 0
is_mvp boolean DEFAULT false
rp_change integer (points gagnés/perdus)
```

**Table `match_events`**
```sql
id uuid PRIMARY KEY
match_id uuid REFERENCES matches
event_type text (goal | goal_cancelled)
team text (A | B)
scorer_id uuid REFERENCES players (nullable)
scorer_position text
created_at timestamp
created_by uuid (arbitre ou joueur)
```

---

## 5. Sécurité et Règles

### 5.1 Règles Métier

- Un joueur ne peut participer qu'à un match en cours à la fois
- Le score ne peut être modifié que par l'arbitre désigné, ou validé par 3/4 des joueurs
- Un match ne peut démarrer que si les 4 slots (2 par équipe) sont remplis
- Le créateur du match peut expulser un joueur du lobby avant le démarrage
- Les résultats d'un match ne sont pris en compte dans le classement que si le match est marqué "finished" officiellement

### 5.2 Anti-Triche

- Toute modification du score transite par le serveur Express (jamais directement depuis le client)
- Les points de rang sont calculés exclusivement côté serveur
- Le JWT Supabase est vérifié sur chaque endpoint sensible
- Un rate-limiting est appliqué sur les endpoints de création de match

---

## 6. Contraintes et Exigences Non-Fonctionnelles

- **Performance** : Temps de chargement initial < 3s sur mobile 4G
- **Disponibilité** : Application accessible 24/7 (hébergement cloud)
- **Scalabilité** : Support de 100+ utilisateurs simultanés
- **Accessibilité** : Contrastes respectant WCAG AA
- **Responsive** : Breakpoints mobile (< 768px) prioritaires, tablette et desktop en bonus
- **Langue** : Interface en français

---

## 7. Livrables

1. Code source (repository Git)
2. Application déployée (URL publique)
3. Documentation technique (CLAUDE.md + README)
4. Plan d'implémentation (plan-implementation.md)

---

*Document rédigé le 25 mars 2026*
