# Changelog

Les changements sont regroupés par version selon [Keep a Changelog](https://keepachangelog.com/), avec des versions [SemVer](https://semver.org/).

## [Unreleased]

### Added

- Hooks Git de commit/push et CI de qualité Windows/Linux, avec lint strict, formatage, types, architecture, tests et build.

- Vue commune Tes plays/direct, basculement automatique et sélection manuelle de l’historique.
- Widgets de score partagés avec les tentatives sauvegardées, snapshot des nouvelles captures et PP FC dans la chronologie.
- Filtres visibles de tags, source du morceau, mapper et difficulté dans la bibliothèque et les recommandations.

- Configuration Tauri 2 : fenêtre desktop et backend Node local embarqué, données dans le dossier de l’application.
- Liaison OAuth osu! avec autorisation dans le navigateur, profil public en cache, actualisation et déconnexion.
- Traductions français/anglais, préférence de langue par appareil et documentation pour ajouter une langue.
- Notes de version accessibles dans l’application.
- Workflow de builds Windows/macOS/Linux et création d’une release GitHub en brouillon sur les tags `v*`.

### Changed

- Architecture organisée par fonctionnalités : routes/services/repositories backend, vues et composants frontend, App conservé comme composition globale.
- Contrat RPC du catalogue typé, séparation transport/normalisation/capture tosu et styles répartis en fichiers.

- Chronologie et erreurs côte à côte, score dessous ; regroupement des misses/sliderbreaks par seconde.

- Les Réglages restent dans la navigation latérale ; l’avatar devient l’accès au compte osu!.
- Navigation adaptée aux petites fenêtres, dialogues avec gestion native du focus et amélioration du clavier/mouvement réduit.

### Fixed

- Lecture lazer avec le nom persisté `File` du modèle Realm.
- Capture des plays : statut partie/replay dédié, récupération du résultat et synchronisation du départ évitant les retries fantômes.

## [0.1.0]

### Added

- Compagnon local React/TypeScript/Vite et backend Node/Fastify.
- Index SQLite, bibliothèque stable, recherche, collections et calculs locaux.
- Profils stable/lazer et lecture Realm sur copie.
- Découverte osu! en cache avec budget 5/minute, recommandations initiales et chargement au scroll.
- Capture tosu, diagnostic local et dashboard En direct.

[Unreleased]: https://github.com/Debuzzz/osumosis/compare/main...HEAD
[0.1.0]: https://github.com/Debuzzz/osumosis
