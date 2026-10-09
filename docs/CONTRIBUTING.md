# Modifier osu!mosis

Le projet utilise Node.js 22.12+ et npm. Depuis le dépôt, `npm ci` installe les dépendances et les hooks Git Husky. Ces hooks fonctionnent avec Git Bash et Git for Windows, sans script PowerShell.

## Trouver le bon fichier

- Modifier une vue : `src/features/<fonctionnalité>/`.
- Modifier un composant visuel commun : `src/components/`.
- Modifier une action globale ou ajouter une page : `src/App.tsx` et `src/app/navigation.ts`.
- Modifier un outil de formatage, un appel HTTP ou la langue : `src/lib/` et `src/locales/`.
- Modifier les filtres de recherche : composants dans `src/features/library/`, schémas et compilation SQL dans `server/features/maps/`.
- Modifier une route : `server/features/<fonctionnalité>/api.ts`, puis son service ou repository.
- Modifier une capture : transport, normalisation et politique dans `server/features/telemetry/`.
- Modifier le schéma SQLite : `server/infrastructure/database.ts`, avec une migration préservant les données.

`shared/` porte les contrats communs sans importer `src/` ou `server/`. Une fonctionnalité backend reçoit ses dépendances ; les routes ne créent pas de nouvelle connexion SQLite. Ajouter une commande catalogue dans le repository concerné met à jour le contrat RPC inféré. Ajouter un module API nécessite son enregistrement dans `server/app.ts`.

La [documentation d’architecture](ARCHITECTURE.md) décrit les responsabilités et le lien entre les composants et App.

## Vérifier les changements

```sh
npm run format       # appliquer le formatage
npm run check        # lint, format, types et architecture
npm test             # profils, stockage, API et capture tosu locale simulée
npm run test:realm   # indexation d’une base Realm synthétique
npm run build        # frontend et backend de production
npm run verify       # l’ensemble des contrôles du push et de la CI
```

Les tests travaillent dans des dossiers temporaires et n’utilisent pas la bibliothèque osu! du PC. La télémétrie de test utilise un serveur WebSocket local créé pour le test. Realm, SQLite et rosu nécessitent leurs modules natifs, installés par npm.

## Ce qui bloque un commit ou un push

Au commit, `lint-staged` formate les fichiers préparés avec Prettier puis exige un lint sans erreur ni avertissement. TypeScript et les dépendances sont ensuite vérifiés sur le dépôt. Les modifications de formatage sont incluses au commit par lint-staged.

Avant le push, `npm run verify` contrôle tout le dépôt, exécute les tests et compile le frontend/backend. Une erreur arrête le push. La CI GitHub refait les mêmes étapes sous Windows et Linux pour les pull requests et les pushes sur `main`.

Les hooks sont locaux et peuvent être contournés par Git ; pour imposer le contrôle côté GitHub, activer une règle de protection de `main` et rendre les jobs de qualité obligatoires. Cela se règle dans les paramètres du dépôt GitHub. La compilation Rust et les installateurs sont couverts par le workflow desktop séparé, et les essais avec le vrai jeu restent nécessaires.

Après une récupération du refactor, lancer `npm ci` pour activer les hooks, puis `npm run verify`. Les commandes `npm run dev`, `npm start` et `npm run desktop:dev` restent identiques.
