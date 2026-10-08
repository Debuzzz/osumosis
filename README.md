# osu!mosis

**Your next good play.** Un compagnon local osu!, avec une interface React et une intégration desktop Tauri 2 en préparation pour la version 0.2. Le nom mélange osu! et l’osmose : bibliothèque, jeu et analyses partagent le même catalogue.

## Application desktop (0.2 en préparation)

Tauri utilise la WebView du système et conserve React/CSS. Le backend Node et ses modules natifs sont embarqués dans les futurs installateurs ; Node n’aura pas à être installé chez l’utilisateur final.

Pour développer sous Windows, installer Node, Rust stable/Cargo, Visual Studio Build Tools avec les outils C++ et le SDK Windows, ainsi que WebView2. Fermer le serveur `npm start` avant de lancer :

```bat
npm ci
npm run desktop:info
npm run desktop:dev
```

`npm run desktop:build` prépare un installateur pour l’OS de la machine de build. Voir [docs/DESKTOP.md](docs/DESKTOP.md) pour les prérequis par OS, le stockage et la CI multi OS. La configuration est livrée ; la compilation Rust et les installateurs restent à valider sur des machines équipées. Aucune release exécutable n’est publiée par cette modification.

Le menu Réglages reste en bas à gauche. Le bouton en haut à droite donne accès au profil osu!. Français et anglais sont disponibles dans les Réglages ; les [instructions de localisation](docs/LOCALIZATION.md) expliquent comment ajouter une langue. La version en bas de la barre latérale ouvre les notes de version ; [CHANGELOG.md](CHANGELOG.md) est la source des futures notes GitHub Releases.

## Prérequis et démarrage sous Windows

- Node.js LTS **22.12 ou plus récent**, avec npm, installé normalement sur le PC (version x64 conseillée).
- Une bibliothèque osu!stable ou osu!lazer. Lazer est le profil sélectionné pour une nouvelle configuration.
- Accès à `registry.npmjs.org`, à GitHub pour les binaires SQLite et à `static.realm.io` pour le module natif Realm pendant l’installation. Aucun runtime .NET ni Docker n’est requis.
- tosu sur le même PC pour la télémétrie ; il n’est pas nécessaire pour parcourir une bibliothèque déjà indexée.

Toutes les commandes fonctionnent dans l’Invite de commandes Windows (`cmd.exe`), sans script PowerShell :

```bat
cd C:\chemin\vers\osumosis
npm ci
npm run check:runtime
npm run build
npm start
```

Ouvrir **http://127.0.0.1:3000**. Arrêter le service avec `Ctrl+C`, ou lancer `npm start -- stop` depuis un autre terminal.

`check:runtime` vérifie le chargement de SQLite, du moteur de calcul et de Realm. Certains installateurs de binaires natifs peuvent terminer sans avoir téléchargé leur module : une installation npm réussie seule ne suffit donc pas. Si Realm manque, vérifier l’accès HTTPS à `static.realm.io`, lancer `npm rebuild realm`, puis refaire cette vérification.

Le service tourne directement sur le PC afin d’accéder aux fichiers du jeu et à tosu sur localhost. Un conteneur Docker imposerait des montages de volumes et un réseau différent pour la télémétrie Windows ; le workflow local reste basé sur npm.

### Choisir stable ou lazer

1. Ouvrir **Réglages**, puis sélectionner **osu!lazer** ou **osu!stable**.
2. Renseigner les dossiers du profil choisi. Chaque profil conserve ses chemins lorsque l’on bascule vers l’autre.
3. Enregistrer, puis indexer le profil enregistré. Un changement de client ou de dossiers nécessite une nouvelle indexation : le cache est conservé, mais les anciennes maps ne sont plus considérées comme installées dans la bibliothèque sélectionnée.
4. Lancer le jeu et tosu pour activer la télémétrie et le journal des tentatives.

**Lazer** : choisir le dossier de **données**, généralement `%APPDATA%\osu` sous Windows, contenant `client.realm` (ou `client_<version>.realm`) et `files`. Utiliser le dossier effectivement choisi dans les réglages du jeu si le stockage a été déplacé. Fermer lazer avant chaque indexation, puis le relancer pour jouer. L’indexeur sélectionne la base client la plus récemment modifiée, en copie le contenu dans le stockage de l’application et ouvre uniquement cette copie en lecture seule. Il lit les maps, leurs médias et les collections via les références Realm ; les noms hashés seuls ne servent pas de preuve d’installation. Une évolution incompatible du schéma est signalée sans migration de la base du jeu. Les sets en attente de suppression sont exclus.

