# StreamVax — Documentation Frontend

## Table des matières
1. [Architecture générale](#1-architecture-générale)
2. [Technologies utilisées](#2-technologies-utilisées)
3. [Structure des fichiers](#3-structure-des-fichiers)
4. [Authentification et gestion des rôles](#4-authentification-et-gestion-des-rôles)
5. [Pages et fonctionnalités](#5-pages-et-fonctionnalités)
6. [Couche API — données récupérées et envoyées](#6-couche-api--données-récupérées-et-envoyées)
7. [Connexion au modèle ML](#7-connexion-au-modèle-ml)
8. [Déploiement Docker](#8-déploiement-docker)
9. [Développement local sans Docker](#9-développement-local-sans-docker)

---

## 1. Architecture générale

```
Navigateur
    │
    │  HTTP :80
    ▼
┌─────────────────────────────┐
│  nginx (frontend container) │
│  ─ sert les fichiers React  │
│  ─ proxy /api → web:5000    │
└────────────┬────────────────┘
             │ HTTP interne
             ▼
┌────────────────────────────┐      ┌──────────────────┐
│  Flask / Gunicorn (web)    │ ───▶ │  PostgreSQL (db)  │
│  port 5000                 │      │  port 5432        │
└────────────┬───────────────┘      └──────────────────┘
             │ HTTP externe (optionnel)
             ▼
┌────────────────────────────┐
│  API Modèle ML             │
│  ML_API_BASE_URL           │
└────────────────────────────┘
```

Le frontend React est une **Single Page Application (SPA)**.
nginx gère deux responsabilités :
- Servir les fichiers statiques compilés (`/dist`)
- Proxifier toutes les requêtes `/api/*` vers le backend Flask (`web:5000`)

---

## 2. Technologies utilisées

| Technologie       | Rôle                                    |
|-------------------|-----------------------------------------|
| React 18          | UI déclarative par composants           |
| Vite 5            | Bundler (build rapide, HMR en dev)      |
| React Router v6   | Navigation côté client (SPA)            |
| Axios             | Client HTTP avec intercepteurs JWT      |
| Recharts          | Graphiques (LineChart, BarChart)        |
| Tailwind CSS 3    | Styling utilitaire                      |
| nginx             | Serveur de fichiers statiques + proxy   |
| Docker multi-stage| Build → image nginx légère              |

---

## 3. Structure des fichiers

```
frontend/
├── Dockerfile              # Multi-stage : build Node → image nginx
├── nginx.conf              # Config nginx (SPA + proxy /api)
├── package.json
├── vite.config.js          # Proxy dev → localhost:5000
├── tailwind.config.js
├── postcss.config.js
├── index.html
└── src/
    ├── main.jsx            # Point d'entrée React
    ├── App.jsx             # Routeur principal + redirection par rôle
    ├── index.css           # Directives Tailwind
    │
    ├── api/                # Couche d'accès à l'API REST
    │   ├── client.js       # Instance axios + intercepteurs JWT/401
    │   ├── auth.js         # login, getMe
    │   ├── centres.js      # CRUD centres, records, predictions, alertes
    │   ├── zones.js        # Zones, centres de zone, livraisons
    │   └── dashboard.js    # Stats nationales, données carte
    │
    ├── context/
    │   └── AuthContext.jsx # État utilisateur global (login, logout)
    │
    ├── components/
    │   ├── Navbar.jsx      # Barre de navigation avec rôle et déconnexion
    │   ├── StatCard.jsx    # Carte KPI colorée
    │   ├── AlertBanner.jsx # Bandeau d'alertes avec badges par type
    │   └── PrivateRoute.jsx# Protection de route par rôle
    │
    └── pages/
        ├── Login.jsx
        ├── centre/
        │   └── CentreDashboard.jsx
        ├── zone/
        │   └── ZoneDashboard.jsx
        └── decideur/
            └── DecideurDashboard.jsx
```

---

## 4. Authentification et gestion des rôles

### Flux de connexion
1. L'utilisateur soumet email + mot de passe sur `/login`
2. Le frontend appelle `POST /api/v1/auth/login`
3. Le backend retourne un **JWT** (24h) et les infos utilisateur
4. Le JWT est stocké dans `localStorage` sous la clé `token`
5. L'utilisateur est redirigé vers sa page selon son rôle

### Rôles disponibles
| Rôle       | Page               | Description                       |
|------------|--------------------|-----------------------------------|
| `centre`   | `/centre`          | Agent d'un centre de vaccination  |
| `zone`     | `/zone`            | Point focal d'une zone régionale  |
| `decideur` | `/decideur`        | Décideur national (Ministre)      |

### Gestion du token
- L'intercepteur Axios (`src/api/client.js`) injecte automatiquement le header `Authorization: Bearer <token>` sur chaque requête
- En cas de réponse `401`, le token est supprimé et l'utilisateur est redirigé vers `/login`
- `PrivateRoute` vérifie la présence du token ET le rôle avant d'afficher une page

---

## 5. Pages et fonctionnalités

### 5.1 Login (`/login`)

**Affiche :**
- Formulaire email / mot de passe
- Message d'erreur si identifiants incorrects
- Tableau des comptes de démonstration

**Actions :** connexion → redirection automatique selon le rôle

---

### 5.2 CentreDashboard (`/centre`) — rôle `centre`

**Affiche :**

| Section              | Données affichées                                                   |
|----------------------|---------------------------------------------------------------------|
| Alertes              | Bannières colorées par type (stock_low, surge_risk, missed_entry)   |
| KPIs du jour         | Stock actuel · Capacité/jour · Vaccins du jour · Urgences du jour   |
| Formulaire de saisie | vaccines_done · emergencies_real · stock_used · notes               |
| Graphique historique | Courbes 30 jours : vaccins, urgences, stock utilisé (LineChart)     |
| Prédictions ML       | BarChart + tableau : pred_vaccines · pred_emergencies · confiance   |

**Actions utilisateur :**
- Soumettre la saisie journalière (POST)
- Actualiser les prédictions depuis le modèle ML (POST)
- Marquer toutes les alertes comme lues (POST)

---

### 5.3 ZoneDashboard (`/zone`) — rôle `zone`

**Affiche :**

| Section              | Données affichées                                                       |
|----------------------|-------------------------------------------------------------------------|
| KPIs de zone         | Nb centres · Alertes non lues · Stocks critiques · Livraisons en cours  |
| Tableau des centres  | Nom · Adresse · Stock actuel · Capacité/j · Prédiction demain · Alertes |
| Formulaire livraison | Centre · Date · Quantité · Notes                                        |
| Liste des livraisons | Statut (planifié / en transit / livré) avec actions de progression      |

**Actions utilisateur :**
- Planifier une nouvelle livraison vers un centre (POST)
- Faire progresser le statut d'une livraison : `planifie` → `en_transit` → `livre` (PUT)

---

### 5.4 DecideurDashboard (`/decideur`) — rôle `decideur`

**Affiche :**

| Section                  | Données affichées                                                          |
|--------------------------|----------------------------------------------------------------------------|
| KPIs nationaux           | Total vaccins 30j · Total urgences 30j · Nb centres · Stocks critiques     |
| Graphique zones          | BarChart : total vaccins 30j par zone                                      |
| Tableau récapitulatif    | Zone · Région · Département · Nb centres · Stocks critiques · Vaccins 30j  |
| Grille stocks par zone   | Liste des centres avec stock actuel (vert/rouge selon seuil)               |

**Actions utilisateur :** lecture seule (vue macro décisionnelle)

---

## 6. Couche API — données récupérées et envoyées

Toutes les requêtes passent par `src/api/client.js` (baseURL = `/api/v1`).

### GET — Données récupérées

| Endpoint                                    | Fichier          | Données reçues                                                        |
|---------------------------------------------|------------------|-----------------------------------------------------------------------|
| `GET /auth/me`                              | `auth.js`        | `{id, email, nom, role, centre_id, zone_id}`                         |
| `GET /centres/:id`                          | `centres.js`     | `{id, nom, adresse, latitude, longitude, capacite_jour, stock_actuel}`|
| `GET /centres/:id/records?days=30`          | `centres.js`     | `[{date, vaccines_done, emergencies_real, stock_used}]`              |
| `GET /centres/:id/predictions`              | `centres.js`     | `[{date, pred_vaccines, pred_emergencies, pred_vaccines_month, confidence}]` |
| `GET /centres/:id/alerts`                   | `centres.js`     | `[{id, type, message, is_read, created_at}]`                         |
| `GET /zones/:id/centres`                    | `zones.js`       | `[{...centre, pred_vaccines_tomorrow, unread_alerts}]`               |
| `GET /zones/:id/deliveries`                 | `zones.js`       | `[{id, centre_id, date_livraison, quantite, statut}]`                |
| `GET /dashboard/national`                   | `dashboard.js`   | `{total_vaccines_30j, total_emergencies_30j, nb_centres, nb_zones}`  |
| `GET /dashboard/map-data`                   | `dashboard.js`   | `[{zone_id, nom, region, departement, nb_centres, total_vaccines_30j, centres: [...]}]` |

### POST/PUT — Données envoyées

| Endpoint                                      | Méthode | Body envoyé                                                       |
|-----------------------------------------------|---------|-------------------------------------------------------------------|
| `/auth/login`                                 | POST    | `{email, password}`                                               |
| `/centres/:id/records`                        | POST    | `{vaccines_done, emergencies_real, stock_used, notes}`            |
| `/centres/:id/predictions/refresh`            | POST    | _(vide — déclenche l'appel vers l'API ML côté backend)_           |
| `/centres/:id/alerts/read`                    | POST    | _(vide — marque toutes les alertes non lues comme lues)_          |
| `/zones/:id/deliveries`                       | POST    | `{centre_id, date_livraison, quantite, notes}`                    |
| `/deliveries/:id/status`                      | PUT     | `{statut}` — valeurs : `planifie` · `en_transit` · `livre`        |

---

## 7. Connexion au modèle ML

### Fonctionnement

Le modèle ML est un **service externe indépendant** — il n'est pas intégré dans le frontend ni dans le backend directement.

```
Frontend (React)
    │
    │  POST /api/v1/centres/:id/predictions/refresh
    ▼
Backend Flask (ml_client.py)
    │
    │  GET {ML_API_BASE_URL}/predict
    │  ?centre_id=...&date_start=...&days_ahead=7
    │  Authorization: Bearer {ML_API_KEY}
    ▼
Service ML externe
    │
    │  Réponse JSON :
    │  [{
    │    "date": "2026-03-15",
    │    "pred_vaccines": 85,
    │    "pred_emergencies": 12,
    │    "pred_vaccines_month": 2500,
    │    "confidence": 0.87
    │  }, ...]
    ▼
Backend : stockage en base (table predictions)
    │
    ▼
Frontend : GET /centres/:id/predictions → affichage
```

### Configurer le service ML

Dans le `docker-compose.yml` (ou fichier `.env` à la racine) :

```env
ML_API_BASE_URL=http://mon-service-ml:8000
ML_API_KEY=ma-cle-api-secrete
```

Le backend Flask appelle automatiquement `{ML_API_BASE_URL}/predict` avec :
- `centre_id` : identifiant du centre
- `date_start` : date du jour (ISO)
- `days_ahead` : nombre de jours à prédire (défaut = 7)
- Header `Authorization: Bearer {ML_API_KEY}`

Si le service ML est indisponible, le bouton "Actualiser le modèle" affiche un message d'erreur — les prédictions existantes en base restent affichées.

### Types d'alertes générés par le modèle

Après chaque saisie quotidienne, le backend analyse les prédictions et génère automatiquement des alertes :

| Type            | Déclencheur                                              |
|-----------------|----------------------------------------------------------|
| `stock_low`     | Stock restant < seuil × capacité journalière             |
| `surge_risk`    | `pred_emergencies` demain ≥ `SURGE_RISK_THRESHOLD` × capacité |
| `missed_entry`  | Aucune saisie pour la veille                             |
| `delivery_due`  | Livraison planifiée à venir                              |

---

## 8. Déploiement Docker

### Lancer tous les services

```bash
# Depuis la racine du repo (vaccine-delivery-optimization/)
docker compose up --build
```

| Service    | Port   | Description                        |
|------------|--------|------------------------------------|
| `frontend` | `:80`  | Interface React (nginx)            |
| `web`      | `:5000`| API Flask (debug uniquement)       |
| `db`       | `:5432`| PostgreSQL                         |

Accès : **http://localhost**

### Seed de la base (première utilisation)

```bash
docker compose exec web flask seed
```

Crée : 1 zone · 2 centres · 3 utilisateurs (mdp : `demo1234`)

### Variables d'environnement

Créer un fichier `.env` à la racine du repo pour surcharger les valeurs :

```env
ML_API_BASE_URL=http://mon-api-ml:8000
ML_API_KEY=my-secret-key
SECRET_KEY=une-cle-longue-et-aleatoire
```

---

## 9. Développement local sans Docker

### Backend

```bash
cd StreamVax/backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # adapter DATABASE_URL
flask db upgrade
flask run              # http://localhost:5000
```

### Frontend

```bash
cd StreamVax/frontend
npm install
npm run dev            # http://localhost:3000
```

Le serveur Vite proxifie automatiquement `/api/*` vers `http://localhost:5000`
(configuré dans `vite.config.js`).
