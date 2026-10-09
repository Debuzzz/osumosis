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

### Fins de ligne sous Windows

Git et Prettier utilisent LF pour les fichiers texte du dépôt. `.gitattributes` impose LF même avec `core.autocrlf=true`, et Prettier conserve ce format. Une ancienne copie Windows peut encore contenir CRLF ; après récupération du correctif, lancer `npm run format`, puis `npm run check`. Cela met à jour les fichiers déjà présents, que Git ne réécrit pas tous lors d’un pull.

Si Prettier signale presque tous les fichiers alors qu’ESLint passe, consulter `git ls-files --eol` : `w/crlf` indique les fins de ligne Windows dans la copie locale. Les avertissements de Prettier concernent le format ; son code de sortie 1 fait volontairement échouer le contrôle. Avant de relancer une release, vérifier `git status` et committer les changements voulus pour retrouver un dépôt propre.

## Ce qui bloque un commit ou un push

Au commit, `lint-staged` formate les fichiers préparés avec Prettier puis exige un lint sans erreur ni avertissement. TypeScript, les dépendances et la cohérence des versions npm/Tauri sont ensuite vérifiés sur le dépôt. Les modifications de formatage sont incluses au commit par lint-staged.

Avant le push, `npm run verify` contrôle tout le dépôt, exécute les tests et compile le frontend/backend. Une erreur arrête le push. La CI GitHub refait les mêmes étapes sous Windows et Linux pour les pull requests et les pushes sur `main`.

Les hooks sont locaux et peuvent être contournés par Git ; pour imposer le contrôle côté GitHub, activer une règle de protection de `main` et rendre les jobs de qualité obligatoires. Cela se règle dans les paramètres du dépôt GitHub. La compilation Rust et les installateurs sont couverts par le workflow desktop séparé, et les essais avec le vrai jeu restent nécessaires.

Après une récupération du refactor, lancer `npm ci` pour activer les hooks, puis `npm run verify`. Les commandes `npm run dev`, `npm start` et `npm run desktop:dev` restent identiques.

## Préparer une version

La version change à chaque release. Plusieurs commits et pushes peuvent préparer une même release. Le hook de push vérifie la cohérence des versions ; le choix interactif se fait dans une commande dédiée, car Git utilise déjà l’entrée standard du hook pour transmettre les références à pousser et la CI ne peut pas répondre à une question.

Après avoir fusionné les changements destinés à la release, compléter les notes sous `[Unreleased]` dans `CHANGELOG.md` et committer ces changements. Depuis un dépôt propre, lancer :

```sh
npm run release
```

Le terminal affiche les prochaines versions et demande `patch`, `minor` ou `major`. Une réponse vide annule. Avec `0.3.0`, patch donne `0.3.1`, minor donne `0.4.0` et major donne `1.0.0`. Utiliser patch pour les corrections, minor pour les fonctionnalités et major pour une rupture de compatibilité. Pendant la phase `0.x`, une rupture peut être annoncée par une nouvelle minor.

Une variante sans question fonctionne dans Git Bash, cmd.exe et les scripts :

```sh
npm run release -- minor
# Équivalent direct avec les mêmes hooks :
npm version minor -m "chore(release): v%s"
```

La commande utilise le cycle de version npm :

1. `preversion` exécute `npm run verify` avant de changer les fichiers.
2. npm met à jour `package.json` et `package-lock.json`.
3. `version` synchronise `tauri.conf.json`, `Cargo.toml` et l’entrée de l’application dans `Cargo.lock`, puis transforme les notes `[Unreleased]` en une section datée pour cette version.
4. npm crée un commit et un tag annoté local `vX.Y.Z`, en exécutant aussi les hooks de commit.

L’interface affiche directement la version de `package.json`, traduite en français ou anglais. `npm run check:versions` vérifie tous les fichiers de version. `npm run version:sync` répare uniquement les métadonnées desktop à partir de la version npm, sans créer de release ni modifier les notes.

Pour publier le commit et les tags annotés locaux accessibles depuis la branche :

```sh
git push origin HEAD --follow-tags
```

Le push exécute à nouveau les contrôles. Un tag `v*` déclenche le workflow desktop Windows/macOS/Linux et crée une release GitHub en brouillon. Le workflow contrôle que le tag correspond aux versions embarquées ; publier la release après validation des installateurs. Si `main` est protégé, faire accepter le commit de version par une PR avant de pousser son tag. La commande `release` prépare la version localement ; la publication est une étape explicite.