La lecture directe lazer reste **expérimentale** jusqu’à validation sur une bibliothèque réelle Windows. Elle n’importe pas encore les scores historiques ni les replays. L’indexation lazer est manuelle, pour éviter de recopier automatiquement une base pendant que le jeu tourne.

**Stable** : choisir le dossier contenant `osu!.db` et `collection.db`, et renseigner Songs seulement s’il se trouve ailleurs. La surveillance des fichiers stable reste disponible.

Les anciennes configurations sans sélecteur sont migrées vers le profil stable, avec leurs chemins et préférences conservés. Lazer est le défaut pour les nouvelles configurations. Le choix du profil détermine aussi les règles des simulations de PP ; leurs caches stable et lazer sont séparés.

L’adresse tosu initiale est `ws://127.0.0.1:24050/websocket/v2`. Les réglages tosu, OAuth et les préférences sont communs aux deux profils.

La découverte en ligne nécessite le Client ID et le secret d’une application OAuth osu!. Ces champs sont facultatifs pour la bibliothèque locale. Ils sont conservés dans `settings.json`, côté serveur ; le secret n’est pas renvoyé dans les réponses de réglages. Le fichier de configuration n’est pas chiffré : il utilise les permissions du compte Windows.

### Relier son compte osu!

1. Créer une application OAuth dans [les paramètres du compte osu!](https://osu.ppy.sh/home/account/edit#oauth).
2. Enregistrer l’adresse de retour affichée dans les Réglages : par défaut `http://127.0.0.1:3000/api/account/callback`.
3. Copier le Client ID et le secret dans osu!mosis, puis enregistrer.
4. Cliquer sur le profil en haut à droite, puis **Autoriser sur osu!**. Valider les droits `public identify` sur le site osu!, puis revenir dans l’application.

Le profil public est conservé en cache. La liaison utilisateur et la recherche de maps par client credentials sont deux flux distincts : la connexion au compte ne lance pas de découverte. L’import des tops et le farm personnalisé restent à développer. Voir [docs/OAUTH.md](docs/OAUTH.md) pour le stockage des tokens et la future distribution publique.

## Capture des plays et diagnostic tosu

**Tes plays** regroupe le direct et l’historique. Le mode **Automatique** montre la partie, la pause ou le replay courant et reste sur le résultat jusqu’au retour au menu, puis retrouve l’historique et sélectionne la nouvelle tentative sauvegardée. Ce suivi agit dans cette vue : il ne change pas de page pendant que l’on consulte la bibliothèque ou les Réglages. **Historique** et **En direct** permettent de choisir manuellement l’affichage, même pendant une partie.

Une tentative sélectionnée reprend les mêmes widgets de score que le direct. La chronologie (accuracy ou PP) et les erreurs sont côte à côte sur une grande fenêtre ; la map et le score se trouvent dessous. Les erreurs d’une même seconde sont regroupées, avec une seule ligne et un seul repère, en conservant le nombre de misses et de sliderbreaks. Sur une petite fenêtre, les panneaux se replacent en une colonne.

Les nouvelles captures conservent les compteurs, le rang, le score total, les statistiques de map et les scénarios PP disponibles auprès de tosu. Les anciennes restent lisibles, sans reconstruire les champs qui n’avaient pas été enregistrés : ils affichent `—`. Il s’agit de télémétrie sauvegardée ; le lecteur de frames `.osr` reste à réaliser. Les replays reconnus restent visibles en direct sans créer de tentative ; leurs événements d’erreur ne sont pas encore capturés par ce flux.

Les parties observées sont sauvegardées à leur fin (résultat, fail, retry, abandon ou interruption). Le service attend au moins 350 ms et des valeurs cohérentes au départ, car tosu peut encore publier le temps de prévisualisation et les compteurs de la partie précédente après être passé en état play. Un retour du temps sans activité de jeu observée ne crée pas de retry. Le service attend ensuite brièvement les dernières valeurs de l’écran de résultat. Une capture commencée au milieu de la map est marquée partielle ; les premières misses déjà présentes ne sont pas inventées comme nouveaux événements.

`settings.replayUIVisible` est une préférence d’interface, pas un indicateur de lecture replay. osu!mosis ouvre en plus le flux `/tokens` de la même instance tosu pour lire son statut StreamCompanion : `2` = partie, `8` = lecture replay. Si ce flux manque, l’interface et les captures portent la mention « mode non confirmé ». Les replays reconnus restent visibles dans En direct, y compris les valeurs de leur écran de résultat, et ne créent pas de tentative jouée. L’import de scores historiques/replays reste une fonctionnalité distincte à réaliser.

Le panneau **Diagnostic de capture tosu**, présent dans Tes plays et Réglages, affiche les messages reçus, les sauvegardes, les transitions et les erreurs. Les événements sont également écrits dans le terminal et dans `.data/tosu.log`, avec rotation vers `.data/tosu.log.1` à 512 Kio. Le journal ne contient pas les payloads complets ni les réglages OAuth. Le nombre de sauvegardes dans le diagnostic couvre le démarrage actuel ; le total historique est celui de Tes plays.

Pour fournir un instantané de télémétrie, ouvrir `http://127.0.0.1:24050/json/v2` dans un navigateur, puis actualiser pendant une partie et sur le résultat. Retirer les noms et chemins personnels avant de partager le JSON. Le journal peut aussi se lire dans l’Invite de commandes :

```bat
type .data\tosu.log
```

Le fond de map est lu en priorité dans l’index local ; en cas d’absence, osu!mosis tente le fond courant servi par tosu. Aucun téléchargement de couverture distante n’est déclenché par En direct.

## Commandes npm

```bat
npm ci
npm run check:runtime
npm run build
npm run dev
npm start
npm start -- stop
npm run index -- --client lazer "C:\Users\ton_compte\AppData\Roaming\osu"
npm run index -- --client stable "D:\Games\osu!"
npm test
npm run test:realm
```

Sans `--client` ni chemin, la CLI utilise le profil enregistré. Les arguments ponctuels d’indexation ne modifient pas les réglages sauvegardés.

`OSUMOSIS_PORT` permet de choisir un autre port ; le proxy Vite de développement utilise le port 3000 par défaut. `OSUMOSIS_DATA` permet de déplacer le stockage de l’application.

## Ce qui est implémenté dans la version 0.1

- React, TypeScript, Vite, Fastify et serveur limité à `127.0.0.1`.
- SQLite dans un worker dédié : index, recherche FTS5, collections, tentatives, calculs et découverte.
- Profils stable/lazer, chemins indépendants et migration des anciens réglages.
- Parsing `.osu`, lecture versionnée de `osu!.db`, import de `collection.db`.
- Adaptateur lazer Realm en lecture seule sur copie, maps et médias hashés, collections ; validation Windows réelle à réaliser.
- Indexation incrémentale par taille et date, surveillance des maps et bases locales.
- Identité des difficultés par checksum ; conservation des versions et références de collections absentes.
- Recherche, grille/listes, filtres et tri ; chargement au scroll par lots de 20 sets, avec toutes leurs difficultés correspondant aux filtres.
- Backgrounds et audio locaux, accès borné au dossier de la map, support des plages HTTP pour l’audio.
- Fiche détaillée, liens vers osu!, autres difficultés, collections et tentatives.
- Calculs rosu-pp-js dans des workers : étoiles avec mods, composantes de strain disponibles, scénarios à 95/97/98/99/100 %.
- Cache des calculs par checksum, mods, client stable/lazer et version du moteur.
- Connexion tosu v2 avec statut partie/replay via `/tokens`, reconnexion et dashboard live : fond local, compteurs compacts, graphe des PP et scénarios transmis par tosu.
- Journal des tentatives observées : résultats, fails, retries, abandons, interruptions et intervalles de misses/sliderbreaks.
- Recherche officielle via OAuth client credentials, cinq requêtes maximum par minute, espacement de 12 secondes, curseurs et réutilisation du cache.
- Conservation des métadonnées des découvertes sans installation dans le jeu.
- Miniatures officielles en cache disque, téléchargées en découverte ou lors de l’ouverture d’une fiche, file plafonnée et cache de 256 Mio.
- Recommandation initiale de cinq sets distincts, fondée sur les étoiles NM, la durée, l’historique connu et la diversité.

## Recherche

```text
stars>=5 stars<6.5 bpm>180 length<180
creator="Sotarks" status=r,l
collection:"DT farm" played=false
artist="Camellia" local=true
tags="stream" source="Touhou" creator="Sotarks"
```

Les mots libres utilisent l’index plein texte. Les mots successifs et contraintes sont combinés avec AND. Les champs texte sont insensibles à la casse ASCII ; la recherche libre retire aussi les accents.

Champs numériques : `stars`, `difficulty`, `bpm`, `length` (secondes), `ar`, `od`, `cs`, `hp`, `objects`, `plays`, `mode`, `id`.

Champs texte : `artist`, `title`, `creator`, `mapper`, `version`, `tag`, `tags`, `source`.

Les filtres avancés exposent les tags, la source du morceau, le mapper et le nom de difficulté. Leurs valeurs sont ajoutées à la barre de recherche ; elles sont aussi disponibles dans les recommandations. Tags et source sont affichés dans la fiche de map. Ils viennent du fichier `.osu` ou du cache des découvertes, sans nouvel appel pour filtrer. `tags="stream jump"` cherche cette phrase ; utiliser `tag=stream tag=jump` pour exiger les deux termes séparément. Ces métadonnées ne garantissent pas les patterns réels ni un potentiel de farm.

Autres : `status`, `collection`, `local`, `played`. Les valeurs inconnues de difficulté ne sont pas assimilées à zéro. Les filtres de PP, UR et replays ne sont pas encore disponibles ; ils produisent une erreur explicite plutôt qu’un résultat incorrect.

La bibliothèque affiche 20 cartes de sets au départ, puis en ajoute 20 à l’approche du bas de la liste. Les résultats déjà affichés restent disponibles ; un bouton permet aussi de charger la suite ou de réessayer. Les changements de recherche, filtres, collection ou tri sélectionnent une nouvelle liste. Le scroll consulte uniquement SQLite, y compris dans Découvrir : les appels osu! restent déclenchés par les boutons explicites.

### Sources

- **Installées** : fichiers observés lors de l’indexation de la bibliothèque sélectionnée.
- **Catalogue** : toutes les métadonnées déjà enregistrées ; aucun nouvel appel API.
- **Découvrir** : maps non installées. Le bouton de recherche déclenche explicitement un appel osu!, puis le catalogue applique les filtres locaux.

Les prédicats locaux sont retirés de la requête distante. Les résultats reçus restent en base ; le moteur ne prétend pas avoir filtré tout le catalogue en ligne avec une contrainte locale. « Découvrir davantage » poursuit le curseur officiel. Les recherches initiales identiques sont réutilisées pendant 15 minutes.

## Limites actuelles

- La recommandation ne modélise pas encore le profil personnel, les probabilités de réussite ou le gain pondéré de PP. Les objectifs utilisent des heuristiques de départ, pas une reproduction exacte de Gurabot.
- Le lecteur de replays, l’import `scores.db` et la reconstruction des jugements par objet restent à réaliser.
- Le journal commence quand le service reçoit la télémétrie. Il ne reconstruit pas les plays historiques et une tentative prise en cours peut être partielle.
- Les misses et sliderbreaks sont des différences de compteurs sur un intervalle ; ce ne sont pas des coordonnées ou des IDs d’objets certains.
- Le dashboard consomme le flux v2 normal. Le flux précis de touches/erreurs de timing reste une extension prévue.
- Les calculs locaux utilisent les règles du **profil sélectionné** (stable ou lazer). Ils restent distincts des PP observés via tosu. Les mods lazer avec des paramètres personnalisés ne sont pas encore pris en charge.
- Le graphe de strain affiche des sections du calculateur ; l’alignement précis au replay et au premier objet reste à compléter.
- La durée et le BPM parsés depuis `.osu` sont indicatifs, particulièrement avec des sliders longs ou plusieurs changements de tempo.
- La lecture Realm/lazer est implémentée mais reste à valider sur une bibliothèque réelle et ses versions de schéma. Les exports ne sont pas encore implémentés.
- Les boutons `osu://` utilisent le gestionnaire de protocole du PC. La sélection exacte d’une difficulté dépend du client.
- Les images locales peuvent être absentes ; la carte conserve un fond de remplacement. Une miniature absente en mode catalogue ne déclenche pas de téléchargement.

## Stockage

En mode navigateur/npm, les fichiers sont dans `.data` (ou `OSUMOSIS_DATA`). Tauri utilise son répertoire d’application, distinct du dépôt : voir [docs/DESKTOP.md](docs/DESKTOP.md).

```text
.data/
  settings.json        # configuration locale, secret OAuth exclu de Git
  account.json         # tokens OAuth utilisateur et profil en cache, hors Git
  catalog.sqlite       # catalogue et analyses
  catalog.sqlite-wal   # journal SQLite
  covers/              # médias reproductibles, éviction à 256 Mio
  snapshots/           # copies Realm temporaires, nettoyées après lecture
  tosu.log             # événements de capture (rotation à 512 Kio)
  tosu.log.1           # journal précédent
  desktop-backend.log  # sortie du processus compagnon en mode Tauri
```

Les métadonnées et tentatives ne sont pas effacées automatiquement. Les fichiers de jeu ne sont pas modifiés. Pour sauvegarder la base, arrêter d’abord le service puis copier `.data`.

## Sources et suite

- [tosu](https://github.com/tosuapp/tosu) et ses [types v2](https://github.com/tosuapp/tosu/blob/master/packages/tosu/src/api/types/v2.ts)
- [osu! API](https://osu.ppy.sh/docs/)
- [Bases osu!stable](https://github.com/ppy/osu/wiki/Legacy-database-file-structure)
- [rosu-pp-js](https://github.com/MaxOhn/rosu-pp-js)

Voir [ROADMAP.md](ROADMAP.md) et [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour poursuivre le plan complet.
