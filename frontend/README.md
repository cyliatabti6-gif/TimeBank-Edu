# TimeBank Edu

Plateforme web de **tutorat universitaire** fondée sur une **banque de temps** : une heure enseignée équivaut à une heure créditée, pour favoriser l’entraide entre étudiants.

Application **single-page** construite avec **React** et **Vite**, interface en **français**, données de démonstration côté client (pas d’API backend dans ce dépôt).

## Fonctionnalités principales

- **Étudiants** : tableau de bord, recherche de modules, demandes de tutorat, historique, statistiques, profil, tutorats, notifications, chat, paramètres du compte.
- **Tuteurs** : gestion des modules proposés, demandes reçues, planning, statistiques, profil.
- **Administrateurs** : utilisateurs, modules, transactions, litiges, statistiques globales, paramètres.
- **Commun** : réservation, séances, évaluations, signalement d’absence, pages publiques (accueil, connexion, inscription, mot de passe oublié, confirmation e-mail).

Les rôles sont protégés par des routes ; l’authentification est **simulée** via le contexte React (`AppContext`) avec des jeux de données mock.

## Stack technique

| Élément | Technologie |
|--------|-------------|
| UI | React 19 |
| Build / dev | Vite 8 |
| Routage | React Router 7 |
| Styles | Tailwind CSS 3, PostCSS |
| Graphiques | Recharts |
| Icônes | Lucide React |
| Lint | ESLint 9 |

## Prérequis

- [Node.js](https://nodejs.org/) **LTS** (ex. v20 ou v22) — installe aussi **npm**.
- Un terminal (PowerShell ou Invite de commandes sur Windows, Terminal sur macOS/Linux).
- Connexion Internet uniquement pour le **premier** `npm install` (téléchargement des paquets).

Vérifier l’installation :

```bash
node -v
npm -v
```

Les deux commandes doivent afficher un numéro de version sans erreur.

## Lancer le projet — étapes complètes

### 1. Ouvrir le dossier du projet

Placez-vous dans le répertoire qui contient `package.json` (le dossier du dépôt, par ex. `PLDPROJECT`).

**Windows (PowerShell)** — adaptez le chemin si besoin :

```powershell
cd "C:\Users\VOTRE_NOM\Documents\PLDPROJECT"
```

**macOS / Linux** :

```bash
cd ~/chemin/vers/PLDPROJECT
```

### 2. Installer les dépendances

Une seule fois (ou après suppression de `node_modules`) :

```bash
npm install
```

Attendre la fin sans message d’erreur réseau ou de permissions.

### 3. Démarrer le serveur de développement

```bash
npm run dev
```

Le terminal affiche une URL locale, en général :

`http://localhost:5173`

### 4. Ouvrir l’application dans le navigateur

- Cliquez sur le lien affiché par Vite, **ou**
- Saisissez manuellement `http://localhost:5173` dans Chrome, Edge ou Firefox.

### 5. Arrêter le serveur

Dans le terminal où `npm run dev` tourne, appuyez sur **Ctrl+C**, puis confirmez si demandé.

### Problèmes fréquents

| Symptôme | Piste |
|----------|--------|
| `npm` ou `node` introuvable | Réinstaller Node.js LTS et rouvrir le terminal. |
| Port déjà utilisé | Fermer l’autre appli qui utilise le port, ou lancer Vite avec un autre port : `npx vite --port 3000`. |
| Erreur après clonage / copie | Supprimer le dossier `node_modules`, puis relancer `npm install`. |

### Tester la build de production (optionnel)

```bash
npm run build
npm run preview
```

Ouvrir l’URL indiquée (souvent `http://localhost:4173`) pour prévisualiser le site tel qu’en production.

## Scripts npm

| Commande | Description |
|----------|-------------|
| `npm run dev` | Serveur de développement avec rechargement à chaud (HMR) |
| `npm run build` | Build de production dans `dist/` |
| `npm run preview` | Prévisualisation locale du build de production |
| `npm run lint` | Analyse ESLint sur le projet |

## Structure du dépôt (aperçu)

- `src/App.jsx` — Définition des routes et garde d’accès par rôle.
- `src/context/AppContext.jsx` — État global (utilisateur courant, thème, notifications) et données mock.
- `src/pages/` — Pages par espace (étudiant, tuteur, admin, partagé, public).
- `src/components/` — Composants réutilisables (layout, UI commune).
- `public/` — Assets statiques servis à la racine.

## Données et authentification

Les listes (étudiants, tuteurs, modules, séances, etc.) sont des **données fictives** dans `AppContext.jsx`. La connexion choisit un profil selon le rôle sélectionné à des fins de démo uniquement.

Pour un déploiement réel, il faudrait brancher un backend, une vraie authentification et une persistance (base de données).

## Licence

Projet privé (`"private": true` dans `package.json`). Adapter la licence selon votre contexte académique ou institutionnel.
