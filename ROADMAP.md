# osu!mosis — feuille de route

## Livré dans 0.1

- [x] Service terminal + interface React/Vite sur localhost.
- [x] Catalogue SQLite, indexation `.osu` et métadonnées `osu!.db`.
- [x] Collections stable, références manquantes conservées.
- [x] Recherche textuelle/comparateurs, filtres, cartes et détails.
- [x] Médias locaux et cache des miniatures en ligne.
- [x] Calculs locaux de difficulté, strain et PP avec mods.
- [x] Connexion tosu et journal de tentatives avec erreurs par intervalle.
- [x] Découverte officielle, curseurs, cache, budget partagé 5/min.
- [x] Recommandations initiales par difficulté, diversité et historique.

## Profil et recommandations personnalisées

- [x] OAuth utilisateur `public identify` avec callback local, state et refresh token ; profil public en cache.
- [ ] Valider le flux OAuth avec un compte réel et préparer l’authentification de la distribution publique (sans secret embarqué).
- [ ] Snapshots des tops, scores récents et profil par ruleset ; cache partagé.
- [ ] Import versionné de `scores.db`, sans supposer qu’il contient les frames de replay.
- [ ] Profil par mode, mods/vitesse, caractéristiques et performances comparables.
- [ ] Scénarios d’accuracy issus de l’historique et confiance explicite.
- [ ] Gain pondéré de PP : classement connu, remplacement du score pertinent, distinction entre PP bruts et gain de total.
- [ ] Historique des recommandations, feedback, exclusions, favoris et file à jouer.
- [ ] Training et Similar à partir des patterns, avec heuristiques documentées.
- [ ] Pré-calcul progressif des caractéristiques ; calcul avec mods des candidats retenus.
- [ ] Acquisition ciblée des fichiers d’analyse non installés quand leur accès est disponible, sans installation implicite.
- [ ] Découverte sur deux pages maximum par travail, progression et annulation.
- [ ] Import streamé de datasets officiels fournis par l’utilisateur.

## Plays et replays

- [x] Corriger la détection partie/replay (statut tosu dédié), finaliser les résultats et exposer un diagnostic de capture avec journal local.
- [x] En direct : fond local, compteurs compacts, PP observés/FC et scénarios transmis par tosu.

- [ ] Flux tosu précis, erreurs de timing et touches ; normalisation par version/capacités.
- [ ] Séries de vie, UR et timing compressées ; pauses et trous de connexion explicites.
- [ ] Import/indexation `.osr` et association au checksum exact.
- [ ] Extension lazer des replays : statistiques, mods avec paramètres, pauses et IDs de scores.
- [ ] Lecteur Canvas avec cursor/keys, audio, navigation, vitesse et boucle.
- [ ] Reconstruction osu!standard prenant en compte stacking, sliders, fenêtres et règles historiques.
- [ ] Comparaison des jugements reconstruits aux statistiques du replay ; sinon analyse partielle.
- [ ] Chronologie strain/accuracy/combo/PP/timing alignée à la map, avec axes tenant compte de la vitesse.
- [ ] Analyse taiko/mania/catch suivant leurs règles propres et capacités validées.
- [ ] Comparaison des tentatives compatibles et heatmaps d’erreurs fiables.
- [ ] Téléchargement de replay via API lorsqu’il est disponible, cache et gestion des refus.
- [ ] Statistiques de session, biais early/late, régularité et sections problématiques.

## Bibliothèque enrichie

- [ ] Collections de l’application et collections intelligentes.
- [ ] Export de collections vers un nouveau fichier, sans écraser la base du jeu.
- [ ] Tags, notes, sauvegarde et restauration, exports CSV/JSON.
- [ ] Parseur commun de recherche vers SQL et API : AST, unités, dates et aliases documentés.
- [ ] Filtres PP, accuracy, misses, sliderbreaks, replay et caractéristiques.
- [x] Chargement au scroll par lots de 20 sets complets, avec filtres et tri locaux.
- [ ] Virtualisation pour les listes importantes.
- [ ] Provenance/fraîcheur des champs et résolution explicite des conflits local/API.
- [ ] Lecture des durées/BPM variables et fins de sliders via le moteur de map.
- [ ] Détection de doublons et comparaison des révisions.

## Lazer et exploitation

- [x] Deux profils stable/lazer, lazer par défaut pour les nouvelles configurations, migration des anciens réglages.
- [x] Simulations stable/lazer et séparation des caches par client.
- [x] Prototype Realm sur copie en lecture seule, validation des champs du schéma, maps, médias et collections.
- [x] Valider le module natif Realm et des indexations successives d’une base synthétique dans le cloud, sans modification de la source.
- [ ] Valider la lecture sur une bibliothèque réelle lazer Windows, plusieurs versions, fichiers manquants et sets supprimés.
- [x] Lancement npm documenté et commande de vérification des dépendances natives.
- [ ] Import d’exports `.osz`, `.osr`, `collection.db` en solution de repli.
- [ ] Adaptateurs d’ouverture stable/lazer/replay, capacités du gestionnaire de protocole explicites.
- [ ] Commande de recommandation dans la CLI.
- [ ] Tableau de diagnostic des capacités, quotas, appels API, cache et fraîcheur.
- [ ] Reprise des travaux, migrations et limites de caches reproductibles.
- [x] Configuration Tauri 2, runtime Node compagnon et ressources natives préparés pour l’OS de build.
- [x] Workflow GitHub Actions Windows/macOS/Linux, artefacts manuels et release en brouillon sur tag.
- [ ] Compiler et essayer les installateurs sur les OS cibles ; versionner le premier Cargo.lock validé.
- [ ] Signature Windows, notarisation macOS et stratégie de mises à jour.

## Interface et distribution (0.2 en préparation)

- [x] Un seul accès principal aux Réglages, profil osu! en haut à droite.
- [x] Navigation compacte, focus visible, lien d’évitement, dialogs natifs et prise en compte du mouvement réduit.
- [x] Base de localisation i18next, français/anglais et choix de langue persistant.
- [x] CHANGELOG suivant Keep a Changelog, notes dans l’app et génération des notes de release.
- [ ] Audit visuel et clavier sur les WebViews réelles, contrastes et libellés longs.
- [ ] Traduction structurée des erreurs métier du backend et prise en charge RTL.
- [ ] Fusion bibliothèque/recommandations, filtres de mods et farm fondé sur les gains de PP.
- [ ] Widgets personnalisables pour En direct et regroupement des erreurs rapprochées dans les analyses.
- [ ] Éditeur de thème CSS dans les Réglages, aperçu et restauration du thème par défaut.

## Validation à réaliser quand demandée

Bases de plusieurs versions, bibliothèque partielle, maps non soumises, map modifiée, anciens replays, imports de collections absentes, mode hors ligne, API 429, requêtes simultanées, coupures de tosu, pause/retry/fail, exactitude PP/jugements et charge pendant le jeu.

Le build de production est une étape de livraison. Des tests ciblés couvrent désormais la migration des réglages, les profils, les chemins hashés, les frontières de fichiers et les caches de calcul. `npm run test:realm` couvre séparément une base Realm synthétique et nécessite le module natif. Les intégrations au jeu et à un compte osu! nécessitent encore des essais avec des données réelles.
